const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { paginate } = require("../utils/helpers");
const { exportToExcel } = require("../utils/excel");

router.use(verifyToken, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const { user_id, action, table_name, start_date, end_date, search, page, limit, export: exp } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (user_id) { params.push(user_id); conds.push(`al.user_id=$${params.length}`); }
    if (action) { params.push(action); conds.push(`al.action=$${params.length}`); }
    if (table_name) { params.push(table_name); conds.push(`al.table_name=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`DATE(al.created_at)>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`DATE(al.created_at)<=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conds.push(`(al.action ILIKE $${params.length} OR u.name ILIKE $${params.length})`); }
    const where = conds.join(" AND ");

    if (exp === "excel") {
      const { rows } = await pool.query(
        `SELECT al.created_at, u.name as user, u.role, al.action, al.table_name,
          al.record_id, al.ip_address
         FROM audit_log al LEFT JOIN users u ON u.id=al.user_id
         WHERE ${where} ORDER BY al.created_at DESC`, params
      );
      return exportToExcel(res, [{
        name: "Audit Log",
        headers: ["Timestamp", "User", "Role", "Action", "Module", "Record ID", "IP"],
        rows: rows.map(r => [r.created_at, r.user, r.role, r.action, r.table_name, r.record_id, r.ip_address]),
      }]);
    }

    params.push(lim); params.push(offset);
    const [data, cnt] = await Promise.all([
      pool.query(`SELECT al.*, u.name as user_name, u.role as user_role
         FROM audit_log al LEFT JOIN users u ON u.id=al.user_id
         WHERE ${where} ORDER BY al.created_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM audit_log al LEFT JOIN users u ON u.id=al.user_id WHERE ${where}`, params.slice(0,-2)),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

module.exports = router;
