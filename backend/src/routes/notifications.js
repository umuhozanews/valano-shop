const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { paginate } = require("../utils/helpers");

router.use(verifyToken);

router.get("/", async (req, res, next) => {
  try {
    const { is_read, type, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["user_id=$1"]; const params = [req.user.id];
    if (is_read !== undefined) { params.push(is_read === "true"); conds.push(`is_read=$${params.length}`); }
    if (type) { params.push(type); conds.push(`type=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt] = await Promise.all([
      pool.query(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC
        LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM notifications WHERE ${where}`, params.slice(0,-2)),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.get("/unread-count", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id=$1 AND is_read=false", [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) { next(err); }
});

router.put("/read-all", async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read=true WHERE user_id=$1", [req.user.id]);
    res.json({ message: "All marked read" });
  } catch (err) { next(err); }
});

router.put("/:id/read", async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]);
    res.json({ message: "Marked read" });
  } catch (err) { next(err); }
});

module.exports = router;
