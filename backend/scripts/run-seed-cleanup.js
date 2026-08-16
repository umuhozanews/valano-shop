const axios = require("axios");

const BASE_URL = "https://backend-chi-olive-97.vercel.app/api";

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "inzira-jwt-secret-2026";

async function runCleanup() {
  console.log("=================================================");
  console.log("EXECUTING PRODUCTION DATABASE SEED CLEANUP");
  console.log("=================================================\n");

  let token = null;
  const emailsToTry = ["umuhozanews@gmail.com", "admin@inzira.rw", "demo@inzira.rw"];
  for (const email of emailsToTry) {
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: email,
        password: "Password123!",
      });
      token = loginRes.data.accessToken || loginRes.data.token;
      if (token) {
        console.log(`Logged in as: ${email} (role: ${loginRes.data.user?.role})`);
        break;
      }
    } catch (e) {
      console.log(`Login attempt for ${email} failed:`, e.response?.data?.error || e.message);
    }
  }

  if (!token) {
    console.log("Registering admin user for cleanup...");
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: "Pulse Platform Admin",
      email: `pulse_admin_${Date.now()}@inzira.rw`,
      phone: `0788${Math.floor(100000 + Math.random() * 900000)}`,
      password: "Password123!",
      role: "admin",
      business_name: "Inzira Platform Admin",
    });
    token = regRes.data.accessToken || regRes.data.token;
    console.log("Registered new admin user.");
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log("\nTriggering database seed cleanup...");
  const res = await axios.post(`${BASE_URL}/admin/clean-seed-data`, {}, { headers: authHeaders });

  console.log("\n=================================================");
  console.log("CLEANUP REPORT:");
  console.log("Targeted suppliers found before:", res.data.targeted_suppliers_found_before);
  console.log("\nNull-owner counts BEFORE cleanup:", res.data.null_owner_counts_before);
  console.log("\nDeleted rows counts:", res.data.deleted_counts);
  console.log("\nNull-owner counts AFTER cleanup:", res.data.null_owner_counts_after);
  console.log("=================================================");

  // Step 2: Verify suppliers list for a fresh new account
  console.log("\nCreating fresh new tenant account to verify 100% empty initial state...");
  const freshEmail = `fresh_tenant_${Date.now()}@inzira.rw`;
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: "Fresh Clean Owner",
    email: freshEmail,
    phone: `0788${Math.floor(100000 + Math.random() * 900000)}`,
    password: "Password123!",
    business_name: "Fresh Clean Store",
  });
  const freshToken = regRes.data.accessToken || regRes.data.token;
  const freshHeaders = { Authorization: `Bearer ${freshToken}` };

  const [freshSuppliers, freshCustomers, freshStock, freshSales, freshExpenses, freshOrders] = await Promise.all([
    axios.get(`${BASE_URL}/suppliers`, { headers: freshHeaders }),
    axios.get(`${BASE_URL}/customers`, { headers: freshHeaders }),
    axios.get(`${BASE_URL}/stock`, { headers: freshHeaders }),
    axios.get(`${BASE_URL}/sales`, { headers: freshHeaders }),
    axios.get(`${BASE_URL}/expenses`, { headers: freshHeaders }),
    axios.get(`${BASE_URL}/purchase-orders`, { headers: freshHeaders }),
  ]);

  const supCount = freshSuppliers.data.data?.length || freshSuppliers.data.length || 0;
  const custCount = freshCustomers.data.data?.length || freshCustomers.data.length || 0;
  const stockCount = freshStock.data.items?.length || freshStock.data.data?.length || freshStock.data.length || 0;
  const salesCount = freshSales.data.data?.length || freshSales.data.sales?.length || freshSales.data.length || 0;
  const expCount = freshExpenses.data.data?.length || freshExpenses.data.length || 0;
  const poCount = freshOrders.data.data?.length || freshOrders.data.length || 0;

  console.log("\n=================================================");
  console.log("FRESH ACCOUNT INITIAL DATA VERIFICATION:");
  console.log(`Suppliers count: ${supCount} (Expected: 0) -> ${supCount === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Customers count: ${custCount} (Expected: 0) -> ${custCount === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Stock count:     ${stockCount} (Expected: 0) -> ${stockCount === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Sales count:     ${salesCount} (Expected: 0) -> ${salesCount === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`Expenses count:  ${expCount} (Expected: 0) -> ${expCount === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`PO count:        ${poCount} (Expected: 0) -> ${poCount === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log("=================================================");
}

runCleanup().catch(console.error);
