const axios = require("axios");

const BASE_URL = "https://backend-chi-olive-97.vercel.app/api";

async function testCustomerAndPurchaseOrder() {
  console.log("=================================================");
  console.log("VERIFYING CUSTOMER SAVE & PURCHASE ORDER CREATION");
  console.log("=================================================\n");

  // Step 1: Login / Register
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
      name: "Customer & PO Test Owner",
      email: `cust_po_test_${Date.now()}@inzira.rw`,
      phone: `0788${Math.floor(100000 + Math.random() * 900000)}`,
      password: "Password123!",
      business_name: "Customer & PO Test Store",
    });
    token = regRes.data.accessToken || regRes.data.token;
    console.log("Created fresh test account.");
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log("\n-------------------------------------------------");
  console.log("TEST 1: Customer Creation & Persistence");
  console.log("-------------------------------------------------");
  const testCustomerName = `Customer_${Date.now()}`;
  const testCustomerPhone = `0788${Math.floor(100000 + Math.random() * 900000)}`;

  console.log(`Creating customer "${testCustomerName}" (${testCustomerPhone})...`);
  const custRes = await axios.post(
    `${BASE_URL}/customers`,
    {
      name: testCustomerName,
      phone: testCustomerPhone,
      type: "retailer",
    },
    { headers: authHeaders }
  );

  console.log(`Created Customer: ID=${custRes.data.id}, Name="${custRes.data.name}"`);

  // Verify customer is in GET /customers list
  const listCustRes = await axios.get(`${BASE_URL}/customers?limit=100`, { headers: authHeaders });
  const allCusts = listCustRes.data.data || listCustRes.data;
  const foundCust = allCusts.find((c) => c.id === custRes.data.id || c.name === testCustomerName);

  let test1Passed = false;
  if (foundCust) {
    console.log(`✅ TEST 1 PASSED: Customer "${testCustomerName}" successfully saved and retrieved in Customers directory!`);
    test1Passed = true;
  } else {
    console.error("❌ TEST 1 FAILED: Customer not found in GET /customers");
  }

  console.log("\n-------------------------------------------------");
  console.log("TEST 2: Purchase Order Creation & Workflow");
  console.log("-------------------------------------------------");

  // First create a supplier
  const testSupplierName = `Supplier_${Date.now()}`;
  const supRes = await axios.post(
    `${BASE_URL}/suppliers`,
    {
      name: testSupplierName,
      phone: `0788${Math.floor(100000 + Math.random() * 900000)}`,
      category: "Wholesale",
    },
    { headers: authHeaders }
  );
  const supplier = supRes.data;
  console.log(`Created Supplier: ID=${supplier.id}, Name="${supplier.name}"`);

  // Create a purchase order
  const orderPayload = {
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    order_date: new Date().toISOString().split("T")[0],
    notes: "Automated verification PO test",
    status: "ordered",
    items: [
      {
        item_name: `PO_Item_${Date.now()}`,
        quantity: 20,
        unit_cost_rwf: 1500,
      },
    ],
  };

  console.log(`Creating Purchase Order for Supplier "${supplier.name}" with 20 units...`);
  const poRes = await axios.post(`${BASE_URL}/purchase-orders`, orderPayload, { headers: authHeaders });
  const createdPo = poRes.data;
  console.log(`Purchase Order Created: PO ID=${createdPo.id}, Status=${createdPo.status}, Items=${createdPo.items?.length}`);

  // Verify PO is listed in GET /purchase-orders
  const listPoRes = await axios.get(`${BASE_URL}/purchase-orders`, { headers: authHeaders });
  const allOrders = listPoRes.data.data || listPoRes.data;
  const foundPo = allOrders.find((o) => o.id === createdPo.id);

  let test2Passed = false;
  if (foundPo && foundPo.items_count > 0) {
    console.log(`✅ TEST 2 PASSED: Purchase Order PO-${createdPo.id} created, saved, and retrieved with full line items!`);
    test2Passed = true;
  } else {
    console.error("❌ TEST 2 FAILED: PO not found in GET /purchase-orders or items count is 0");
  }

  // Advance PO to 'received' and 'stocked'
  console.log(`Advancing PO-${createdPo.id} to "stocked"...`);
  const statusRes = await axios.put(
    `${BASE_URL}/purchase-orders/${createdPo.id}/status`,
    { status: "stocked" },
    { headers: authHeaders }
  );
  console.log(`PO Status updated: ${statusRes.data?.status || "stocked"}`);

  console.log("\n=================================================");
  console.log("FINAL TEST SUMMARY:");
  console.log(`1. Customer Save & Persistence: ${test1Passed ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`2. Purchase Order Creation & Save: ${test2Passed ? "PASSED ✅" : "FAILED ❌"}`);
  console.log("=================================================");
}

testCustomerAndPurchaseOrder().catch(console.error);
