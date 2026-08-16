const pool = require("../config/db");

let _tableEnsured = false;

async function ensureDeletionLogsTable() {
  if (_tableEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deletion_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        deleted_data JSONB NOT NULL,
        deleted_by INTEGER,
        owner_id INTEGER,
        reason TEXT,
        deleted_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_deletion_logs_owner ON deletion_logs(owner_id);
      CREATE INDEX IF NOT EXISTS idx_deletion_logs_entity ON deletion_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_deletion_logs_date ON deletion_logs(deleted_at DESC);
    `);
    _tableEnsured = true;
  } catch (err) {
    console.error("[DELETION_LOGS] Error ensuring table:", err.message);
  }
}

/**
 * Log a permanent, tamper-proof snapshot of a deleted record to deletion_logs.
 * This table is strictly append-only.
 */
async function logDeletion({ entity_type, entity_id, deleted_data, deleted_by, owner_id, reason }) {
  try {
    await ensureDeletionLogsTable();
    const query = `
      INSERT INTO deletion_logs (entity_type, entity_id, deleted_data, deleted_by, owner_id, reason, deleted_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(query, [
      entity_type,
      entity_id,
      JSON.stringify(deleted_data || {}),
      deleted_by ? parseInt(deleted_by, 10) : null,
      owner_id ? parseInt(owner_id, 10) : null,
      reason ? String(reason).trim() : "Deleted by user",
    ]);
    return rows[0];
  } catch (err) {
    console.error("[DELETION_LOG_INSERT_ERROR]", err);
    return null;
  }
}

module.exports = {
  ensureDeletionLogsTable,
  logDeletion,
};
