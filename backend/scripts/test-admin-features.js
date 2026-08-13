const app = require("../server");
const pool = require("../src/config/db");
const http = require("http");
const axios = require("axios");

async function run() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`[TEST] Test server listening on ${baseUrl}`);

  try {
    // 1. Log in as admin
    console.log("\n=== 1. Login as Admin ===");
    const adminLogin = await axios.post(`${baseUrl}/auth/login`, {
      email: "admin@inzira.rw",
      password: "inzira2024",
    });
    const adminToken = adminLogin.data.accessToken;
    console.log("✓ Admin logged in:", adminLogin.data.user.email, "Role:", adminLogin.data.user.role);
    const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. Non-admin blocked from admin endpoints
    console.log("\n=== 2. Non-Admin Security Barrier Check ===");
    const smeLogin = await axios.post(`${baseUrl}/auth/login`, {
      email: "demo@inzira.rw",
      password: "inzira2024",
    });
    const smeToken = smeLogin.data.accessToken;
    const smeAuth = { headers: { Authorization: `Bearer ${smeToken}` } };

    try {
      await axios.get(`${baseUrl}/admin/overview`, smeAuth);
      throw new Error("FAIL: Non-admin was allowed into /admin/overview!");
    } catch (err) {
      if (err.response?.status === 403) {
        console.log("✓ Non-admin correctly rejected with 403 Forbidden");
      } else {
        throw err;
      }
    }

    // 3. Platform Overview
    console.log("\n=== 3. Platform Overview KPIs ===");
    const overviewRes = await axios.get(`${baseUrl}/admin/overview`, adminAuth);
    console.log("✓ Overview Stats:", {
      totalSMEs: overviewRes.data.smes.total,
      active30d: overviewRes.data.smes.active_30d,
      allTimeVolume: overviewRes.data.sales.all_time_volume,
      estimatedTotalRevenue: overviewRes.data.estimatedRevenue.totalMonthly,
      greenScored: overviewRes.data.scores.green,
    });

    // 4. SME Directory
    console.log("\n=== 4. SME Directory ===");
    const smesRes = await axios.get(`${baseUrl}/admin/smes`, adminAuth);
    console.log(`✓ Retrieved ${smesRes.data.smes.length} SMEs (total: ${smesRes.data.total})`);
    const targetSme = smesRes.data.smes[0];
    console.log("Target SME for testing:", { id: targetSme.id, name: targetSme.name, shop: targetSme.shop_name });

    // 5. Visit Shop (Read-Only) & Traceable Audit Log
    console.log("\n=== 5. Visit Shop (Read-Only + Audit Trail) ===");
    const shopViewRes = await axios.get(`${baseUrl}/admin/smes/${targetSme.id}/shop-view`, adminAuth);
    console.log("✓ Shop View Retrieved:", {
      readOnly: shopViewRes.data.readOnly,
      shopName: shopViewRes.data.settings.shop_name,
      stockCount: shopViewRes.data.stock.length,
      salesCount: shopViewRes.data.sales.length,
      financials: shopViewRes.data.financialSummary,
    });

    // Verify Audit Log entry created for ADMIN_VIEWED_SME_DATA
    const { rows: auditEntries } = await pool.query(
      `SELECT * FROM audit_log WHERE action = 'ADMIN_VIEWED_SME_DATA' AND target_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [targetSme.id]
    );
    if (!auditEntries.length) {
      throw new Error("FAIL: ADMIN_VIEWED_SME_DATA was NOT logged to audit_log table!");
    }
    console.log("✓ Verified Audit Log Record:", {
      id: auditEntries[0].id,
      action: auditEntries[0].action,
      admin_id: auditEntries[0].user_id,
      target_id: auditEntries[0].target_id,
      metadata: auditEntries[0].new_values,
    });

    // 6. Moderation: Status Toggle
    console.log("\n=== 6. Moderation: Deactivate & Reactivate Account ===");
    await axios.put(`${baseUrl}/admin/smes/${targetSme.id}/status`, { is_active: false }, adminAuth);
    const { rows: [deact] } = await pool.query("SELECT is_active FROM users WHERE id=$1", [targetSme.id]);
    console.log("✓ Successfully deactivated user. is_active in DB:", deact.is_active);

    await axios.put(`${baseUrl}/admin/smes/${targetSme.id}/status`, { is_active: true }, adminAuth);
    const { rows: [react] } = await pool.query("SELECT is_active FROM users WHERE id=$1", [targetSme.id]);
    console.log("✓ Successfully reactivated user. is_active in DB:", react.is_active);

    // 7. Password Reset
    console.log("\n=== 7. Admin Support: Password Reset ===");
    const resetRes = await axios.post(`${baseUrl}/admin/smes/${targetSme.id}/reset-password`, { new_password: "NewPassword123!" }, adminAuth);
    console.log("✓ Password reset output:", resetRes.data.message);

    // 8. Platform-Wide Analytics
    console.log("\n=== 8. Platform Analytics ===");
    const analyticsRes = await axios.get(`${baseUrl}/admin/analytics`, adminAuth);
    console.log("✓ Analytics output:", {
      dailyDays: analyticsRes.data.dailyTrends.length,
      topSmesCount: analyticsRes.data.topSmes.length,
      sectorCount: analyticsRes.data.sectorShares.length,
    });

    // 9. Master Audit Search
    console.log("\n=== 9. Master Audit Search ===");
    const auditRes = await axios.get(`${baseUrl}/admin/audit`, adminAuth);
    console.log(`✓ Retrieved ${auditRes.data.audit.length} audit records (total: ${auditRes.data.total})`);

    console.log("\n==========================================");
    console.log("🎉 ALL ADMIN BACKEND VERIFICATIONS PASSED 100%!");
    console.log("==========================================");
  } finally {
    server.close();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Test failed:", err.response?.data || err.message);
  process.exit(1);
});
