const pool = require("../config/db");

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash",                    type: "Asset",     sub: "Current Asset" },
  { code: "1010", name: "Mobile Money / Bank",     type: "Asset",     sub: "Current Asset" },
  { code: "1100", name: "Accounts Receivable",     type: "Asset",     sub: "Current Asset" },
  { code: "1200", name: "Inventory / Stock",       type: "Asset",     sub: "Current Asset" },
  { code: "1500", name: "Other Assets",            type: "Asset",     sub: "Non-current Asset" },
  { code: "2000", name: "Accounts Payable",        type: "Liability", sub: "Current Liability" },
  { code: "2100", name: "Loans Payable",           type: "Liability", sub: "Current Liability" },
  { code: "2200", name: "Other Liabilities",       type: "Liability", sub: "Current Liability" },
  { code: "3000", name: "Owner's Equity",          type: "Equity",    sub: "Equity" },
  { code: "3100", name: "Retained Earnings",       type: "Equity",    sub: "Equity" },
  { code: "4000", name: "Sales Revenue",           type: "Revenue",   sub: "Operating Revenue" },
  { code: "4100", name: "Other Income",            type: "Revenue",   sub: "Other Revenue" },
  { code: "5000", name: "Cost of Goods Sold",      type: "Expense",   sub: "COGS" },
  { code: "6000", name: "General Expenses",        type: "Expense",   sub: "Operating Expense" },
  { code: "6001", name: "Rent",                    type: "Expense",   sub: "Operating Expense" },
  { code: "6002", name: "Utilities",               type: "Expense",   sub: "Operating Expense" },
  { code: "6003", name: "Salaries",                type: "Expense",   sub: "Operating Expense" },
  { code: "6004", name: "Transport",               type: "Expense",   sub: "Operating Expense" },
  { code: "6005", name: "Marketing",               type: "Expense",   sub: "Operating Expense" },
  { code: "6006", name: "Maintenance",             type: "Expense",   sub: "Operating Expense" },
  { code: "6007", name: "Loan Repayment",          type: "Expense",   sub: "Finance Expense" },
  { code: "6008", name: "Supplies",                type: "Expense",   sub: "Operating Expense" },
];

const EXPENSE_CATEGORY_MAP = {
  "Rent": "6001", "Utilities": "6002", "Salaries": "6003",
  "Transport": "6004", "Marketing": "6005", "Maintenance": "6006",
  "Loan Repayment": "6007", "Supplies": "6008",
};

const PAYMENT_ACCOUNT_MAP = {
  cash: "1000",
  mtn_momo: "1010", airtel: "1010",
  card: "1010", bank_transfer: "1010",
  credit: "1100",
};

let _initialized = false;

async function ensureJournalTables() {
  if (_initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      sub_type VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      description TEXT NOT NULL,
      reference_type VARCHAR(50),
      reference_id INTEGER,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id SERIAL PRIMARY KEY,
      entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
      debit NUMERIC(15,2) DEFAULT 0,
      credit NUMERIC(15,2) DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries(reference_type, reference_id);
  `);

  // Seed default accounts
  for (const acc of DEFAULT_ACCOUNTS) {
    await pool.query(
      `INSERT INTO chart_of_accounts (code, name, type, sub_type)
       VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`,
      [acc.code, acc.name, acc.type, acc.sub]
    );
  }
  _initialized = true;
}

async function getAccountId(code) {
  const { rows } = await pool.query("SELECT id FROM chart_of_accounts WHERE code=$1", [code]);
  return rows[0]?.id || null;
}

async function createJournalEntry({ date, description, referenceType, referenceId, lines, createdBy }) {
  await ensureJournalTables();

  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry unbalanced: DR ${totalDebit} vs CR ${totalCredit}`);
  }

  const { rows: [entry] } = await pool.query(
    `INSERT INTO journal_entries (entry_date, description, reference_type, reference_id, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [date || new Date(), description, referenceType || null, referenceId || null, createdBy || null]
  );

  for (const line of lines) {
    const accId = typeof line.accountCode === "string"
      ? await getAccountId(line.accountCode)
      : line.accountId;
    if (!accId) continue;
    await pool.query(
      `INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES ($1,$2,$3,$4)`,
      [entry.id, accId, parseFloat(line.debit) || 0, parseFloat(line.credit) || 0]
    );
  }

  return entry;
}

async function journalForSale({ saleId, total, amountPaid, paymentMethod, invoiceNumber, createdBy, saleDate }) {
  try {
    await ensureJournalTables();
    const paid     = parseFloat(amountPaid) || total;
    const unpaid   = total - paid;
    const cashCode = PAYMENT_ACCOUNT_MAP[paymentMethod] || "1000";

    const lines = [];

    if (paid > 0) {
      lines.push({ accountCode: cashCode, debit: paid, credit: 0 });
    }
    if (unpaid > 0.01) {
      lines.push({ accountCode: "1100", debit: unpaid, credit: 0 });
    }
    lines.push({ accountCode: "4000", debit: 0, credit: total });

    await createJournalEntry({
      date: saleDate || new Date(),
      description: `Sale ${invoiceNumber || `#${saleId}`} — ${(paymentMethod || "cash").replace(/_/g, " ")}`,
      referenceType: "sale",
      referenceId: saleId,
      lines,
      createdBy,
    });
  } catch (e) {
    console.error("[Journal] sale entry failed:", e.message);
  }
}

async function journalForExpense({ expenseId, amount, category, description, createdBy, expenseDate }) {
  try {
    await ensureJournalTables();
    const expCode = EXPENSE_CATEGORY_MAP[category] || "6000";
    await createJournalEntry({
      date: expenseDate || new Date(),
      description: `Expense: ${description || category}`,
      referenceType: "expense",
      referenceId: expenseId,
      lines: [
        { accountCode: expCode, debit: parseFloat(amount), credit: 0 },
        { accountCode: "1000", debit: 0, credit: parseFloat(amount) },
      ],
      createdBy,
    });
  } catch (e) {
    console.error("[Journal] expense entry failed:", e.message);
  }
}

async function journalForSaleVoid({ saleId, total, paymentMethod, amountPaid, invoiceNumber, createdBy }) {
  try {
    await ensureJournalTables();
    const paid   = parseFloat(amountPaid) || total;
    const unpaid = total - paid;
    const cashCode = PAYMENT_ACCOUNT_MAP[paymentMethod] || "1000";

    const lines = [];
    lines.push({ accountCode: "4000", debit: total, credit: 0 });
    if (paid > 0) lines.push({ accountCode: cashCode, debit: 0, credit: paid });
    if (unpaid > 0.01) lines.push({ accountCode: "1100", debit: 0, credit: unpaid });

    await createJournalEntry({
      date: new Date(),
      description: `VOID: Sale ${invoiceNumber || `#${saleId}`}`,
      referenceType: "sale_void",
      referenceId: saleId,
      lines,
      createdBy,
    });
  } catch (e) {
    console.error("[Journal] void entry failed:", e.message);
  }
}

module.exports = {
  ensureJournalTables,
  createJournalEntry,
  journalForSale,
  journalForExpense,
  journalForSaleVoid,
  DEFAULT_ACCOUNTS,
};
