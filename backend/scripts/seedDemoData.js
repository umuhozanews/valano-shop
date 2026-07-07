/**
 * Seeds realistic demo data for demo@inzira.rw (user_id=3)
 * Run once: node scripts/seedDemoData.js
 */
const pool = require("../src/config/db");

const USER_ID  = 3;
const STOCK    = [
  { id: 1, cost: 1200, sell: 1500, name: "Sugar 1kg" },
  { id: 2, cost: 2200, sell: 2800, name: "Cooking Oil 1L" },
  { id: 3, cost:  400, sell:  600, name: "Soap Bar" },
  { id: 4, cost:  900, sell: 1200, name: "Rice 1kg" },
];
const CUSTOMERS = [1, 2, 3];
const PAYMENT_METHODS = ["cash","cash","cash","mtn_momo","airtel","card"]; // weighted toward digital
const EXPENSE_CATS = ["Rent","Utilities","Salaries","Transport","Supplies"];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rnd(7, 20), rnd(0, 59), 0, 0);
  return d.toISOString();
}

function expenseDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  console.log("Seeding demo data for user_id=3...");

  // 1. Backdate account to 7 months ago + set consent
  await pool.query(
    "UPDATE users SET created_at=NOW()-INTERVAL '7 months', consent_status='consented' WHERE id=$1",
    [USER_ID]
  );
  console.log("✓ User account backdated 7 months, consent set to consented");

  // 2. Clear existing demo sales/expenses
  await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id=$1)", [USER_ID]);
  await pool.query("DELETE FROM sales WHERE user_id=$1", [USER_ID]);
  await pool.query("DELETE FROM expenses WHERE recorded_by=$1", [USER_ID]);
  console.log("✓ Cleared old demo data");

  // 3. Seed 90 days of sales
  // Revenue trend: day 90-61 ≈ 8k/day, day 60-31 ≈ 11k/day, day 30-1 ≈ 15k/day
  let saleCount = 0;
  for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
    // Skip ~10% of days (closed shop)
    if (Math.random() < 0.09) continue;

    const baseRevenue = dayOffset > 60 ? rnd(5000, 11000)
                      : dayOffset > 30 ? rnd(8000, 14000)
                      :                  rnd(12000, 20000);

    // 2–5 transactions per day
    const txCount = rnd(2, 5);
    for (let t = 0; t < txCount; t++) {
      const items = [];
      let total = 0;
      const numItems = rnd(1, 3);
      for (let i = 0; i < numItems; i++) {
        const stock = pick(STOCK);
        const qty   = rnd(1, 5);
        const price = stock.sell;
        const sub   = qty * price;
        items.push({ stock_id: stock.id, qty, price, sub });
        total += sub;
      }

      const method = pick(PAYMENT_METHODS);
      const ts     = daysAgo(dayOffset - (t * 0.01));

      const { rows: [sale] } = await pool.query(
        `INSERT INTO sales (user_id, customer_id, payment_method, total_amount, is_voided, created_at)
         VALUES ($1,$2,$3,$4,false,$5) RETURNING id`,
        [USER_ID, pick(CUSTOMERS), method, total, ts]
      );

      for (const item of items) {
        await pool.query(
          `INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5)`,
          [sale.id, item.stock_id, item.qty, item.price, item.sub]
        );
      }
      saleCount++;
    }
  }
  console.log(`✓ Created ${saleCount} sales over 90 days`);

  // 4. Seed 3 months of expenses
  const expenseSchedule = [
    // Recurring monthly items
    { cat: "Rent",      amount: 80000, dayOfMonth: 1  },
    { cat: "Utilities", amount: 15000, dayOfMonth: 5  },
    { cat: "Salaries",  amount: 60000, dayOfMonth: 28 },
  ];

  let expCount = 0;
  for (let monthBack = 2; monthBack >= 0; monthBack--) {
    for (const exp of expenseSchedule) {
      const dOffset = monthBack * 30 + (30 - exp.dayOfMonth);
      const jitter  = rnd(-2000, 2000);
      await pool.query(
        `INSERT INTO expenses (category, amount, description, recorded_by, expense_date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          exp.cat,
          exp.amount + jitter,
          `${exp.cat} - ${monthBack === 0 ? "this" : monthBack === 1 ? "last" : "2 months ago"} month`,
          USER_ID,
          expenseDate(dOffset),
          daysAgo(dOffset),
        ]
      );
      expCount++;
    }
    // Random additional expenses
    for (let r = 0; r < rnd(3, 5); r++) {
      const dOffset = monthBack * 30 + rnd(1, 28);
      await pool.query(
        `INSERT INTO expenses (category, amount, description, recorded_by, expense_date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          pick(["Transport","Supplies","Maintenance"]),
          rnd(2000, 12000),
          "Operational expense",
          USER_ID,
          expenseDate(dOffset),
          daysAgo(dOffset),
        ]
      );
      expCount++;
    }
  }
  console.log(`✓ Created ${expCount} expense records over 3 months`);

  // 5. Ensure stock items have healthy quantities
  await pool.query("UPDATE stock_items SET quantity=GREATEST(quantity,20) WHERE is_active=true");
  console.log("✓ Stock quantities ensured");

  // 6. Trigger score recalculation via the scoring engine
  const { calculateScore } = require("../src/utils/scoring");
  const result = await calculateScore(USER_ID);
  console.log(`\n✓ Score calculated: ${result.score}/100 (${result.band})`);

  // Save to credit_scores
  await pool.query(
    `INSERT INTO credit_scores (user_id, score, band, model_version, calculated_at, advisory_token)
     VALUES ($1,$2,$3,$4,NOW(),$5)
     ON CONFLICT (user_id) DO UPDATE
       SET score=$2, band=$3, model_version=$4, calculated_at=NOW(), advisory_token=$5`,
    [USER_ID, result.score, result.band, result.model_version, result.advisoryToken]
  );

  // Save to health_score_log
  await pool.query(
    `INSERT INTO health_score_log (user_id, score, band, factors, recommendations, advisory_token, model_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [USER_ID, result.score, result.band, JSON.stringify(result.factors), JSON.stringify(result.recommendations), result.advisoryToken, result.model_version]
  );

  console.log("\n✅ Demo data seeded successfully!");
  console.log(`   Score: ${result.score}/100 (${result.band?.toUpperCase()})`);
  if (result.factors?.hardFlags?.length) {
    console.log("   Hard rule flags:", result.factors.hardFlags);
  }

  await pool.end();
}

seed().catch(err => { console.error("Seed failed:", err.message); process.exit(1); });
