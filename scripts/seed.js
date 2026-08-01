/**
 * VALANO SHOP — Seed Script
 * Run: node scripts/seed.js
 * Requires DATABASE_URL in .env
 */
const path = require("path");
const backendModules = path.join(__dirname, "../backend/node_modules");
require(path.join(backendModules, "dotenv")).config({ path: path.join(__dirname, "../backend/.env") });
const { Pool } = require(path.join(backendModules, "pg"));
const bcrypt = require(path.join(backendModules, "bcryptjs"));
const crypto = require("crypto");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const fmt = (n) => parseInt(n);

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Seeding VALANO SHOP database...");

    // Settings
    await client.query(`INSERT INTO settings (shop_name, shop_address, shop_phone, default_low_stock_threshold, default_commission_rate, invoice_footer_text)
      VALUES ('VALANO SHOP','KN 5 Ave, Kigali, Rwanda','+250788000001',5,5.0,'Thank you for your business!')
      ON CONFLICT DO NOTHING`);

    // Branches
    await client.query(`INSERT INTO branches (id, name, location, phone) VALUES
      (1,'Valano Nyabugogo','KN 5 Ave, Nyabugogo, Kigali','+250780001001'),
      (2,'Valano Kimironko','KG 11 Ave, Kimironko, Kigali','+250780001002')
      ON CONFLICT DO NOTHING`);
    await client.query("SELECT setval('branches_id_seq', 2, true)");

    // Users
    const passwords = {
      admin:   await bcrypt.hash("Admin@123", 10),
      manager: await bcrypt.hash("Manager@123", 10),
      worker:  await bcrypt.hash("Worker@123", 10),
    };

    const users = [
      [1,"Admin Valano","admin@valano.rw",passwords.admin,"admin",1,"+250780100001",0,0],
      [2,"Manager Branch 1","manager1@valano.rw",passwords.manager,"manager",1,"+250780100002",3000000,2],
      [3,"Manager Branch 2","manager2@valano.rw",passwords.manager,"manager",2,"+250780100003",3000000,2],
      [4,"Kalisa Jean","worker1@valano.rw",passwords.worker,"worker",1,"+250780100004",1500000,3],
      [5,"Umutoni Alice","worker2@valano.rw",passwords.worker,"worker",1,"+250780100005",1500000,3],
      [6,"Habimana Eric","worker3@valano.rw",passwords.worker,"worker",1,"+250780100006",1200000,3],
      [7,"Mukamana Grace","worker4@valano.rw",passwords.worker,"worker",2,"+250780100007",1500000,3],
      [8,"Niyonzima Paul","worker5@valano.rw",passwords.worker,"worker",2,"+250780100008",1500000,3],
      [9,"Uwimana Sandra","worker6@valano.rw",passwords.worker,"worker",2,"+250780100009",1200000,3],
      [10,"Rukundo joseph","rukundojosephtuyishime@gmail.com",await bcrypt.hash("rukundo2007", 10),"admin",1,"+250780000001",5000000,0],
    ];

    for (const [id,name,email,hash,role,branch,phone,target,comm] of users) {
      await client.query(`INSERT INTO users (id,name,email,password_hash,role,branch_id,phone,monthly_target,commission_rate)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (email) DO NOTHING`,
        [id,name,email,hash,role,branch,phone,target,comm]);
    }
    await client.query("SELECT setval('users_id_seq', 10, true)");
    console.log("✓ Users seeded");

    // Exchange rates
    await client.query(`INSERT INTO exchange_rates (from_currency, to_currency, rate)
      VALUES ('CNY','RWF',195),('USD','RWF',1350),('EUR','RWF',1460)
      ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate=EXCLUDED.rate`);

    // Suppliers
    await client.query(`INSERT INTO suppliers (id,name,wechat,whatsapp,city,specialty) VALUES
      (1,'Guangzhou Fashion Co.','gzfashion2024','+8613811110001','Guangzhou','Jackets, Hoodies, Casual Wear'),
      (2,'Shenzhen Clothing Ltd','szclothe88','+8613811110002','Shenzhen','Formal Shirts, Trousers, Suits'),
      (3,'Yiwu Market Supplier','yiwumarket','+8613811110003','Yiwu','Mixed Clothing, Accessories, Shoes')
      ON CONFLICT DO NOTHING`);
    await client.query("SELECT setval('suppliers_id_seq', 3, true)");

    // Stock items
    const stockItems = [
      // Branch 1 - 15 items
      ["Men Leather Jacket","Jackets","L","Black","VLN001",1,45000,95000,8,3],
      ["Men Denim Jacket","Jackets","M","Blue","VLN002",1,28000,65000,12,5],
      ["Women Blazer","Jackets","S","Beige","VLN003",1,35000,78000,7,5],
      ["Men Slim Shirt","Shirts","M","White","VLN004",1,8000,18000,20,5],
      ["Men Slim Shirt","Shirts","L","Blue","VLN005",1,8000,18000,15,5],
      ["Women Floral Blouse","Shirts","S","Pink","VLN006",1,6000,15000,18,5],
      ["Men Chino Trouser","Trousers","32","Khaki","VLN007",1,12000,28000,14,5],
      ["Men Slim Jeans","Trousers","30","Dark Blue","VLN008",1,15000,32000,22,5],
      ["Women Maxi Dress","Dresses","M","Red","VLN009",1,18000,45000,6,5],
      ["Women Mini Dress","Dresses","S","Black","VLN010",1,14000,35000,9,5],
      ["Men Sneakers","Shoes","42","White","VLN011",1,22000,55000,10,5],
      ["Women Heels","Shoes","38","Black","VLN012",1,20000,48000,4,5],
      ["Men Hoodie","Hoodies","XL","Grey","VLN013",1,18000,42000,16,5],
      ["Women Hoodie","Hoodies","M","Pink","VLN014",1,16000,38000,0,5],
      ["Belt Leather","Accessories","One Size","Brown","VLN015",1,5000,15000,3,3],
      // Branch 2 - 15 items
      ["Men Trench Coat","Jackets","XL","Camel","VLN016",2,52000,120000,5,5],
      ["Men Puffer Jacket","Jackets","L","Black","VLN017",2,38000,85000,8,5],
      ["Women Winter Coat","Jackets","M","Navy","VLN018",2,48000,110000,6,5],
      ["Men Formal Shirt","Shirts","M","White","VLN019",2,10000,22000,12,5],
      ["Men Polo Shirt","Shirts","L","Green","VLN020",2,9000,20000,15,5],
      ["Women Crop Top","Shirts","S","Yellow","VLN021",2,5000,12000,0,5],
      ["Men Cargo Trouser","Trousers","32","Army Green","VLN022",2,14000,30000,11,5],
      ["Women Leggings","Trousers","M","Black","VLN023",2,8000,20000,20,5],
      ["Women Evening Dress","Dresses","M","Gold","VLN024",2,35000,85000,4,5],
      ["Women Casual Dress","Dresses","L","Floral","VLN025",2,16000,38000,8,5],
      ["Men Boots","Shoes","43","Brown","VLN026",2,35000,80000,6,5],
      ["Women Flats","Shoes","37","Nude","VLN027",2,15000,35000,10,5],
      ["Men Zip Hoodie","Hoodies","XL","Black","VLN028",2,20000,45000,3,5],
      ["Scarf Silk","Accessories","One Size","Multi","VLN029",2,4000,12000,2,5],
      ["Sunglasses","Accessories","One Size","Black","VLN030",2,6000,18000,0,5],
    ];

    for (let i = 0; i < stockItems.length; i++) {
      const [name,cat,size,color,barcode,branch,cost,sell,qty,threshold] = stockItems[i];
      await client.query(`INSERT INTO stock_items (id,name,category,size,color,barcode,branch_id,quantity,cost_price_rwf,sell_price_rwf,low_stock_threshold)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (barcode) DO NOTHING`,
        [i+1,name,cat,size,color,barcode,branch,qty,cost,sell,threshold]);
    }
    await client.query("SELECT setval('stock_items_id_seq', 30, true)");
    console.log("✓ Stock items seeded");

    // Customers
    const customers = [
      [1,"Amani Boutique","+250788200001","Musanze","wholesaler","vip"],
      [2,"Grace Fashion House","+250788200002","Huye","wholesaler","vip"],
      [3,"Kigali Dress Corner","+250788200003","Kigali City","wholesaler","vip"],
      [4,"Ishimwe Pierre","+250788200004","Kigali","retailer","regular"],
      [5,"Mukamana Joelle","+250788200005","Gasabo","retailer","regular"],
      [6,"Nshimiye Robert","+250788200006","Kicukiro","retailer","regular"],
      [7,"Umutesi Sandra","+250788200007","Nyarugenge","retailer","regular"],
      [8,"Habimana Fashion","+250788200008","Rwamagana","wholesaler","regular"],
      [9,"Keza Clothing","+250788200009","Rubavu","wholesaler","regular"],
      [10,"Manzi Claude","+250788200010","Kigali","retailer","new"],
      [11,"Ineza Boutique","+250788200011","Nyamata","wholesaler","new"],
      [12,"Nyirahabimana","+250788200012","Kibungo","retailer","new"],
      [13,"Walk-in Customer",null,"Kigali","retailer","new"],
      [14,"Kamanzi Victor","+250788200014","Kigali","retailer","new"],
      [15,"Mutoni Esperance","+250788200015","Gisenyi","wholesaler","regular"],
    ];

    for (const [id,name,phone,loc,type,seg] of customers) {
      await client.query(`INSERT INTO customers (id,name,phone,location,type,segment) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [id,name,phone,loc,type,seg]);
    }
    await client.query("SELECT setval('customers_id_seq', 15, true)");
    console.log("✓ Customers seeded");

    // Procurement orders
    const now = new Date();
    const d = (days) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + days);
      return dt.toISOString().slice(0, 10);
    };

    await client.query(`INSERT INTO procurement_orders (id,supplier_id,order_date,arrival_date,status,currency,exchange_rate,shipping_cost,customs_cost,created_by) VALUES
      (1,1,'${d(-60)}','${d(-45)}','stocked','CNY',193,450000,120000,1),
      (2,2,'${d(-35)}','${d(-20)}','stocked','CNY',194,380000,95000,1),
      (3,1,'${d(-10)}','${d(5)}','in_transit','CNY',195,400000,100000,2),
      (4,3,'${d(-3)}',null,'ordered','CNY',195,350000,85000,2)
      ON CONFLICT DO NOTHING`);
    await client.query("SELECT setval('procurement_orders_id_seq', 4, true)");

    await client.query(`INSERT INTO procurement_items (order_id,item_name,category,size,color,quantity,unit_cost,currency) VALUES
      (1,'Leather Jacket','Jackets','L','Black',20,150,'CNY'),
      (1,'Denim Jacket','Jackets','M','Blue',30,90,'CNY'),
      (1,'Slim Shirt','Shirts','M','White',50,25,'CNY'),
      (2,'Formal Shirt','Shirts','M','White',40,30,'CNY'),
      (2,'Chino Trouser','Trousers','32','Khaki',35,38,'CNY'),
      (2,'Puffer Jacket','Jackets','L','Black',25,120,'CNY'),
      (3,'Winter Coat','Jackets','M','Navy',30,160,'CNY'),
      (3,'Hoodie','Hoodies','XL','Grey',40,55,'CNY'),
      (4,'Maxi Dress','Dresses','M','Red',25,55,'CNY'),
      (4,'Mini Dress','Dresses','S','Black',30,45,'CNY'),
      (4,'Sneakers','Shoes','42','White',20,65,'CNY')
      ON CONFLICT DO NOTHING`);
    console.log("✓ Procurement seeded");

    // Generate 60 sales spread over 30 days
    const payments = ["cash", "mtn_momo", "airtel"];
    const workers = [[4,1],[5,1],[6,1],[7,2],[8,2],[9,2]];
    const custIds = [1,2,3,4,5,6,7,8,13,14,15];
    const stockB1 = [1,2,3,4,5,6,7,8,9,10,11,13];
    const stockB2 = [16,17,18,19,20,22,23,24,25,26,27,28];

    let saleId = 1, saleItemId = 1, invoiceId = 1;
    const saleInserts = [];
    const saleItemInserts = [];
    const invoiceInserts = [];

    for (let i = 0; i < 60; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const dt = new Date(now);
      dt.setDate(dt.getDate() - daysAgo);
      const dateStr = dt.toISOString().replace("T", " ").slice(0, 19);

      const [wid, bid] = workers[Math.floor(Math.random() * workers.length)];
      const custId = custIds[Math.floor(Math.random() * custIds.length)];
      const payment = payments[Math.floor(Math.random() * payments.length)];
      const itemPool = bid === 1 ? stockB1 : stockB2;

      // 1-3 items per sale
      const numItems = Math.floor(Math.random() * 3) + 1;
      let total = 0;
      const saleItems = [];

      for (let j = 0; j < numItems; j++) {
        const stockId = itemPool[Math.floor(Math.random() * itemPool.length)];
        const item = stockItems[stockId - 1];
        const [,,,,,,cost, sell,,] = item;
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = sell;
        const sub = qty * price;
        total += sub;
        saleItems.push([stockId, qty, price, sub]);
      }

      saleInserts.push(`(${saleId},${wid},${bid},${custId},'${payment}',${total},false,'${dateStr}')`);
      for (const [sid, qty, price, sub] of saleItems) {
        saleItemInserts.push(`(${saleItemId++},${saleId},${sid},${qty},${price},${sub})`);
      }

      const invNum = `VLN-${dt.getFullYear().toString().slice(2)}${String(dt.getMonth()+1).padStart(2,"0")}-${1000+saleId}`;
      invoiceInserts.push(`(${invoiceId++},${saleId},'${invNum}','paid','${dateStr}')`);
      saleId++;
    }

    await client.query(`INSERT INTO sales (id,worker_id,branch_id,customer_id,payment_method,total_amount,is_voided,created_at) VALUES
      ${saleInserts.join(",\n      ")} ON CONFLICT DO NOTHING`);
    await client.query("SELECT setval('sales_id_seq', 60, true)");

    await client.query(`INSERT INTO sale_items (id,sale_id,stock_item_id,quantity,unit_price,subtotal) VALUES
      ${saleItemInserts.join(",\n      ")} ON CONFLICT DO NOTHING`);
    await client.query(`SELECT setval('sale_items_id_seq', ${saleItemId - 1}, true)`);

    await client.query(`INSERT INTO invoices (id,sale_id,invoice_number,status,issued_at) VALUES
      ${invoiceInserts.join(",\n      ")} ON CONFLICT DO NOTHING`);
    await client.query(`SELECT setval('invoices_id_seq', ${invoiceId - 1}, true)`);
    console.log("✓ 60 sales + invoices seeded");

    // Expenses (20 across 3 months)
    const expCats = ["Rent","Utilities","Transport","Packaging","Marketing","Other"];
    const expData = [
      [1,"Rent",800000,"Monthly rent - Nyabugogo",1,1,d(-62)],
      [2,"Rent",600000,"Monthly rent - Kimironko",2,1,d(-62)],
      [3,"Utilities",85000,"Electricity - Branch 1",1,1,d(-58)],
      [4,"Utilities",70000,"Electricity - Branch 2",2,1,d(-58)],
      [5,"Transport",150000,"Goods transport from airport",1,1,d(-55)],
      [6,"Packaging",45000,"Bags and boxes",1,4,d(-50)],
      [7,"Marketing",200000,"Social media promotion",1,1,d(-45)],
      [8,"Other",60000,"Miscellaneous",2,3,d(-42)],
      [9,"Rent",800000,"Monthly rent - Nyabugogo",1,1,d(-32)],
      [10,"Rent",600000,"Monthly rent - Kimironko",2,1,d(-32)],
      [11,"Utilities",90000,"Electricity - Branch 1",1,1,d(-28)],
      [12,"Utilities",75000,"Electricity - Branch 2",2,1,d(-28)],
      [13,"Transport",180000,"Airport to warehouse",1,1,d(-25)],
      [14,"Packaging",50000,"Premium bags",1,4,d(-20)],
      [15,"Marketing",250000,"Instagram ads",1,1,d(-15)],
      [16,"Other",35000,"Cleaning supplies",2,7,d(-12)],
      [17,"Rent",800000,"Monthly rent - Nyabugogo",1,1,d(-2)],
      [18,"Rent",600000,"Monthly rent - Kimironko",2,1,d(-2)],
      [19,"Utilities",88000,"Electricity - Branch 1",1,1,d(-1)],
      [20,"Transport",130000,"Local delivery",2,8,d(-1)],
    ];

    for (const [id,cat,amt,desc,branch,recorder,date] of expData) {
      await client.query(`INSERT INTO expenses (id,category,amount,description,branch_id,recorded_by,expense_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [id,cat,amt,desc,branch,recorder,date]);
    }
    await client.query("SELECT setval('expenses_id_seq', 20, true)");
    console.log("✓ Expenses seeded");

    // Notifications
    await client.query(`INSERT INTO notifications (user_id,type,title,message) VALUES
      (1,'LOW_STOCK','Low Stock Alert','Men Hoodie (Grey) has only 3 units remaining at Valano Nyabugogo'),
      (1,'LOW_STOCK','Low Stock Alert','Belt Leather has only 3 units remaining at Valano Nyabugogo'),
      (1,'OUT_OF_STOCK','Out of Stock','Women Hoodie (Pink) is out of stock at Valano Nyabugogo'),
      (1,'DAILY_SUMMARY','Daily Summary','Yesterday: 3 sales, 182,000 RWF. Low stock: 4 items need restocking.'),
      (2,'PROCUREMENT_ARRIVED','Order Arrived','Procurement order #2 has arrived and is ready for stocking')
      ON CONFLICT DO NOTHING`);

    await client.query("COMMIT");
    console.log("\n✅ VALANO SHOP seeded successfully!\n");
    console.log("Login credentials:");
    console.log("  Admin:   admin@valano.rw   / Admin@123");
    console.log("  Manager: manager1@valano.rw / Manager@123");
    console.log("  Worker:  worker1@valano.rw  / Worker@123");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
