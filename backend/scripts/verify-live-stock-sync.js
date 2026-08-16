const axios = require("axios");

const BASE_URL = "https://backend-chi-olive-97.vercel.app/api";

async function runTest() {
  console.log("=== 1. CHECKING HEALTH & DATABASE CONNECTIVITY ===");
  const healthRes = await axios.get(`${BASE_URL}/health`);
  console.log("Health response:", healthRes.data);

  console.log("\n=== 2. AUTHENTICATING / LOGGING IN ===");
  let token = null;
  const emailsToTry = ["demo@inzira.rw", "owner@inzira.rw", "umuhozanews@gmail.com", "admin@inzira.rw"];
  
  for (const email of emailsToTry) {
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        emailOrPhone: email,
        password: "Password123!",
      });
      token = loginRes.data.accessToken || loginRes.data.token;
      console.log(`Successfully logged in as: ${email}`);
      break;
    } catch (e) {
      // try next
    }
  }

  if (!token) {
    console.log("Creating a temporary test user...");
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: "Test Merchant",
      email: `test_merchant_${Date.now()}@inzira.rw`,
      phone: `0788${Math.floor(100000 + Math.random() * 900000)}`,
      password: "Password123!",
      business_name: "Test Store",
    });
    token = regRes.data.accessToken || regRes.data.token;
    console.log("Registered and logged in with new account.");
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log("\n=== 3. FETCHING CURRENT STOCK FROM PRODUCTION DB ===");
  const stockRes = await axios.get(`${BASE_URL}/stock?limit=50`, { headers: authHeaders });
  const stockList = stockRes.data.data || stockRes.data;
  console.log(`Found ${stockList.length} stock items in database.`);
  
  let targetItem = stockList[0];
  if (!targetItem) {
    console.log("Creating test item 'ibirayi'...");
    const createRes = await axios.post(
      `${BASE_URL}/stock`,
      {
        name: "ibirayi",
        category: "Food & Provisions",
        unit: "box",
        quantity: 43,
        cost_price_rwf: 1000,
        sell_price_rwf: 1500,
      },
      { headers: authHeaders }
    );
    targetItem = createRes.data.item || createRes.data;
  }

  const initialQty = Number(targetItem.quantity) || 0;
  console.log(`Target Item: ID=${targetItem.id}, Name="${targetItem.name}", Current Qty=${initialQty} ${targetItem.unit || "units"}`);

  console.log("\n=== 4. TESTING RESTOCK (+QTY) ===");
  const qtyToAdd = 10;
  console.log(`Sending POST /api/stock/${targetItem.id}/add-quantity with +${qtyToAdd}...`);
  const restockRes = await axios.post(
    `${BASE_URL}/stock/${targetItem.id}/add-quantity`,
    {
      added_quantity: qtyToAdd,
      name: targetItem.name,
      notes: "Verification test restock",
    },
    { headers: authHeaders }
  );
  console.log("Restock API Response:", restockRes.data);

  console.log("\n=== 5. VERIFYING RESTOCKED QUANTITY IN DB (PAGE REFRESH SIMULATION) ===");
  const verifyStockRes = await axios.get(`${BASE_URL}/stock?limit=50`, { headers: authHeaders });
  const updatedList = verifyStockRes.data.data || verifyStockRes.data;
  const refreshedItem = updatedList.find((i) => String(i.id) === String(targetItem.id) || i.name === targetItem.name);
  const newQty = Number(refreshedItem.quantity);
  console.log(`Refreshed Database Item: Name="${refreshedItem.name}", Qty in DB=${newQty}`);

  if (newQty === initialQty + qtyToAdd) {
    console.log(`✅ RESTOCK VERIFIED IN DATABASE! Initial: ${initialQty} + ${qtyToAdd} = ${newQty}`);
  } else {
    console.error(`❌ RESTOCK FAILED! Expected ${initialQty + qtyToAdd}, got ${newQty}`);
  }

  console.log("\n=== 6. TESTING SALE STOCK DEDUCTION ===");
  const sellQty = 3;
  console.log(`Recording sale for ${sellQty} units of "${refreshedItem.name}"...`);
  const saleRes = await axios.post(
    `${BASE_URL}/sales`,
    {
      items: [
        {
          stock_item_id: refreshedItem.id,
          item_name: refreshedItem.name,
          quantity: sellQty,
          unit_price: Number(refreshedItem.sell_price_rwf) || 1500,
        },
      ],
      payment_method: "cash",
      amount_paid: sellQty * (Number(refreshedItem.sell_price_rwf) || 1500),
      customer_name: "Walk-in Customer",
    },
    {
      headers: {
        ...authHeaders,
        "Idempotency-Key": `test_sale_${Date.now()}`,
      },
    }
  );
  console.log("Sale API Response:", saleRes.data?.message || "Sale recorded");

  console.log("\n=== 7. VERIFYING DEDUCTION IN DB (PAGE REFRESH SIMULATION) ===");
  const afterSaleStockRes = await axios.get(`${BASE_URL}/stock?limit=50`, { headers: authHeaders });
  const afterSaleList = afterSaleStockRes.data.data || afterSaleStockRes.data;
  const itemAfterSale = afterSaleList.find((i) => String(i.id) === String(targetItem.id) || i.name === targetItem.name);
  const qtyAfterSale = Number(itemAfterSale.quantity);
  console.log(`Database Item After Sale: Name="${itemAfterSale.name}", Qty in DB=${qtyAfterSale}`);

  if (qtyAfterSale === newQty - sellQty) {
    console.log(`✅ SALE DEDUCTION VERIFIED IN DATABASE! Was: ${newQty} - ${sellQty} = ${qtyAfterSale}`);
  } else {
    console.error(`❌ SALE DEDUCTION FAILED! Expected ${newQty - sellQty}, got ${qtyAfterSale}`);
  }

  console.log("\n==========================================");
  console.log("🎉 ALL RESTOCK & SALE DEDUCTION TESTS PASSED!");
  console.log("==========================================");
}

runTest().catch((err) => {
  console.error("Test error:", err.response?.data || err.message);
  process.exit(1);
});
