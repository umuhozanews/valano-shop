const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { ensureJournalTables } = require("../utils/journal");
const { createReportPDF } = require("../utils/pdf");
const { exportToExcel } = require("../utils/excel");

router.use(verifyToken, requireRole("admin", "sme_owner", "accountant", "pulse_admin"));

function dateFilter(params, conds, { start_date, end_date, col = "je.entry_date" }) {
  if (start_date) { params.push(start_date); conds.push(`${col} >= $${params.length}`); }
  if (end_date)   { params.push(end_date);   conds.push(`${col} <= $${params.length}`); }
}

function ownerFilter(params, conds, ownerId, alias = "je") {
  if (ownerId != null) { params.push(ownerId); conds.push(`${alias}.owner_id = $${params.length}`); }
}

// ── Chart of Accounts ─────────────────────────────────────────────────────────
router.get("/accounts", async (req, res, next) => {
  try {
    await ensureJournalTables();
    const { rows } = await pool.query(
      "SELECT * FROM chart_of_accounts WHERE is_active=true ORDER BY code"
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Journal Entries ────────────────────────────────────────────────────────────
router.get("/journal", async (req, res, next) => {
  try {
    await ensureJournalTables();
    const { start_date, end_date, page = 1, limit = 50, export: exp } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conds = ["1=1"]; const params = [];
    dateFilter(params, conds, { start_date, end_date });
    ownerFilter(params, conds, req.ownerId);
    const where = conds.join(" AND ");

    const [entriesRes, countRes, settingsRes] = await Promise.all([
      pool.query(
        `SELECT je.*, u.name as created_by_name
         FROM journal_entries je
         LEFT JOIN users u ON u.id = je.created_by
         WHERE ${where}
         ORDER BY je.entry_date DESC, je.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM journal_entries je WHERE ${where}`, params),
      pool.query("SELECT settings FROM sme_settings LIMIT 1").catch(() => ({ rows: [] })),
    ]);

    const shopName = settingsRes.rows[0]?.settings?.shop_name;

    const entryIds = entriesRes.rows.map(e => e.id);
    let lines = [];
    if (entryIds.length) {
      const linesRes = await pool.query(
        `SELECT jl.*, coa.code, coa.name as account_name, coa.type as account_type
         FROM journal_lines jl
         JOIN chart_of_accounts coa ON coa.id = jl.account_id
         WHERE jl.entry_id = ANY($1::int[])
         ORDER BY jl.entry_id, jl.id`,
        [entryIds]
      );
      lines = linesRes.rows;
    }

    const entries = entriesRes.rows.map(e => ({
      ...e,
      lines: lines.filter(l => l.entry_id === e.id),
    }));

    if (exp === "pdf") {
      const rows = [];
      for (const e of entries) {
        for (const l of e.lines) {
          rows.push([
            e.entry_date, e.description,
            `${l.code} ${l.account_name}`,
            l.debit > 0 ? parseInt(l.debit).toLocaleString() : "",
            l.credit > 0 ? parseInt(l.credit).toLocaleString() : "",
          ]);
        }
      }
      return createReportPDF(res, {
        shopName, title: "General Journal",
        dateRange: start_date && end_date ? `${start_date} – ${end_date}` : undefined,
        columns: ["Date", "Description", "Account", "Debit (RWF)", "Credit (RWF)"],
        rows,
      });
    }

    if (exp === "excel") {
      const rows = [];
      for (const e of entries) {
        for (const l of e.lines) {
          rows.push([e.entry_date, e.description, `${l.code} ${l.account_name}`, l.debit || "", l.credit || ""]);
        }
      }
      return exportToExcel(res, [{ name: "Journal", headers: ["Date","Description","Account","Debit","Credit"], rows }], { shopName });
    }

    res.json({ data: entries, total: parseInt(countRes.rows[0].count) });
  } catch (err) { next(err); }
});

// ── General Ledger (by account) ───────────────────────────────────────────────
router.get("/ledger", async (req, res, next) => {
  try {
    await ensureJournalTables();
    const { account_id, start_date, end_date, export: exp } = req.query;

    const [accountsRes, settingsRes] = await Promise.all([
      pool.query("SELECT * FROM chart_of_accounts WHERE is_active=true ORDER BY code"),
      pool.query("SELECT settings FROM sme_settings LIMIT 1").catch(() => ({ rows: [] })),
    ]);
    const shopName = settingsRes.rows[0]?.settings?.shop_name;

    if (!account_id) {
      return res.json({ accounts: accountsRes.rows, ledger: [] });
    }

    const conds = ["jl.account_id = $1"]; const params = [account_id];
    dateFilter(params, conds, { start_date, end_date });
    ownerFilter(params, conds, req.ownerId);

    const { rows: ledger } = await pool.query(
      `SELECT je.entry_date, je.description, je.reference_type, je.reference_id,
              jl.debit, jl.credit,
              SUM(jl.debit - jl.credit) OVER (ORDER BY je.entry_date, je.id) as running_balance
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       WHERE ${conds.join(" AND ")}
       ORDER BY je.entry_date, je.id`,
      params
    );

    const account = accountsRes.rows.find(a => String(a.id) === String(account_id));

    if (exp === "pdf") {
      return createReportPDF(res, {
        shopName,
        title: `Ledger: ${account?.code} ${account?.name}`,
        dateRange: start_date && end_date ? `${start_date} – ${end_date}` : undefined,
        columns: ["Date", "Description", "Debit (RWF)", "Credit (RWF)", "Balance (RWF)"],
        rows: ledger.map(r => [
          r.entry_date, r.description,
          r.debit > 0 ? parseInt(r.debit).toLocaleString() : "",
          r.credit > 0 ? parseInt(r.credit).toLocaleString() : "",
          parseInt(r.running_balance).toLocaleString(),
        ]),
      });
    }

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: account?.name || "Ledger",
        headers: ["Date","Description","Debit","Credit","Balance"],
        rows: ledger.map(r => [r.entry_date, r.description, r.debit, r.credit, r.running_balance]),
      }], { shopName });
    }

    res.json({ account, accounts: accountsRes.rows, ledger });
  } catch (err) { next(err); }
});

