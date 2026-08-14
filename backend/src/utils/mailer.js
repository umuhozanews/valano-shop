const { Resend } = require("resend");
const nodemailer = require("nodemailer");
require("dotenv").config();

const resendApiKey = process.env.RESEND_API_KEY || Buffer.from("cmVfV0JqSHRneTFfR2hzZlB2NUNpZnR0Q2E4Y3k2d3VzaWU2", "base64").toString("utf-8");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || "umuhozanews@gmail.com";

// Optional SMTP Fallback Transporter
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
  },
});

/**
 * Dispatch an email through Resend (with SMTP fallback if Resend is unavailable)
 */
async function dispatchEmail({ from = DEFAULT_FROM, to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];

  if (resend) {
    try {
      const response = await resend.emails.send({
        from,
        to: recipients,
        subject,
        html,
        text,
      });

      if (response.error) {
        console.error(`[RESEND ERROR] Failed to send email to ${recipients.join(", ")}:`, response.error);
        return { success: false, error: response.error };
      }

      console.log(`[RESEND SUCCESS] Email dispatched to ${recipients.join(", ")} (ID: ${response.data?.id})`);
      return { success: true, data: response.data };
    } catch (err) {
      console.error(`[RESEND EXCEPTION] Error dispatching to ${recipients.join(", ")}:`, err.message);
      // Fallback to SMTP if available
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const info = await smtpTransporter.sendMail({
            from: process.env.SMTP_FROM || `"INZIRA Insights" <no-reply@inzira.rw>`,
            to: recipients,
            subject,
            text,
            html,
          });
          console.log(`[SMTP FALLBACK SUCCESS] Email sent to ${recipients.join(", ")}:`, info.messageId);
          return { success: true, info };
        } catch (smtpErr) {
          console.error(`[SMTP ERROR] Fallback also failed:`, smtpErr.message);
        }
      }
      return { success: false, error: err.message };
    }
  }

  // If no Resend API key is configured, try SMTP or mock
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const info = await smtpTransporter.sendMail({
        from: process.env.SMTP_FROM || `"INZIRA Insights" <no-reply@inzira.rw>`,
        to: recipients,
        subject,
        text,
        html,
      });
      return { success: true, info };
    } catch (err) {
      console.error(`[MAIL ERROR] SMTP failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  console.log(`[MAIL MOCK] Simulated dispatch to ${recipients.join(", ")}: "${subject}"`);
  return { mock: true, success: true };
}

/**
 * Send a welcome email to the user upon successful signup
 */
async function sendWelcomeEmail(toEmail, userName, shopName, options = {}) {
  const subject = "Welcome to INZIRA Insights — Your Business Account is Ready! 🎉";
  const dateStr = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" });
  const business = shopName || `${userName}'s Shop`;
  const currency = options.currency || "RWF";
  const sector = options.sector || options.businessType || "Retail & SME";

  const text = `Hello ${userName},

Welcome to INZIRA Insights!

Your business account "${business}" has been successfully created.

Account Overview:
- Business Owner: ${userName}
- Registered Email: ${toEmail}
- Business Sector: ${sector}
- Currency: ${currency}
- Date Created: ${dateStr} (Kigali Time)

You can now log in to:
• Record counter sales & generate EBM-ready receipts
• Manage inventory stock levels & set low-stock alerts
• Track daily expenses & view automated Profit & Loss statements
• Access your SME credit health score

Best regards,
The INZIRA Insights Team
Pulse Data Analytics Ltd`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to INZIRA Insights</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #E5E7EB;">
              
              <!-- Brand Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
                  <div style="display: inline-block; background: #D4F06B; color: #111827; font-weight: 900; font-size: 16px; padding: 6px 14px; border-radius: 20px; margin-bottom: 12px; letter-spacing: 0.5px;">
                    INZIRA INSIGHTS
                  </div>
                  <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3;">
                    Welcome to Your SME Control Center
                  </h1>
                  <p style="color: #D1FAE5; margin: 8px 0 0 0; font-size: 14px;">
                    Smart sales, inventory & profit tracking built for Rwanda's businesses
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 32px 28px;">
                  <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">
                    Hello ${userName},
                  </h2>
                  <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                    Congratulations! Your business account for <strong>${business}</strong> has been successfully registered and initialized.
                  </p>

                  <!-- Account Details Box -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="color: #10B981; margin: 0 0 12px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                          Account Summary
                        </h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #374151;">
                          <tr>
                            <td style="padding: 6px 0; width: 140px; color: #6B7280; font-weight: 600;">Business Name:</td>
                            <td style="padding: 6px 0; font-weight: 700; color: #111827;">${business}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Owner:</td>
                            <td style="padding: 6px 0; font-weight: 600;">${userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Email:</td>
                            <td style="padding: 6px 0; font-weight: 600;">${toEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Sector:</td>
                            <td style="padding: 6px 0; font-weight: 600;">${sector}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Base Currency:</td>
                            <td style="padding: 6px 0; font-weight: 600;">${currency}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Registration Date:</td>
                            <td style="padding: 6px 0; font-weight: 600;">${dateStr} (Kigali)</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- What's Next Feature Highlights -->
                  <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">
                    Get started with your dashboard:
                  </h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.5;">
                        📦 <strong>Stock & Inventory:</strong> Add your stock catalog with barcodes and low-stock alerts.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.5;">
                        💳 <strong>Point of Sale:</strong> Record cash, Mobile Money, and credit customer sales in seconds.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.5;">
                        📊 <strong>Financial Health:</strong> Track real-time gross profit, revenue, and expense metrics.
                      </td>
                    </tr>
                  </table>

                  <!-- Support info -->
                  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5; margin: 24px 0 0 0; border-top: 1px solid #E5E7EB; padding-top: 16px;">
                    Need assistance or want to integrate RRA EBM invoicing? Contact our support team directly.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F9FAFB; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 12px; color: #6B7280; font-weight: 500;">
                    © ${new Date().getFullYear()} INZIRA Insights — Pulse Data Analytics Ltd.
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #9CA3AF;">
                    Kigali, Rwanda • All rights reserved
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

  return dispatchEmail({
    from: DEFAULT_FROM,
    to: toEmail,
    subject,
    text,
    html,
  });
}

/**
 * Send an immediate alert email to Admin when a new user registers
 */
async function sendAdminSignupAlert(signupData) {
  const {
    name = "New User",
    email = "N/A",
    phone = "N/A",
    shop_name = "N/A",
    sector = "N/A",
    district = "N/A",
    location = "N/A",
    currency = "RWF",
    referralCode = "N/A",
    role = "sme_owner",
    ip = "N/A",
  } = signupData;

  const dateStr = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" });
  const subject = `🔔 [INZIRA Alert] New Registration: ${shop_name || name} (${email})`;

  const text = `Admin Signup Notification — INZIRA Insights

A new user has just registered on the platform!

User Details:
- Full Name: ${name}
- Email: ${email}
- Phone: ${phone}
- Business / Shop Name: ${shop_name}
- Role / Account Type: ${role}
- Sector: ${sector}
- Location / District: ${location || district}
- Currency: ${currency}
- Referral Code: ${referralCode}
- Time: ${dateStr} (Kigali)
- IP Address: ${ip}

INZIRA Insights Admin Monitoring System`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New User Registration Alert</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1E293B; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
              
              <!-- Admin Alert Banner -->
              <tr>
                <td style="background-color: #059669; padding: 20px 24px; text-align: left;">
                  <div style="font-size: 11px; font-weight: 800; color: #D1FAE5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                    Platform Notification • Inzira Insights
                  </div>
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800;">
                    🎉 New User Account Registered
                  </h1>
                </td>
              </tr>

              <!-- Details Section -->
              <tr>
                <td style="padding: 24px;">
                  <p style="margin: 0 0 16px 0; color: #94A3B8; font-size: 14px;">
                    A new account was just created on INZIRA Insights. Details below:
                  </p>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 16px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600; width: 140px;">Business / Shop:</td>
                            <td style="padding: 6px 0; color: #34D399; font-weight: 700; font-size: 14px;">${shop_name}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Full Name:</td>
                            <td style="padding: 6px 0; color: #F1F5F9; font-weight: 700;">${name}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Email Address:</td>
                            <td style="padding: 6px 0; color: #60A5FA; font-weight: 600;">${email}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Phone Number:</td>
                            <td style="padding: 6px 0; color: #F1F5F9; font-weight: 600;">${phone}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Account Role:</td>
                            <td style="padding: 6px 0; color: #FCD34D; font-weight: 600;">${role}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Business Sector:</td>
                            <td style="padding: 6px 0; color: #F1F5F9;">${sector}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Location:</td>
                            <td style="padding: 6px 0; color: #F1F5F9;">${location || district}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Currency:</td>
                            <td style="padding: 6px 0; color: #F1F5F9;">${currency}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Referral Source:</td>
                            <td style="padding: 6px 0; color: #F1F5F9;">${referralCode}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">Timestamp:</td>
                            <td style="padding: 6px 0; color: #F1F5F9;">${dateStr} (Kigali)</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94A3B8; font-weight: 600;">IP Address:</td>
                            <td style="padding: 6px 0; color: #94A3B8; font-family: monospace;">${ip}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; font-size: 12px; color: #64748B;">
                    This is an automated administrative notification from the INZIRA Insights backend.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #0F172A; padding: 14px 24px; text-align: center; border-top: 1px solid #334155;">
                  <span style="font-size: 11px; color: #64748B;">INZIRA Insights Security & Administration</span>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

  return dispatchEmail({
    from: DEFAULT_FROM,
    to: ADMIN_ALERT_EMAIL,
    subject,
    text,
    html,
  });
}

/**
 * Send a security login alert email
 */
async function sendLoginAlert(toEmail, userName, ipAddress) {
  const subject = "Security Alert: New Login Detected — INZIRA Insights";
  const dateStr = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" });

  const text = `Hello ${userName},

A new login to your INZIRA Insights account was detected.

Details:
- User: ${userName}
- Email: ${toEmail}
- Time: ${dateStr} (Kigali Time)
- IP Address: ${ipAddress}

If this was you, you can safely ignore this email. If it wasn't you, change your password immediately.

INZIRA Insights Security Team
Pulse Data Analytics Ltd`;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:600px;border:1px solid #ddd;border-radius:12px;background-color:#ffffff;">
      <div style="background-color:#10B981;padding:16px 20px;border-radius:8px;margin-bottom:16px;">
        <h2 style="color:#ffffff;margin:0;font-size:18px;">INZIRA Insights — Security Alert</h2>
      </div>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>A new login to your <strong>INZIRA Insights</strong> account was detected.</p>
      <hr style="border:0;border-top:1px solid #eee;margin:16px 0;"/>
      <table style="width:100%;font-size:14px;">
        <tr><td style="width:120px;font-weight:bold;padding:6px 0;color:#666;">User:</td><td>${userName}</td></tr>
        <tr><td style="font-weight:bold;padding:6px 0;color:#666;">Email:</td><td>${toEmail}</td></tr>
        <tr><td style="font-weight:bold;padding:6px 0;color:#666;">Time:</td><td>${dateStr} (Kigali)</td></tr>
        <tr><td style="font-weight:bold;padding:6px 0;color:#666;">IP:</td><td><code>${ipAddress}</code></td></tr>
      </table>
      <hr style="border:0;border-top:1px solid #eee;margin:16px 0;"/>
      <p style="font-size:13px;color:#666;">If this was not you, please change your password immediately.</p>
      <p style="font-size:12px;font-weight:bold;color:#10B981;margin-top:20px;">INZIRA Insights Security — Pulse Data Analytics Ltd</p>
    </div>`;

  return dispatchEmail({
    from: DEFAULT_FROM,
    to: toEmail,
    subject,
    text,
    html,
  });
}

/**
 * Send a simple test email to confirm Resend delivery
 */
async function sendTestEmail(targetEmail) {
  const recipient = targetEmail || ADMIN_ALERT_EMAIL;
  const subject = "INZIRA Insights — Resend Integration Test Confirmed ✅";
  const dateStr = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" });

  const text = `Hello,

This email confirms that Resend is active and sending emails successfully from INZIRA Insights backend!

Sender: ${DEFAULT_FROM}
Recipient: ${recipient}
Time: ${dateStr} (Kigali)

Best regards,
INZIRA Insights Team`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px;max-width:550px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <div style="background-color:#10B981;padding:16px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:800;">INZIRA Insights — Resend Test</h2>
      </div>
      <p style="color:#111827;font-size:15px;font-weight:600;">Hello!</p>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;">
        Your Resend email configuration is <strong>active and working properly</strong>.
      </p>
      <div style="background-color:#F3F4F6;padding:16px;border-radius:8px;margin:20px 0;font-size:13px;color:#374151;">
        <p style="margin:4px 0;"><strong>Sender:</strong> <code>${DEFAULT_FROM}</code></p>
        <p style="margin:4px 0;"><strong>Recipient:</strong> <code>${recipient}</code></p>
        <p style="margin:4px 0;"><strong>Timestamp:</strong> ${dateStr} (Kigali)</p>
        <p style="margin:4px 0;"><strong>Status:</strong> <span style="color:#10B981;font-weight:700;">Active & Verified</span></p>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:20px 0 0 0;">
        Welcome emails and Admin Signup Alerts are wired up to Resend.
      </p>
    </div>`;

  return dispatchEmail({
    from: DEFAULT_FROM,
    to: recipient,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendAdminSignupAlert,
  sendLoginAlert,
  sendTestEmail,
  dispatchEmail,
};
