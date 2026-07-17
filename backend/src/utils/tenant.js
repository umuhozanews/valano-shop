const pool = require("../config/db");
let _migrated = false;
const TENANT_TABLES = ['stock_items','sales','expenses','customers','suppliers','invoices','purchase_orders','journal_entries','notifications'];

async function ensureTenantColumns() {
  if (_migrated) return;
  for (const t of TENANT_TABLES) {
    await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS owner_id INT`).catch(() => {});
  }
  _migrated = true;
}

// Pushes owner filter into conds/params arrays (the pattern used in every route)
function addOwnerFilter(conds, params, ownerId, alias = '') {
  if (ownerId !== null && ownerId !== undefined) {
    params.push(ownerId);
    const col = alias ? `${alias}.owner_id` : 'owner_id';
    conds.push(`${col} = $${params.length}`);
  }
}

module.exports = { ensureTenantColumns, addOwnerFilter };
