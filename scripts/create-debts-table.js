const pool = require("../backend/src/config/db");

async function main() {
  try {
    console.log("Creating debts table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id          SERIAL PRIMARY KEY,
        person_name VARCHAR(100) NOT NULL,
        amount      BIGINT NOT NULL,
        type        VARCHAR(20) NOT NULL CHECK (type IN ('receivable', 'payable')),
        status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
        due_date    DATE,
        notes       TEXT,
        branch_id   INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("debts table created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error creating table:", err);
    process.exit(1);
  }
}

main();
