const cron = require("node-cron");
const pool = require("./config/db");
const { notifyAdminsAndManagers } = require("./utils/helpers");

function startCronJobs() {

  // Daily summary at 8pm EAT
  cron.schedule("0 18 * * *", async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [sales, expenses, lowStock] = await Promise.all([
        pool.query(
          "SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue FROM sales WHERE DATE(created_at)=$1 AND is_voided=false",
          [today]
        ),
        pool.query(
          "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date=$1",
          [today]
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM stock_items WHERE is_active=true AND quantity>0 AND quantity<=low_stock_threshold"
        ),
      ]);

      const rev = parseInt(sales.rows[0].revenue);
      const exp = parseInt(expenses.rows[0].total);
      await notifyAdminsAndManagers(
        "DAILY_SUMMARY",
        `Daily Summary — ${today}`,
        `Sales: ${sales.rows[0].count} transactions, ${rev.toLocaleString()} RWF. Expenses: ${exp.toLocaleString()} RWF. Net: ${(rev - exp).toLocaleString()} RWF. Low stock: ${lowStock.rows[0].count} items.`
      );
    } catch (e) {
      console.error("[CRON] Daily summary error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  // Mark overdue receivables daily at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      const { rows } = await pool.query(
        `UPDATE accounts_receivable SET status='overdue'
         WHERE due_date < CURRENT_DATE AND status IN ('pending','partial')
         RETURNING id`
      );
      if (rows.length > 0) {
        await notifyAdminsAndManagers(
          "RECEIVABLES_OVERDUE",
          "Overdue Receivables",
          `${rows.length} receivable(s) are now overdue. Review in Accounts Receivable.`
        );
      }
    } catch (e) {
      console.error("[CRON] Overdue receivables error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  // Weekly sales drop check — every Monday 9am EAT
  cron.schedule("0 7 * * 1", async () => {
    try {
      const { rows } = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '7 days' THEN total_amount ELSE 0 END),0) as this_week,
          COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '14 days' AND created_at < NOW()-INTERVAL '7 days' THEN total_amount ELSE 0 END),0) as last_week
        FROM sales WHERE is_voided=false`
      );
      const thisWeek = parseInt(rows[0].this_week);
      const lastWeek = parseInt(rows[0].last_week);
      if (lastWeek > 0 && thisWeek < lastWeek * 0.4) {
        const drop = Math.round((1 - thisWeek / lastWeek) * 100);
        await notifyAdminsAndManagers(
          "SALES_DROP",
          "Sales Drop Alert",
          `Sales dropped ${drop}% this week vs last week (${thisWeek.toLocaleString()} vs ${lastWeek.toLocaleString()} RWF).`
        );
      }
    } catch (e) {
      console.error("[CRON] Sales drop check error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  // Monthly business summary — 1st of month at 9am EAT
  cron.schedule("0 7 1 * *", async () => {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthStr = lastMonth.toLocaleString("en-RW", { month: "long", year: "numeric", timeZone: "Africa/Kigali" });
      const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().slice(0, 10);
      const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [sales, expenses, cogs] = await Promise.all([
        pool.query(
          "SELECT COUNT(*) as tx, COALESCE(SUM(total_amount),0) as revenue FROM sales WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_voided=false",
          [startDate, endDate]
        ),
        pool.query(
          "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date BETWEEN $1 AND $2",
          [startDate, endDate]
        ),
        pool.query(
          `SELECT COALESCE(SUM(si.quantity*stk.cost_price_rwf),0) as v
           FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
           WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.is_voided=false`,
          [startDate, endDate]
        ),
      ]);

      const rev = parseInt(sales.rows[0].revenue);
      const exp = parseInt(expenses.rows[0].total);
      const costOfGoods = parseInt(cogs.rows[0].v);
      const netProfit = rev - costOfGoods - exp;

      await notifyAdminsAndManagers(
        "MONTHLY_SUMMARY",
        `Monthly Summary — ${monthStr}`,
        `Revenue: ${rev.toLocaleString()} RWF | Expenses: ${exp.toLocaleString()} RWF | Net Profit: ${netProfit.toLocaleString()} RWF | Transactions: ${sales.rows[0].tx}`
      );
    } catch (e) {
      console.error("[CRON] Monthly summary error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  // Expense spike check — weekly on Monday 9:30am EAT
  cron.schedule("30 7 * * 1", async () => {
    try {
      const { rows } = await pool.query(`
        SELECT
          SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) THEN amount ELSE 0 END) as this_month,
          SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') THEN amount ELSE 0 END) as last_month
        FROM expenses`
      );
      const thisMonth = parseInt(rows[0].this_month || 0);
      const lastMonth = parseInt(rows[0].last_month || 0);
      if (lastMonth > 0 && thisMonth > lastMonth * 1.5) {
        await notifyAdminsAndManagers(
          "EXPENSE_SPIKE",
          "Expense Spike Alert",
          `Expenses this month (${thisMonth.toLocaleString()} RWF) are ${Math.round((thisMonth / lastMonth - 1) * 100)}% higher than last month.`
        );
      }
    } catch (e) {
      console.error("[CRON] Expense spike check error:", e.message);
    }
  }, { timezone: "Africa/Kigali" });

  console.log("[CRON] Jobs registered: daily summary (8pm), overdue check (midnight), sales drop (Mon), monthly summary (1st), expense spike (Mon)");
}

module.exports = { startCronJobs };
