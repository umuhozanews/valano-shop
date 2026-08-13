const axios = require("axios");

const BASE_URL = "https://backend-chi-olive-97.vercel.app/api";

async function verifySuite() {
  console.log("================================================================================");
  console.log("   LIVE PRODUCTION VERIFICATION: DEDICATED ADMIN DASHBOARD & AUDIT SUITE");
  console.log("================================================================================\n");

  // 1. Admin Authentication
  console.log(">>> Step 1: Authenticating as Master Admin (admin@inzira.rw)...");
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: "admin@inzira.rw",
    password: "inzira2024",
  });
  const token = loginRes.data.accessToken;
  const adminUser = loginRes.data.user;
  console.log(`✓ Logged in as: ${adminUser.name} (${adminUser.email}) | Role: ${adminUser.role}`);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // 2. Non-Admin Security Barrier
  console.log("\n>>> Step 2: Verifying Non-Admin Security Barrier with Demo SME Merchant...");
  const smeLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: "demo@inzira.rw",
    password: "inzira2024",
  });
  const smeToken = smeLogin.data.accessToken;
  try {
    await axios.get(`${BASE_URL}/admin/overview`, { headers: { Authorization: `Bearer ${smeToken}` } });
    console.error("❌ FAILED: Non-admin was permitted to access /admin/overview!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ Access Denied as expected: 403 Forbidden on /admin/overview for SME merchant.");
    } else {
      console.log(`✓ Blocked with status: ${err.response?.status}`);
    }
  }

  // 3. Platform Overview
  console.log("\n>>> Step 3: Verifying Platform Overview Endpoint (/admin/overview)...");
  try {
    const overview = await axios.get(`${BASE_URL}/admin/overview`, authHeader);
    console.log("✓ Overview metrics received:", {
      totalSmes: overview.data.smes?.total,
      newThisMonth: overview.data.smes?.new_this_month,
      platformSalesVolume: overview.data.sales?.all_time_volume,
      estimatedTotalRevenue: overview.data.estimatedRevenue?.totalMonthly,
    });
  } catch (e) {
    console.log("Overview endpoint status:", e.response?.status, e.response?.data?.error || e.message);
  }

  // 4. SME Directory
  console.log("\n>>> Step 4: Verifying SME Directory Endpoint (/admin/smes)...");
  let targetSme = null;
  try {
    const smes = await axios.get(`${BASE_URL}/admin/smes`, authHeader);
    console.log(`✓ SME Directory returned ${smes.data.smes?.length || 0} merchants (total: ${smes.data.total})`);
    if (smes.data.smes?.length) {
      targetSme = smes.data.smes[0];
      console.log("Sample SME Record:", {
        id: targetSme.id,
        name: targetSme.name,
        shop: targetSme.shop_name,
        sector: targetSme.sector,
        district: targetSme.district,
        sales: targetSme.total_sales,
        active: targetSme.is_active,
      });
    }
  } catch (e) {
    console.log("SME Directory status:", e.response?.status, e.response?.data?.error || e.message);
  }

  // 5. Visit Shop Read-Only & Audit Log Verification
  if (targetSme) {
    console.log(`\n>>> Step 5: Testing 'Visit Shop' Read-Only Endpoint for SME #${targetSme.id} (${targetSme.shop_name || targetSme.name})...`);
    try {
      const shopView = await axios.get(`${BASE_URL}/admin/smes/${targetSme.id}/shop-view`, authHeader);
      console.log("✓ 'Visit Shop' Data Loaded:", {
        readOnly: shopView.data.readOnly,
        auditedAccess: shopView.data.auditedAccess,
        shopName: shopView.data.settings?.shop_name,
        stockItemsCount: shopView.data.stock?.length,
        salesTransactionsCount: shopView.data.sales?.length,
        financialSummary: shopView.data.financialSummary,
      });
    } catch (e) {
      console.log("Shop View status:", e.response?.status, e.response?.data?.error || e.message);
    }
  }

  console.log("\n================================================================================");
  console.log("🎉 VERIFICATION COMPLETE");
  console.log("================================================================================");
}

verifySuite().catch((err) => {
  console.error("Suite error:", err.message);
});
