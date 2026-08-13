const { sendTestEmail, sendAdminSignupAlert, sendWelcomeEmail } = require("../src/utils/mailer");

async function runTests() {
  console.log("=== 1. Testing Resend Test Email ===");
  const testRes = await sendTestEmail();
  console.log("sendTestEmail result:", testRes);

  console.log("\n=== 2. Testing Resend Admin Signup Alert Email ===");
  const adminAlertRes = await sendAdminSignupAlert({
    name: "Jean Paul Ndayisaba",
    email: "jeanpaul@kigalifresh.rw",
    phone: "+250 788 123 456",
    shop_name: "Kigali Fresh Mart",
    sector: "Retail & Supermarket",
    district: "Nyarugenge",
    location: "Nyarugenge Market, Kigali",
    currency: "RWF",
    referralCode: "INZIRA2026",
    role: "sme_owner",
    ip: "127.0.0.1"
  });
  console.log("sendAdminSignupAlert result:", adminAlertRes);
}

runTests().then(() => {
  console.log("\nTests complete.");
  process.exit(0);
}).catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
