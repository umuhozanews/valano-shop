const pool = require("../src/config/db");
const fs = require("fs");
const path = require("path");

async function investigate() {
  console.log("=================================================");
  console.log("INVESTIGATING SEED DATA IN PRODUCTION DATABASE");
  console.log("=================================================\n");

  // Query database for the mentioned suppliers
  const { rows: supRows } = await pool.query(
    "SELECT id, name, phone, email, owner_id FROM suppliers WHERE name ILIKE ANY($1)",
    [["%Bralirwa%", "%GATETET%", "%Inyange%", "%Sulfo%"]]
  );
  console.log("Matching suppliers found in DB:", supRows);

  const { rows: allSuppliers } = await pool.query(
    "SELECT id, name, owner_id FROM suppliers ORDER BY id ASC"
  );
  console.log("\nAll suppliers currently in DB:", allSuppliers);

  const { rows: allNullOwners } = await pool.query(
    "SELECT 'suppliers' as table_name, count(*) as null_count FROM suppliers WHERE owner_id IS NULL UNION ALL " +
    "SELECT 'customers', count(*) FROM customers WHERE owner_id IS NULL UNION ALL " +
    "SELECT 'stock_items', count(*) FROM stock_items WHERE owner_id IS NULL UNION ALL " +
    "SELECT 'sales', count(*) FROM sales WHERE owner_id IS NULL"
  );
  console.log("\nRows with owner_id IS NULL in DB:", allNullOwners);

  // Search frontend source code for hardcoded arrays
  console.log("\nSearching frontend codebase for hardcoded dummy data...");
  const frontendDir = path.resolve(__dirname, "../../../databridge-mobile-apk/src");
  
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchDir(fullPath);
      } else if (f.endsWith(".jsx") || f.endsWith(".js")) {
        const content = fs.readFileSync(fullPath, "utf8");
        if (content.includes("Bralirwa") || content.includes("GATETET") || content.includes("Inyange") || content.includes("Sulfo")) {
          console.log(`Found mention in: ${fullPath}`);
        }
      }
    }
  }
  searchDir(frontendDir);
}

investigate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
