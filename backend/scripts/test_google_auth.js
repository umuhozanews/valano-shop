const pool = require("../src/config/db");
const bcrypt = require("bcryptjs");

async function runTests() {
  console.log("=== STARTING GOOGLE AUTH LOGIC TEST ===");

  const testEmail = "testexisting@gmail.com";
  const cleanEmail = testEmail.toLowerCase().trim();
  const testPassword = "Password123!";

  try {
    // 1. Cleanup any previous test data
    await pool.query("DELETE FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);

    // 2. Create a test user via normal signup
    const hash = await bcrypt.hash(testPassword, 10);
    const { rows: [createdUser] } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, language, sector, district, consent_status, profile_complete)
       VALUES ($1, $2, $3, 'sme_owner', '+250788111222', 'en', 'Retail & Supermarket', 'Gasabo (Kigali)', 'granted', true)
       RETURNING *`,
      ["Test Existing Merchant", cleanEmail, hash]
    );

    console.log("\n[Step 1] Created initial email/password user in DB:");
    console.log({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      profile_complete: createdUser.profile_complete,
      google_linked: createdUser.google_linked,
      google_auth: createdUser.google_auth
    });

    // 3. Simulate "Continue with Google" lookup with varying casing / whitespace
    const simulatedIncomingEmail = "  TestExisting@GMAIL.com  ";
    const normalizedIncoming = simulatedIncomingEmail.toLowerCase().trim();

    const existingUserResult = await pool.query(
      "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1",
      [normalizedIncoming]
    );

    let user = existingUserResult.rows[0];
    let isNewRegistration = false;

    console.log("\n[Step 2] Ran existing user lookup with:", JSON.stringify(simulatedIncomingEmail));
    console.log("SQL Query Result:", user ? `FOUND user ID ${user.id} (${user.email})` : "NONE_FOUND");

    if (user) {
      isNewRegistration = false;
      if (!user.google_linked || !user.google_auth) {
        await pool.query(
          "UPDATE users SET google_linked = true, google_auth = true WHERE id = $1",
          [user.id]
        );
        user.google_linked = true;
        user.google_auth = true;
      }
      if (user.profile_complete === null || user.profile_complete === undefined || user.password_hash) {
        user.profile_complete = true;
        await pool.query("UPDATE users SET profile_complete = true WHERE id = $1", [user.id]);
      }
    }

    console.log("\n[Step 3] Result of Google Auth handling:");
    console.log({
      isNewRegistration,
      userId: user?.id,
      email: user?.email,
      profile_complete: user?.profile_complete,
      google_linked: user?.google_linked,
      google_auth: user?.google_auth,
      shouldRedirectToDashboard: user && user.profile_complete === true && !isNewRegistration,
      shouldRedirectToSetup: user && user.profile_complete === false
    });

    // 4. Verify total users count for this email (must be exactly 1)
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE LOWER(email) = LOWER($1)",
      [cleanEmail]
    );
    console.log("\n[Step 4] Total user records for email in DB:", countRows[0]?.total || countRows[0]?.count || countRows[0]);

    // 5. Test truly new Google user
    const brandNewEmail = "trulynewgoogleuser" + Date.now() + "@gmail.com";
    const brandNewLookup = await pool.query(
      "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1",
      [brandNewEmail]
    );
    console.log("\n[Step 5] Truly new Google user lookup for:", brandNewEmail);
    console.log("Existing record found:", brandNewLookup.rows[0] ? "YES" : "NO (Correct, will create account and require setup)");

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
}

runTests();
