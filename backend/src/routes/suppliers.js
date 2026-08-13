const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate } = require("../utils/helpers");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

router.get("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { search, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(s.name ILIKE $${params.length} OR s.products_supplied ILIKE $${params.length})`);
    }
    addOwnerFilter(conds, params, req.ownerId, 's');
    params.push(lim); params.push(offset);

    const [data, cnt] = await Promise.all([
      pool.query(
        `SELECT s.*,
          COUNT(po.id) as orders_count,
          COALESCE(SUM(poi.quantity * poi.unit_cost_rwf),0) as total_purchased_rwf
         FROM suppliers s
         LEFT JOIN purchase_orders po ON po.supplier_id=s.id
         LEFT JOIN purchase_order_items poi ON poi.order_id=po.id
         WHERE ${conds.join(" AND ")} GROUP BY s.id ORDER BY s.name
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM suppliers s WHERE ${conds.join(" AND ")}`, params.slice(0,-2)),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const sOwnerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const poOwnerWhere = isAdmin ? "1=1" : "po.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const [sup, orders] = await Promise.all([
      pool.query(`SELECT * FROM suppliers WHERE id=$1 AND ${sOwnerWhere}`, queryParams),
      pool.query(
        `SELECT po.*, COUNT(poi.id) as items_count
         FROM purchase_orders po LEFT JOIN purchase_order_items poi ON poi.order_id=po.id
         WHERE po.supplier_id=$1 AND ${poOwnerWhere} GROUP BY po.id ORDER BY po.created_at DESC LIMIT 10`,
        queryParams
      ),
    ]);
    if (!sup.rows[0]) return res.status(404).json({ error: "Supplier not found" });
    res.json({ ...sup.rows[0], orders: orders.rows });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, address, notes, products_supplied, payment_terms } = req.body;
    if (!name) return res.status(400).json({ error: "Supplier name required" });

    const { rows: [s] } = await pool.query(
      `INSERT INTO suppliers (name, phone, email, address, notes, products_supplied, payment_terms, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, phone || null, email || null, address || null, notes || null, products_supplied || null, payment_terms || null, req.ownerId]
    );
    await logAudit(req.user.id, "SUPPLIER_CREATED", "suppliers", s.id, null, s, req.ip);
    res.status(201).json(s);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, phone, email, address, notes, products_supplied, payment_terms, outstanding_balance } = req.body;
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$10";
    const params = [name, phone || null, email || null, address || null, notes || null,
       products_supplied || null, payment_terms || null, outstanding_balance ?? null, req.params.id];
    if (!isAdmin) params.push(req.ownerId);

    const { rows: [s] } = await pool.query(
      `UPDATE suppliers SET name=$1, phone=$2, email=$3, address=$4, notes=$5,
        products_supplied=$6, payment_terms=$7,
        outstanding_balance=COALESCE($8, outstanding_balance)
       WHERE id=$9 AND ${ownerWhere} RETURNING *`,
      params
    );
    if (!s) return res.status(404).json({ error: "Supplier not found" });
    await logAudit(req.user.id, "SUPPLIER_UPDATED", "suppliers", s.id, null, req.body, req.ip);
    res.json(s);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM purchase_orders WHERE supplier_id=$1 AND ${ownerWhere}`, queryParams
    );
    if (parseInt(rows[0].count) > 0)
      return res.status(400).json({ error: "Cannot delete supplier with existing purchase orders" });

    await pool.query(`DELETE FROM suppliers WHERE id=$1 AND ${ownerWhere}`, queryParams);
    await logAudit(req.user.id, "SUPPLIER_DELETED", "suppliers", req.params.id, null, null, req.ip);
    res.json({ message: "Supplier deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
