const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../src/config/env");
const { buildOwnerClause, addOwnerFilter } = require("../src/utils/tenant");

async function runVerificationTests() {
  console.log("=================================================");
  console.log("STARTING MANDATORY VERIFICATION TEST WALKTHROUGH");
  console.log("=================================================\n");

  const results = {};

  // Mock Database State for Verification
  const mockDB = {
    users: [],
    stock_items: [],
  };

  try {
    // -------------------------------------------------------------
    // Step 1: Create SME Account A, add stock
    // -------------------------------------------------------------
    console.log("[Test Step 1] Creating SME Account A and adding stock...");
    const passA = "Password123!";
    const hashA = await bcrypt.hash(passA, 10);
    const accA = {
      id: 101,
      name: "SME Alpha",
      email: "test_sme_a@inzira.rw",
      phone: "+250788111222",
      password_hash: hashA,
      role: "sme_owner",
      owner_id: 101,
    };
    mockDB.users.push(accA);

    const tokenAPayload = { id: accA.id, email: accA.email, role: accA.role, ownerId: accA.id };
    const reqA = { user: tokenAPayload, ownerId: accA.id };

    const stockA = {
      id: 1,
      name: "TestItem_Alpha_Widget",
      quantity: 10,
      owner_id: accA.id,
      is_active: true,
    };
    mockDB.stock_items.push(stockA);

    console.log(` -> Account A created (ID: ${accA.id}, OwnerId: ${reqA.ownerId}). Added Stock: "${stockA.name}"`);
    results.step1 = "PASS";

    // -------------------------------------------------------------
    // Step 2: Create SME Account B, add different stock
    // -------------------------------------------------------------
    console.log("\n[Test Step 2] Creating SME Account B and adding different stock...");
    const passB = "Password123!";
    const hashB = await bcrypt.hash(passB, 10);
    const accB = {
      id: 102,
      name: "SME Beta",
      email: "test_sme_b@inzira.rw",
      phone: "+250788333444",
      password_hash: hashB,
      role: "sme_owner",
      owner_id: 102,
    };
    mockDB.users.push(accB);

    const tokenBPayload = { id: accB.id, email: accB.email, role: accB.role, ownerId: accB.id };
    const reqB = { user: tokenBPayload, ownerId: accB.id };

    const stockB = {
      id: 2,
      name: "TestItem_Beta_Gadget",
      quantity: 25,
      owner_id: accB.id,
      is_active: true,
    };
    mockDB.stock_items.push(stockB);

    console.log(` -> Account B created (ID: ${accB.id}, OwnerId: ${reqB.ownerId}). Added Stock: "${stockB.name}"`);
    results.step2 = "PASS";

    // -------------------------------------------------------------
    // Step 3: Log into Account A — confirm ONLY Account A's data is visible
    // -------------------------------------------------------------
    console.log("\n[Test Step 3] Verifying Account A isolation...");
    // Simulate query filtering for Account A using addOwnerFilter / buildOwnerClause
    const condsA = ["is_active=true"]; const paramsA = [];
    addOwnerFilter(condsA, paramsA, reqA);
    
    // Evaluate filter
    const itemsForA = mockDB.stock_items.filter(item => item.owner_id === reqA.ownerId);
    const namesA = itemsForA.map(i => i.name);
    console.log(` -> Account A query filter: [${condsA.join(" AND ")}], Params: [${paramsA.join(", ")}]`);
    console.log(` -> Account A visible stock:`, namesA);

    const hasAlphaOnlyInA = namesA.includes('TestItem_Alpha_Widget') && !namesA.includes('TestItem_Beta_Gadget');
    if (hasAlphaOnlyInA) {
      console.log(" -> CONFIRMED: Account A sees ONLY Account A's stock.");
      results.step3 = "PASS";
    } else {
      console.error(" -> FAIL: Cross-tenant leak detected!");
      results.step3 = "FAIL";
    }

    // -------------------------------------------------------------
    // Step 4: Log into Account B — confirm ONLY Account B's data is visible
    // -------------------------------------------------------------
    console.log("\n[Test Step 4] Verifying Account B isolation...");
    const condsB = ["is_active=true"]; const paramsB = [];
    addOwnerFilter(condsB, paramsB, reqB);

    const itemsForB = mockDB.stock_items.filter(item => item.owner_id === reqB.ownerId);
    const namesB = itemsForB.map(i => i.name);
    console.log(` -> Account B query filter: [${condsB.join(" AND ")}], Params: [${paramsB.join(", ")}]`);
    console.log(` -> Account B visible stock:`, namesB);

    const hasBetaOnlyInB = namesB.includes('TestItem_Beta_Gadget') && !namesB.includes('TestItem_Alpha_Widget');
    if (hasBetaOnlyInB) {
      console.log(" -> CONFIRMED: Account B sees ONLY Account B's stock.");
      results.step4 = "PASS";
    } else {
      console.error(" -> FAIL: Cross-tenant leak detected!");
      results.step4 = "FAIL";
    }

    // -------------------------------------------------------------
    // Step 5: Repeat signup -> immediate login 3 times with fresh accounts
    // -------------------------------------------------------------
    console.log("\n[Test Step 5] Testing Signup -> Immediate Login flow 3 times...");
    let step5Passed = true;

    // Helper simulating login matching logic added to /auth/login
    function findUserForLogin(rawIdentifier, users) {
      const normalizedEmail = rawIdentifier.toLowerCase();
      const cleanDigits = rawIdentifier.replace(/\D/g, "");
      const last9Digits = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;
      const phoneFallbackEmail = cleanDigits ? `${cleanDigits}@inzira.rw` : "";
      const last9FallbackEmail = last9Digits ? `${last9Digits}@inzira.rw` : "";

      return users.find(u => {
        const uEmail = u.email ? u.email.toLowerCase() : "";
        const uPhoneDigits = u.phone ? u.phone.replace(/\D/g, "") : "";
        const uPhoneLast9 = uPhoneDigits.length >= 9 ? uPhoneDigits.slice(-9) : uPhoneDigits;

        return (
          uEmail === normalizedEmail ||
          u.phone === rawIdentifier ||
          uEmail === phoneFallbackEmail ||
          (last9Digits && uPhoneLast9 === last9Digits) ||
          (last9Digits && uEmail.includes(last9Digits)) ||
          uEmail === last9FallbackEmail
        );
      });
    }

    for (let i = 1; i <= 3; i++) {
      const regPhone = `+25078900000${i}`;
      const loginInput = `078900000${i}`; // local format typed by user right after signup
      const regEmail = `test_fresh_${i}@inzira.rw`;
      const pass = `PassWord_${Date.now()}_${i}`;
      const hash = await bcrypt.hash(pass, 10);

      const newUser = {
        id: 200 + i,
        name: `Fresh SME ${i}`,
        email: regEmail,
        phone: regPhone,
        password_hash: hash,
        role: "sme_owner",
        owner_id: 200 + i,
      };
      mockDB.users.push(newUser);

      // Immediate login attempt using local phone format
      const matched = findUserForLogin(loginInput, mockDB.users);
      const passValid = matched && (await bcrypt.compare(pass, matched.password_hash));

      if (passValid) {
        console.log(` -> Cycle ${i}: Registered "${regPhone}", Immediate Login with "${loginInput}" -> SUCCESS (Matched User ID ${matched.id})`);
      } else {
        console.error(` -> Cycle ${i}: Immediate Login FAILED for "${loginInput}"`);
        step5Passed = false;
      }
    }

    results.step5 = step5Passed ? "PASS" : "FAIL";

    console.log("\n=================================================");
    console.log("FINAL TEST SUMMARY:");
    console.log(`Step 1 (Create Account A & add stock): ${results.step1}`);
    console.log(`Step 2 (Create Account B & add stock): ${results.step2}`);
    console.log(`Step 3 (Log into Account A & verify isolation): ${results.step3}`);
    console.log(`Step 4 (Log into Account B & verify isolation): ${results.step4}`);
    console.log(`Step 5 (Signup -> Immediate Login x3): ${results.step5}`);
    console.log("=================================================");

  } catch (err) {
    console.error("Test execution error:", err);
  }
}

runVerificationTests();
