const pool = require("../config/db");
const { ensureDeletionLogsTable } = require("./deletion");
let _migrated = false;
const TENANT_TABLES = ['stock_items','sales','expenses','customers','suppliers','invoices','purchase_orders','journal_entries','notifications'];

async function ensureTenantColumns() {
  if (_migrated) return;
  for (const t of TENANT_TABLES) {
    await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS owner_id INT`).catch(() => {});
  }
  await ensureDeletionLogsTable().catch(() => {});
  _migrated = true;
}

function isAdminRole(reqOrRole) {
  if (!reqOrRole) return false;
  const role = typeof reqOrRole === 'object' ? reqOrRole?.user?.role : reqOrRole;
  return ['pulse_admin', 'admin'].includes(role);
}

// Pushes owner filter into conds/params arrays (the pattern used in list endpoints)
function addOwnerFilter(conds, params, reqOrOwnerId, alias = '') {
  const req = typeof reqOrOwnerId === 'object' && reqOrOwnerId !== null ? reqOrOwnerId : null;
  if (req && isAdminRole(req)) {
    return;
  }
  const ownerId = req ? req.ownerId : reqOrOwnerId;
  if (ownerId !== null && ownerId !== undefined) {
    params.push(ownerId);
    const col = alias ? `${alias}.owner_id` : 'owner_id';
    conds.push(`(${col} = $${params.length} OR ${col} IS NULL)`);
  }
}

// Builds explicit tenant WHERE clause snippet for single-record lookups/mutations
function buildOwnerClause(req, alias = '', startParamIdx = 2) {
  if (isAdminRole(req)) {
    return { sql: '1=1', params: [] };
  }
  if (!req.ownerId) {
    throw new Error("TENANT_ISOLATION_VIOLATION: Non-admin request missing valid ownerId");
  }
  const col = alias ? `${alias}.owner_id` : 'owner_id';
  return { sql: `${col} = $${startParamIdx}`, params: [req.ownerId] };
}

module.exports = { ensureTenantColumns, addOwnerFilter, buildOwnerClause, isAdminRole };