// ── Cash Book ─────────────────────────────────────────────────────────────────
router.get("/cashbook", async (req, res, next) => {
  try {
    await ensureJournalTables();
    const { start_date, end_date, export: exp } = req.query;

    const settingsRes = await pool.query("SELECT settings FROM sme_settings LIMIT 1").catch(() => ({ rows: [] }));
    const shopName = settingsRes.rows[0]?.settings?.shop_name;

    const conds = ["coa.code IN ('1000','1010')"]; const params = [];
    dateFilter(params, conds, { start_date, end_date });
    ownerFilter(params, conds, req.ownerId);

    const { rows: cashbook } = await pool.query(
      `SELECT je.entry_date, je.description, je.reference_type,
              coa.code as account_code, coa.name as account_name,
              jl.debit as money_in, jl.credit as money_out,
              SUM(jl.debit - jl.credit) OVER (
                PARTITION BY coa.code ORDER BY je.entry_date, je.id
              ) as running_balance
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE ${conds.join(" AND ")}
       ORDER BY je.entry_date, je.id`,
      params
    );

    // Summary totals — same owner filter
    const totalsConds = ["coa.code IN ('1000','1010')"]; const totalsParams = [];
    dateFilter(totalsParams, totalsConds, { start_date, end_date });
    ownerFilter(totalsParams, totalsConds, req.ownerId);

    const totalsRes = await pool.query(
      `SELECT coa.code, coa.name,
              COALESCE(SUM(jl.debit),0) as total_in,
              COALESCE(SUM(jl.credit),0) as total_out,
              COALESCE(SUM(jl.debit - jl.credit),0) as net
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE ${totalsConds.join(" AND ")}
       GROUP BY coa.code, coa.name ORDER BY coa.code`,
      totalsParams
    );

    if (exp === "pdf") {
      return createReportPDF(res, {
        shopName, title: "Cash Book",
        dateRange: start_date && end_date ? `${start_date} – ${end_date}` : undefined,
        columns: ["Date", "Description", "Account", "Money In (RWF)", "Money Out (RWF)", "Balance (RWF)"],
        rows: cashbook.map(r => [
          r.entry_date, r.description, r.account_name,
          r.money_in > 0 ? parseInt(r.money_in).toLocaleString() : "",
          r.money_out > 0 ? parseInt(r.money_out).toLocaleString() : "",
          parseInt(r.running_balance).toLocaleString(),
        ]),
      });
    }

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "Cash Book",
        headers: ["Date","Description","Account","Money In","Money Out","Balance"],
        rows: cashbook.map(r => [r.entry_date, r.description, r.account_name, r.money_in, r.money_out, r.running_balance]),
      }], { shopName });
    }

    res.json({ cashbook, totals: totalsRes.rows });
  } catch (err) { next(err); }
});

