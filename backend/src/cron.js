const cron = require("node-cron");
const pool = require("./config/db");
const { notifyAdminsAndManagers } = require("./utils/helpers");

function startCronJobs() {
  // Daily 8am EAT (UTC+2 = 6am UTC)
  cron.schedule("0 6 * * *", async () => {
    console.log("[CRON] Running daily summary...");
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      const [sales, lowStock] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue
          FROM sales WHERE DATE(created_at)=$1 AND is_voided=false`, [dateStr]),
        pool.query(`SELECT COUNT(*) as count FROM stock_items
          WHERE is_active=true AND quantity > 0 AND quantity <= low_stock_threshold`),
      ]);

      const { count, revenue } = sales.rows[0];
      const lowCount = lowStock.rows[0].count;
      await notifyAdminsAndManagers(
        "DAILY_SUMMARY",
        `Daily Summary — ${dateStr}`,
        `Yesterday: ${count} sales, ${parseInt(revenue).toLocaleString()} RWF. Low stock: ${lowCount} items need restocking.`
      );
    } catch (e) {
      console.error("[CRON] Daily summary error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  // Monthly 1st 9am EAT
  cron.schedule("0 7 1 * *", async () => {
    console.log("[CRON] Running monthly worker summary...");
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthStr = lastMonth.toLocaleString("en-RW", { month: "long", year: "numeric" });

      const { rows } = await pool.query(`
        SELECT u.name, COUNT(s.id) as sales, COALESCE(SUM(s.total_amount),0) as revenue
        FROM users u LEFT JOIN sales s ON s.worker_id=u.id
          AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW() - INTERVAL '1 month')
          AND s.is_voided=false
        WHERE u.role='worker' AND u.is_active=true
        GROUP BY u.id, u.name ORDER BY revenue DESC LIMIT 3`);

      const summary = rows.map((r, i) => `${i + 1}. ${r.name}: ${parseInt(r.revenue).toLocaleString()} RWF`).join(", ");
      await notifyAdminsAndManagers(
        "MONTHLY_SUMMARY",
        `Monthly Worker Performance — ${monthStr}`,
        `Top performers: ${summary}`
      );
    } catch (e) {
      console.error("[CRON] Monthly summary error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  console.log("[CRON] Jobs registered (daily 8am, monthly 1st 9am EAT)");
}

module.exports = { startCronJobs };
