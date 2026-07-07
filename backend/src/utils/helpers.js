const pool = require("../config/db");
const crypto = require("crypto");
const { runDatabaseBackup } = require("./backup");

function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { limit: l, offset: (p - 1) * l };
}

function generateInvoiceNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const rand = crypto.randomInt(1000, 9999);
  return `INZ-${yy}${mm}-${rand}`;
}

async function logAudit(userId, action, tableName, recordId, oldValue, newValue, ip) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_value, new_value, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, action, tableName, recordId,
       oldValue ? JSON.stringify(oldValue) : null,
       newValue ? JSON.stringify(newValue) : null,
       ip || null]
    );
    
    // Automatically trigger database backup on audit logging (write operations)
    runDatabaseBackup().catch(e => {
      console.error("[BACKUP ERROR] Auto backup failed in logAudit:", e.message);
    });
  } catch (e) {
    console.error("Audit log error:", e.message);
  }
}

async function createNotification(userId, type, title, message) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)`,
      [userId, type, title, message]
    );
  } catch (e) {
    console.error("Notification error:", e.message);
  }
}

async function notifyAdminsAndManagers(type, title, message) {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE role IN ('admin','manager','sme_owner','pulse_admin') AND is_active = true`
    );
    for (const u of rows) {
      await createNotification(u.id, type, title, message);
    }
  } catch (e) {
    console.error("Bulk notify error:", e.message);
  }
}

function formatRWF(n) {
  return new Intl.NumberFormat("en-RW").format(n || 0) + " RWF";
}

module.exports = {
  paginate,
  generateInvoiceNumber,
  logAudit,
  createNotification,
  notifyAdminsAndManagers,
  formatRWF,
};
