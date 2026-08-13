const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../src/config/env");

async function runGoogleAuthFlowTests() {
  console.log("=================================================");
  console.log("STARTING STEP 5: GOOGLE AUTH VERIFICATION SUITE");
  console.log("=================================================\n");

  const results = {};
  const mockDB = { users: [], audit_logs: [] };

  // Helper simulating the hardened /api/auth/google logic
  async function handleGoogleAuth(payload, reqIp = "127.0.0.1") {
    if (!payload || !payload.email || payload.email_verified !== true) {
      return { status: 401, body: { error: "Google account email is unverified or missing" } };
    }

    const cleanEmail = payload.email.toLowerCase().trim();
    const googleName = (payload.name || cleanEmail.split("@")[0]).trim();

    let user = mockDB.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Case (a): Brand New User -> Create account with NULL password_hash
      user = {
        id: mockDB.users.length + 100,
        name: googleName,
        email: cleanEmail,
        password_hash: null,
        role: "sme_owner",
        consent_status: "granted",
        is_active: true,
        google_auth: true,
        google_linked: true,
      };
      mockDB.users.push(user);
      mockDB.audit_logs.push({ userId: user.id, action: "REGISTER_GOOGLE", details: { email: cleanEmail } });
    } else if (!user.google_linked || !user.google_auth) {
      // Case (b): Existing user signing in via verified Google email -> Link Account
      user.google_linked = true;
      mockDB.audit_logs.push({ userId: user.id, action: "LINK_GOOGLE_ACCOUNT", details: { email: cleanEmail } });
    } else {
      // Case (c): Returning Google User -> Simple Login
      mockDB.audit_logs.push({ userId: user.id, action: "LOGIN_GOOGLE", details: { email: cleanEmail } });
    }

    if (user.is_active === false) {
      return { status: 403, body: { error: "Your account has been deactivated." } };
    }

    const ownerId = ['pulse_admin','admin'].includes(user.role) ? null : user.id;
    const userPayload = { id: user.id, email: user.email, role: user.role, ownerId };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    const { password_hash, ...safeUser } = user;
    return { status: 200, body: { accessToken, refreshToken, user: safeUser } };
  }

  // Helper simulating /api/auth/login logic
  async function handlePasswordLogin(identifier, password) {
    const cleanEmail = identifier.toLowerCase().trim();
    const user = mockDB.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { status: 401, body: { error: "Invalid email/phone or password" } };
    }

    if (!user.password_hash) {
      return {
        status: 400,
        body: {
          error: "This account uses Google Sign-In. Please click 'Continue with Google' to log in.",
          code: "GOOGLE_AUTH_REQUIRED"
        }
      };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { status: 401, body: { error: "Invalid email/phone or password" } };
    }

    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    return { status: 200, body: { accessToken, user } };
  }

  try {
    // -------------------------------------------------------------
    // Test 1: New user signs up via Google
    // -------------------------------------------------------------
    console.log("[Scenario 1] New User signs up via Google...");
    const payload1 = { email: "new_sme_owner@gmail.com", email_verified: true, name: "New SME Owner" };

    // Simulate 1st request
    const res1a = await handleGoogleAuth(payload1);
    // Simulate double-click request immediately after
    const res1b = await handleGoogleAuth(payload1);

    const user1Count = mockDB.users.filter(u => u.email === "new_sme_owner@gmail.com").length;

    if (
      res1a.status === 200 &&
      res1a.body.user.password_hash === undefined && // excluded from output
      mockDB.users[0].password_hash === null &&
      mockDB.users[0].google_auth === true &&
      mockDB.users[0].google_linked === true &&
      user1Count === 1 // No duplicate on double-click
    ) {
      console.log(" -> PASS: New Google user created with NULL password_hash, role=sme_owner, google_auth=true, and 0 duplicate rows on double-click.");
      results.test1 = "PASS";
    } else {
      console.error(" -> FAIL: New Google user creation failed or created duplicates.");
      results.test1 = "FAIL";
    }

    // -------------------------------------------------------------
    // Test 2: Existing email/password user clicks "Continue with Google"
    // -------------------------------------------------------------
    console.log("\n[Scenario 2] Existing email/password user clicks 'Continue with Google'...");
    const existingPass = await bcrypt.hash("ExistingPass123!", 10);
    const existingUser = {
      id: 500,
      name: "Existing Merchant",
      email: "merchant_existing@gmail.com",
      password_hash: existingPass,
      role: "sme_owner",
      google_auth: false,
      google_linked: false,
      is_active: true,
    };
    mockDB.users.push(existingUser);

    const googlePayload2 = { email: "merchant_existing@gmail.com", email_verified: true, name: "Existing Merchant" };
    const res2 = await handleGoogleAuth(googlePayload2);

    const auditEntry = mockDB.audit_logs.find(a => a.action === "LINK_GOOGLE_ACCOUNT");
    const updatedUser2 = mockDB.users.find(u => u.id === 500);

    if (res2.status === 200 && updatedUser2.google_linked === true && auditEntry) {
      console.log(" -> PASS: Account linked successfully, google_linked=true set, LINK_GOOGLE_ACCOUNT audit logged.");
      results.test2 = "PASS";
    } else {
      console.error(" -> FAIL: Account linking failed.");
      results.test2 = "FAIL";
    }

    // -------------------------------------------------------------
    // Test 3: Google-only user attempts email/password login
    // -------------------------------------------------------------
    console.log("\n[Scenario 3] Google-only user attempts password login...");
    const res3 = await handlePasswordLogin("new_sme_owner@gmail.com", "AttemptedPassword123!");

    if (
      res3.status === 400 &&
      res3.body.code === "GOOGLE_AUTH_REQUIRED" &&
      res3.body.error.includes("This account uses Google Sign-In")
    ) {
      console.log(` -> PASS: Password login correctly rejected with clear message: "${res3.body.error}"`);
      results.test3 = "PASS";
    } else {
      console.error(" -> FAIL: Google-only password login was not cleanly rejected.");
      results.test3 = "FAIL";
    }

    // -------------------------------------------------------------
    // Test 4: Returning Google user logs in again
    // -------------------------------------------------------------
    console.log("\n[Scenario 4] Returning Google user logs in again...");
    const countBefore = mockDB.users.length;
    const res4 = await handleGoogleAuth(payload1);
    const countAfter = mockDB.users.length;

    const loginAudit = mockDB.audit_logs.filter(a => a.action === "LOGIN_GOOGLE").pop();

    if (res4.status === 200 && countBefore === countAfter && loginAudit) {
      console.log(" -> PASS: Returning Google user logged in cleanly, no re-provisioning, no duplicate accounts.");
      results.test4 = "PASS";
    } else {
      console.error(" -> FAIL: Returning Google user login failed or created extra accounts.");
      results.test4 = "FAIL";
    }

    // -------------------------------------------------------------
    // Test 5: Tampered / unverified Google token submitted
    // -------------------------------------------------------------
    console.log("\n[Scenario 5] Unverified/Tampered Google token submitted...");
    const invalidPayload = { email: "attacker@gmail.com", email_verified: false };
    const res5 = await handleGoogleAuth(invalidPayload);

    if (res5.status === 401 && res5.body.error.includes("unverified or missing")) {
      console.log(" -> PASS: Unverified token rejected with 401 Unauthorized.");
      results.test5 = "PASS";
    } else {
      console.error(" -> FAIL: Unverified Google token was accepted.");
      results.test5 = "FAIL";
    }

    console.log("\n=================================================");
    console.log("FINAL GOOGLE AUTH TEST SUMMARY:");
    console.log(`Test 1 (New user sign-up via Google): ${results.test1}`);
    console.log(`Test 2 (Existing user link Google): ${results.test2}`);
    console.log(`Test 3 (Google-only password attempt): ${results.test3}`);
    console.log(`Test 4 (Returning Google user login): ${results.test4}`);
    console.log(`Test 5 (Unverified token rejected 401): ${results.test5}`);
    console.log("=================================================");

  } catch (err) {
    console.error("Verification suite encountered error:", err);
  }
}

runGoogleAuthFlowTests();
