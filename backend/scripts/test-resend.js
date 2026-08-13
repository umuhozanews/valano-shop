const https = require("https");
require("dotenv").config();

const apiKey = process.env.RESEND_API_KEY || "re_test_key_placeholder";
const payload = JSON.stringify({
  from: "onboarding@resend.dev",
  to: ["umuhozanews@gmail.com"],
  subject: "INZIRA Insights — Resend Integration Test Email",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="background-color: #10b981; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">INZIRA Insights — Resend Test Email</h2>
      </div>
      <p>Hello,</p>
      <p>This test email confirms that your <strong>Resend API Key</strong> is valid and active!</p>
      <div style="background-color: #f3f4f6; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 14px;">
        <p style="margin: 4px 0;"><strong>Sender:</strong> onboarding@resend.dev</p>
        <p style="margin: 4px 0;"><strong>Recipient:</strong> umuhozanews@gmail.com</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> Successfully Delivered</p>
      </div>
      <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
        Next step: Setting up automated Welcome Emails & Admin Signup Alerts on Inzira Insights.
      </p>
    </div>
  `
});

const req = https.request("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  }
}, (res) => {
  let responseData = "";
  res.on("data", chunk => { responseData += chunk; });
  res.on("end", () => {
    console.log("HTTP Status Code:", res.statusCode);
    console.log("Response Body:", responseData);
  });
});

req.on("error", (err) => {
  console.error("Request Error:", err);
});

req.write(payload);
req.end();