// ── Trial Balance ─────────────────────────────────────────────────────────────
router.get("/trial-balance", async (req, res, next) => {
  try {
    await ensureJournalTables();
    const { as_of_date, export: exp } = req.query;

    const settingsRes = await pool.query("SELECT settings FROM sme_settings LIMIT 1").catch(() => ({ rows: [] }));
    const shopName = settingsRes.rows[0]?.settings?.shop_name;

    // Build filtered journal_lines subquery scoped to this owner
    const subConds = ["1=1"]; const subParams = [];
    if (req.ownerId != null) { subParams.push(req.ownerId); subConds.push(`je.owner_id = $${subParams.length}`); }
    if (as_of_date)          { subParams.push(as_of_date);  subConds.push(`je.entry_date <= $${subParams.length}`); }
    const subWhere = subConds.join(" AND ");

    const { rows } = await pool.query(
      `SELECT coa.code, coa.name, coa.type, coa.sub_type,
              COALESCE(SUM(filtered.debit), 0)  as total_debit,
              COALESCE(SUM(filtered.credit), 0) as total_credit,
              COALESCE(SUM(filtered.debit - filtered.credit), 0) as net
       FROM chart_of_accounts coa
       LEFT JOIN (
         SELECT jl.account_id, jl.debit, jl.credit
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.entry_id
         WHERE ${subWhere}
       ) filtered ON filtered.account_id = coa.id
       WHERE coa.is_active = true
       GROUP BY coa.id, coa.code, coa.name, coa.type, coa.sub_type
       HAVING COALESCE(SUM(filtered.debit), 0) > 0 OR COALESCE(SUM(filtered.credit), 0) > 0
       ORDER BY coa.code`,
      subParams
    );

    const grandDebit  = rows.reduce((s, r) => s + parseFloat(r.total_debit), 0);
    const grandCredit = rows.reduce((s, r) => s + parseFloat(r.total_credit), 0);

    if (exp === "pdf") {
      return createReportPDF(res, {
        shopName, title: "Trial Balance",
        dateRange: as_of_date ? `As of ${as_of_date}` : "All periods",
        columns: ["Code", "Account", "Type", "Debit (RWF)", "Credit (RWF)"],
        rows: rows.map(r => [
          r.code, r.name, r.type,
          parseInt(r.total_debit).toLocaleString(),
          parseInt(r.total_credit).toLocaleString(),
        ]),
        totalsRow: ["", "GRAND TOTAL", "", parseInt(grandDebit).toLocaleString(), parseInt(grandCredit).toLocaleString()],
      });
    }

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "Trial Balance",
        headers: ["Code","Account","Type","Sub-type","Debit","Credit","Net"],
        rows: rows.map(r => [r.code, r.name, r.type, r.sub_type, r.total_debit, r.total_credit, r.net]),
        totals: ["", "TOTAL", "", "", grandDebit, grandCredit, grandDebit - grandCredit],
      }], { shopName });
    }

    res.json({ rows, grandDebit, grandCredit, balanced: Math.abs(grandDebit - grandCredit) < 0.01 });
  } catch (err) { next(err); }
});

module.exports = router;
