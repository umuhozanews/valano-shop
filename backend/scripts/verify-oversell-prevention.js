const axios = require("axios");

const BASE_URL = "https://backend-chi-olive-97.vercel.app/api";

async function runOversellTests() {
  console.log("=================================================");
  console.log("TESTING STRICT OVERSELL PREVENTION ON PRODUCTION");
  console.log("=================================================\n");

  // Step A: Authenticate
  let token = null;
  const emailsToTry = ["demo@inzira.rw", "owner@inzira.rw", "umuhozanews@gmail.com"];
  for (const email of emailsToTry) {
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        emailOrPhone: email,
        password: "Password123!",
      });
      token = loginRes.data.accessToken || loginRes.data.token;
      console.log(`Logged in as: ${email}`);
      break;
    } catch (e) {}
  }

  if (!token) {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: "Oversell Test Owner",
      email: `oversell_test_${Date.now()}@inzira.rw`,
      phone: `0788${Math.floor(100000 + Math.random() * 900000)}`,
      password: "Password123!",
      business_name: "Oversell Test Store",
    });
    token = regRes.data.accessToken || regRes.data.token;
    console.log("Created fresh test account.");
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Setup Test Product A
  const prodAName = `ItemA_${Date.now()}`;
  console.log(`\nCreating Test Item A: "${prodAName}" with initial quantity = 2...`);
  const createARes = await axios.post(
    `${BASE_URL}/stock`,
    {
      name: prodAName,
      category: "Test",
      unit: "pcs",
      quantity: 2,
      cost_price_rwf: 500,
      sell_price_rwf: 1000,
    },
    { headers: authHeaders }
  );
  const itemA = createARes.data.item || createARes.data;
  console.log(`Created Item A: ID=${itemA.id}, Name="${itemA.name}", Initial Quantity=${itemA.quantity}`);

  // Setup Test Product B
  const prodBName = `ItemB_${Date.now()}`;
  console.log(`Creating Test Item B: "${prodBName}" with initial quantity = 10...`);
  const createBRes = await axios.post(
    `${BASE_URL}/stock`,
    {
      name: prodBName,
      category: "Test",
      unit: "pcs",
      quantity: 10,
      cost_price_rwf: 500,
      sell_price_rwf: 1000,
    },
    { headers: authHeaders }
  );
  const itemB = createBRes.data.item || createBRes.data;
  console.log(`Created Item B: ID=${itemB.id}, Name="${itemB.name}", Initial Quantity=${itemB.quantity}`);

  // Helper to fetch live quantity from database
  async function getDbQuantity(id) {
    const res = await axios.get(`${BASE_URL}/stock?limit=100`, { headers: authHeaders });
    const items = res.data.data || res.data;
    const found = items.find((i) => i.id === id || String(i.id) === String(id));
    return found ? Number(found.quantity) : null;
  }

  console.log("\n-------------------------------------------------");
  console.log("TEST 1: Attempt to sell 5 units when only 2 exist (Must REJECT)");
  console.log("-------------------------------------------------");
  let test1Passed = false;
  try {
    await axios.post(
      `${BASE_URL}/sales`,
      {
        items: [{ stock_item_id: itemA.id, item_name: itemA.name, quantity: 5, unit_price: 1000 }],
        payment_method: "cash",
        amount_paid: 5000,
      },
      { headers: { ...authHeaders, "Idempotency-Key": `test1_${Date.now()}` } }
    );
    console.error("❌ TEST 1 FAILED: Sale of 5 units unexpectedly succeeded!");
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    console.log(`Caught Expected Error: "${errorMsg}"`);
    const currentQty = await getDbQuantity(itemA.id);
    console.log(`Stock in DB after failed sale: ${currentQty}`);
    if (currentQty === 2) {
      console.log("✅ TEST 1 PASSED: Oversell was rejected and stock remained at 2!");
      test1Passed = true;
    } else {
      console.error(`❌ TEST 1 FAILED: Stock changed to ${currentQty}`);
    }
  }

  console.log("\n-------------------------------------------------");
  console.log("TEST 2: Sell exactly 2 units (Must SUCCEED and drop stock to 0)");
  console.log("-------------------------------------------------");
  let test2Passed = false;
  try {
    const sale2Res = await axios.post(
      `${BASE_URL}/sales`,
      {
        items: [{ stock_item_id: itemA.id, item_name: itemA.name, quantity: 2, unit_price: 1000 }],
        payment_method: "cash",
        amount_paid: 2000,
      },
      { headers: { ...authHeaders, "Idempotency-Key": `test2_${Date.now()}` } }
    );
    console.log("Sale 2 Succeeded: Invoice #", sale2Res.data?.invoice_number || "OK");
    const currentQty = await getDbQuantity(itemA.id);
    console.log(`Stock in DB after selling 2 units: ${currentQty}`);
    if (currentQty === 0) {
      console.log("✅ TEST 2 PASSED: Stock dropped to exactly 0!");
      test2Passed = true;
    } else {
      console.error(`❌ TEST 2 FAILED: Expected 0, got ${currentQty}`);
    }
  } catch (err) {
    console.error("❌ TEST 2 FAILED:", err.response?.data || err.message);
  }

  console.log("\n-------------------------------------------------");
  console.log("TEST 3: Attempt to sell 1 more when stock is 0 (Must REJECT)");
  console.log("-------------------------------------------------");
  let test3Passed = false;
  try {
    await axios.post(
      `${BASE_URL}/sales`,
      {
        items: [{ stock_item_id: itemA.id, item_name: itemA.name, quantity: 1, unit_price: 1000 }],
        payment_method: "cash",
        amount_paid: 1000,
      },
      { headers: { ...authHeaders, "Idempotency-Key": `test3_${Date.now()}` } }
    );
    console.error("❌ TEST 3 FAILED: Sale succeeded when stock was 0!");
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    console.log(`Caught Expected Error: "${errorMsg}"`);
    const currentQty = await getDbQuantity(itemA.id);
    console.log(`Stock in DB after rejected sale: ${currentQty}`);
    if (currentQty === 0) {
      console.log("✅ TEST 3 PASSED: Selling at 0 stock was rejected!");
      test3Passed = true;
    }
  }

  console.log("\n-------------------------------------------------");
  console.log("TEST 4: Multi-item sale where Item B has 10 (valid) but Item A has 0 (invalid) - (Must REJECT ALL)");
  console.log("-------------------------------------------------");
  let test4Passed = false;
  try {
    await axios.post(
      `${BASE_URL}/sales`,
      {
        items: [
          { stock_item_id: itemB.id, item_name: itemB.name, quantity: 3, unit_price: 1000 },
          { stock_item_id: itemA.id, item_name: itemA.name, quantity: 1, unit_price: 1000 },
        ],
        payment_method: "cash",
        amount_paid: 4000,
      },
      { headers: { ...authHeaders, "Idempotency-Key": `test4_${Date.now()}` } }
    );
    console.error("❌ TEST 4 FAILED: Multi-item sale with insufficient stock unexpectedly succeeded!");
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    console.log(`Caught Expected Error: "${errorMsg}"`);
    const qtyA = await getDbQuantity(itemA.id);
    const qtyB = await getDbQuantity(itemB.id);
    console.log(`Stock in DB: Item A=${qtyA} (expected 0), Item B=${qtyB} (expected 10)`);
    if (qtyA === 0 && qtyB === 10) {
      console.log("✅ TEST 4 PASSED: Entire multi-item sale was atomically rolled back! Item B was NOT partially deducted.");
      test4Passed = true;
    } else {
      console.error(`❌ TEST 4 FAILED: Partial deduction occurred! Item B=${qtyB}`);
    }
  }

  console.log("\n=================================================");
  console.log("FINAL RESULTS SUMMARY:");
  console.log(`Test 1 (Sell 5 when 2 exist): ${test1Passed ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Test 2 (Sell 2 to drop to 0): ${test2Passed ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Test 3 (Sell 1 at 0 stock):  ${test3Passed ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Test 4 (Multi-item atomic):   ${test4Passed ? "PASSED ✅" : "FAILED ❌"}`);
  console.log("=================================================");
}

runOversellTests().catch(console.error);
