const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
  },
});

async function sendLoginAlert(toEmail, userName, ipAddress) {
  const subject = "Security Alert: New Login Detected — Inzira Insights";
  const dateStr = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" });

  const text = `Hello ${userName},

A new login to your Inzira Insights account was detected.

Details:
- User: ${userName}
- Email: ${toEmail}
- Time: ${dateStr} (Kigali Time)
- IP Address: ${ipAddress}

If this was you, you can safely ignore this email. If it wasn't you, change your password immediately.

Inzira Insights Security Team
Pulse Data Analytics Ltd`;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:600px;border:1px solid #ddd;border-radius:8px;">
      <h2 style="color:#10B981;margin-bottom:16px;">Inzira Insights — Security Alert</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>A new login to your <strong>Inzira Insights</strong> account was detected.</p>
      <hr style="border:0;border-top:1px solid #eee;margin:16px 0;"/>
      <table style="width:100%;font-size:14px;">
        <tr><td style="width:120px;font-weight:bold;padding:4px 0;">User:</td><td>${userName}</td></tr>
        <tr><td style="font-weight:bold;padding:4px 0;">Email:</td><td>${toEmail}</td></tr>
        <tr><td style="font-weight:bold;padding:4px 0;">Time:</td><td>${dateStr} (Kigali)</td></tr>
        <tr><td style="font-weight:bold;padding:4px 0;">IP:</td><td><code>${ipAddress}</code></td></tr>
      </table>
      <hr style="border:0;border-top:1px solid #eee;margin:16px 0;"/>
      <p style="font-size:13px;color:#666;">If this was not you, change your password immediately or contact your administrator.</p>
      <p style="font-size:13px;font-weight:bold;color:#10B981;">Inzira Insights Security — Pulse Data Analytics Ltd</p>
    </div>`;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[MAIL MOCK] Login alert → ${toEmail}`);
    return { mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Inzira Insights" <no-reply@inzira-insights.rw>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return info;
  } catch (err) {
    console.error(`[MAIL ERROR] ${err.message}`);
    throw err;
  }
async function sendWelcomeEmail(toEmail, userName, shopName) {
  const subject = "Welcome to INZIRA Insights — Account Registration Confirmed";
  const dateStr = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" });

  const text = `Hello ${userName},

Welcome to INZIRA Insights!

Your business account "${shopName}" has been successfully created.

Account Summary:
- Business Owner: ${userName}
- Registered Email: ${toEmail}
- Date Created: ${dateStr} (Kigali Time)

You can now log in to manage your inventory stock, process POS sales, issue EBM tax invoices, and track your business Profit & Loss.

Best regards,
The INZIRA Insights Team
Pulse Data Analytics Ltd`;

  const html = `
    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;padding:32px;color:#1A1A1A;max-width:600px;background-color:#F9FAFB;border-radius:16px;">
      <div style="background-color:#10B981;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:800;">INZIRA Insights</h1>
        <p style="color:#D1FAE5;margin:4px 0 0 0;font-size:14px;">SME Business & Inventory Platform</p>
      </div>

      <div style="background-color:#FFFFFF;padding:24px;border-radius:12px;border:1px solid #E5E7EB;">
        <h2 style="color:#111827;margin-top:0;font-size:18px;">Welcome, ${userName}!</h2>
        <p style="font-size:14px;line-height:1.6;color:#4B5563;">
          Your business account for <strong>${shopName}</strong> has been successfully registered and initialized.
        </p>

        <div style="background-color:#F3F4F6;padding:16px;border-radius:8px;margin:20px 0;">
          <table style="width:100%;font-size:13px;color:#374151;">
            <tr><td style="font-weight:bold;padding:4px 0;width:140px;">Business Name:</td><td>${shopName}</td></tr>
            <tr><td style="font-weight:bold;padding:4px 0;">Registered Email:</td><td>${toEmail}</td></tr>
            <tr><td style="font-weight:bold;padding:4px 0;">Created Date:</td><td>${dateStr} (Kigali)</td></tr>
          </table>
        </div>

        <p style="font-size:14px;line-height:1.6;color:#4B5563;">
          You can now start adding stock items, recording POS sales counter receipts, and tracking customer credit receivables.
        </p>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:12px;color:#9CA3AF;">
        <p style="margin:0;">INZIRA Insights — Powered by Pulse Data Analytics Ltd</p>
      </div>
    </div>`;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[MAIL MOCK] Welcome email → ${toEmail} (${shopName})`);
    return { mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"INZIRA Insights" <no-reply@inzira.rw>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return info;
  } catch (err) {
    console.error(`[MAIL ERROR] Welcome email dispatch failed: ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { sendLoginAlert, sendWelcomeEmail };
