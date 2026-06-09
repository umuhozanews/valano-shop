// In-memory stateful mock API — all mutations persist for the session
const delay = (ms = 70) => new Promise(r => setTimeout(r, ms));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRANCHES = [
  { id: 1, name: "Nyabugogo" },
  { id: 2, name: "Kimironko" },
];

const branchName = (id) => BRANCHES.find(b => b.id === parseInt(id))?.name || "—";
const nextId = (arr) => Math.max(0, ...arr.map(x => x.id)) + 1;
const nowIso = () => new Date().toISOString();
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

function computeStatus(quantity, threshold) {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
}

function computeMargin(cost, sell) {
  if (!cost || !sell) return 0;
  return Math.round(((sell - cost) / cost) * 100);
}

// ─── Mutable data stores ──────────────────────────────────────────────────────

let WORKERS = [
  { id:1, name:"Jean Pierre Habimana", email:"jp@valano.rw",    phone:"0788112233", role:"manager", branch_id:1, branch_name:"Nyabugogo", monthly_target:5000000, commission_rate:3, is_active:true,  monthly_sales:42, monthly_revenue:4820000 },
  { id:2, name:"Marie Uwamahoro",      email:"marie@valano.rw", phone:"0722334455", role:"worker",  branch_id:1, branch_name:"Nyabugogo", monthly_target:2500000, commission_rate:5, is_active:true,  monthly_sales:28, monthly_revenue:2310000 },
  { id:3, name:"Eric Ndayisabye",      email:"eric@valano.rw",  phone:"0733445566", role:"worker",  branch_id:1, branch_name:"Nyabugogo", monthly_target:2000000, commission_rate:5, is_active:true,  monthly_sales:19, monthly_revenue:1750000 },
  { id:4, name:"Alice Mukamana",       email:"alice@valano.rw", phone:"0788556677", role:"manager", branch_id:2, branch_name:"Kimironko", monthly_target:4000000, commission_rate:3, is_active:true,  monthly_sales:35, monthly_revenue:3890000 },
  { id:5, name:"Patrick Nkurunziza",   email:"pat@valano.rw",   phone:"0728889900", role:"worker",  branch_id:2, branch_name:"Kimironko", monthly_target:2000000, commission_rate:5, is_active:false, monthly_sales:0,  monthly_revenue:0 },
];

let STOCK = [
  { id:1,  name:"Winter Puffer Jacket", category:"Jackets",     size:"M",        color:"Black",    branch_id:1, branch_name:"Nyabugogo", quantity:24, cost_price_rwf:18000, sell_price_rwf:35000, low_stock_threshold:5,  barcode:"VL-00001", created_at:daysAgo(30) },
  { id:2,  name:"Slim Fit Chinos",      category:"Trousers",    size:"32",       color:"Khaki",    branch_id:1, branch_name:"Nyabugogo", quantity:3,  cost_price_rwf:9500,  sell_price_rwf:18000, low_stock_threshold:5,  barcode:"VL-00002", created_at:daysAgo(28) },
  { id:3,  name:"Floral Summer Dress",  category:"Dresses",     size:"S",        color:"Red",      branch_id:2, branch_name:"Kimironko", quantity:18, cost_price_rwf:12000, sell_price_rwf:25000, low_stock_threshold:5,  barcode:"VL-00003", created_at:daysAgo(25) },
  { id:4,  name:"Classic White Shirt",  category:"Shirts",      size:"L",        color:"White",    branch_id:1, branch_name:"Nyabugogo", quantity:0,  cost_price_rwf:7000,  sell_price_rwf:14000, low_stock_threshold:5,  barcode:"VL-00004", created_at:daysAgo(22) },
  { id:5,  name:"Hoodie Fleece",        category:"Hoodies",     size:"XL",       color:"Navy",     branch_id:2, branch_name:"Kimironko", quantity:11, cost_price_rwf:14000, sell_price_rwf:28000, low_stock_threshold:5,  barcode:"VL-00005", created_at:daysAgo(20) },
  { id:6,  name:"Leather Ankle Boots",  category:"Shoes",       size:"40",       color:"Brown",    branch_id:1, branch_name:"Nyabugogo", quantity:8,  cost_price_rwf:22000, sell_price_rwf:45000, low_stock_threshold:3,  barcode:"VL-00006", created_at:daysAgo(18) },
  { id:7,  name:"Cargo Trousers",       category:"Trousers",    size:"34",       color:"Olive",    branch_id:2, branch_name:"Kimironko", quantity:15, cost_price_rwf:11000, sell_price_rwf:22000, low_stock_threshold:5,  barcode:"VL-00007", created_at:daysAgo(16) },
  { id:8,  name:"Polo T-Shirt",         category:"Shirts",      size:"M",        color:"Sky Blue", branch_id:1, branch_name:"Nyabugogo", quantity:4,  cost_price_rwf:6000,  sell_price_rwf:12000, low_stock_threshold:5,  barcode:"VL-00008", created_at:daysAgo(14) },
  { id:9,  name:"Wrap Midi Dress",      category:"Dresses",     size:"M",        color:"Purple",   branch_id:2, branch_name:"Kimironko", quantity:9,  cost_price_rwf:13000, sell_price_rwf:27000, low_stock_threshold:3,  barcode:"VL-00009", created_at:daysAgo(12) },
  { id:10, name:"Denim Jacket",         category:"Jackets",     size:"L",        color:"Blue",     branch_id:1, branch_name:"Nyabugogo", quantity:6,  cost_price_rwf:20000, sell_price_rwf:40000, low_stock_threshold:3,  barcode:"VL-00010", created_at:daysAgo(10) },
  { id:11, name:"Sneakers Air Mesh",    category:"Shoes",       size:"42",       color:"White",    branch_id:2, branch_name:"Kimironko", quantity:12, cost_price_rwf:16000, sell_price_rwf:32000, low_stock_threshold:4,  barcode:"VL-00011", created_at:daysAgo(9) },
  { id:12, name:"Business Suit Jacket", category:"Jackets",     size:"L",        color:"Charcoal", branch_id:1, branch_name:"Nyabugogo", quantity:5,  cost_price_rwf:35000, sell_price_rwf:75000, low_stock_threshold:2,  barcode:"VL-00012", created_at:daysAgo(8) },
  { id:13, name:"Scarf Cashmere",       category:"Accessories", size:"One Size", color:"Beige",    branch_id:2, branch_name:"Kimironko", quantity:2,  cost_price_rwf:5000,  sell_price_rwf:12000, low_stock_threshold:3,  barcode:"VL-00013", created_at:daysAgo(7) },
  { id:14, name:"Slim Fit Jeans",       category:"Trousers",    size:"30",       color:"Dark Blue",branch_id:1, branch_name:"Nyabugogo", quantity:20, cost_price_rwf:10000, sell_price_rwf:20000, low_stock_threshold:5,  barcode:"VL-00014", created_at:daysAgo(6) },
  { id:15, name:"Crop Top",             category:"Shirts",      size:"S",        color:"White",    branch_id:2, branch_name:"Kimironko", quantity:14, cost_price_rwf:5500,  sell_price_rwf:11000, low_stock_threshold:5,  barcode:"VL-00015", created_at:daysAgo(5) },
  { id:16, name:"Bomber Jacket",        category:"Jackets",     size:"XL",       color:"Green",    branch_id:2, branch_name:"Kimironko", quantity:7,  cost_price_rwf:19000, sell_price_rwf:38000, low_stock_threshold:3,  barcode:"VL-00016", created_at:daysAgo(4) },
  { id:17, name:"Formal Dress Shoes",   category:"Shoes",       size:"41",       color:"Black",    branch_id:1, branch_name:"Nyabugogo", quantity:0,  cost_price_rwf:28000, sell_price_rwf:58000, low_stock_threshold:2,  barcode:"VL-00017", created_at:daysAgo(3) },
  { id:18, name:"Track Suit Set",       category:"Hoodies",     size:"M",        color:"Red",      branch_id:2, branch_name:"Kimironko", quantity:10, cost_price_rwf:17000, sell_price_rwf:35000, low_stock_threshold:4,  barcode:"VL-00018", created_at:daysAgo(2) },
];

const enrichStock = (item) => ({
  ...item,
  margin_pct: computeMargin(item.cost_price_rwf, item.sell_price_rwf),
  status: computeStatus(item.quantity, item.low_stock_threshold),
});

let SALES = [
  { id:1,  invoice_number:"VL-2026-001", customer_name:"Celestine Nyirahabimana", worker_name:"Jean Pierre Habimana", branch_name:"Nyabugogo", items_count:5, payment_method:"mtn_momo", total_amount:145000, created_at:daysAgo(1), is_voided:false, invoice_id:1 },
  { id:2,  invoice_number:"VL-2026-002", customer_name:"Walk-in",                  worker_name:"Marie Uwamahoro",       branch_name:"Nyabugogo", items_count:2, payment_method:"cash",     total_amount:52000,  created_at:daysAgo(1), is_voided:false, invoice_id:2 },
  { id:3,  invoice_number:"VL-2026-003", customer_name:"Alliance Fashion Shop",    worker_name:"Alice Mukamana",        branch_name:"Kimironko", items_count:8, payment_method:"mtn_momo", total_amount:280000, created_at:daysAgo(2), is_voided:false, invoice_id:3 },
  { id:4,  invoice_number:"VL-2026-004", customer_name:"Olivier Hakizimana",       worker_name:"Eric Ndayisabye",       branch_name:"Nyabugogo", items_count:3, payment_method:"cash",     total_amount:78000,  created_at:daysAgo(2), is_voided:false, invoice_id:4 },
  { id:5,  invoice_number:"VL-2026-005", customer_name:"Walk-in",                  worker_name:"Alice Mukamana",        branch_name:"Kimironko", items_count:1, payment_method:"airtel",   total_amount:25000,  created_at:daysAgo(3), is_voided:false, invoice_id:5 },
  { id:6,  invoice_number:"VL-2026-006", customer_name:"Style Hub Boutique",       worker_name:"Jean Pierre Habimana",  branch_name:"Nyabugogo", items_count:10,payment_method:"mtn_momo", total_amount:420000, created_at:daysAgo(3), is_voided:false, invoice_id:6 },
  { id:7,  invoice_number:"VL-2026-007", customer_name:"Sandrine Uwera",           worker_name:"Marie Uwamahoro",       branch_name:"Nyabugogo", items_count:2, payment_method:"cash",     total_amount:46000,  created_at:daysAgo(4), is_voided:false, invoice_id:7 },
  { id:8,  invoice_number:"VL-2026-008", customer_name:"Walk-in",                  worker_name:"Eric Ndayisabye",       branch_name:"Nyabugogo", items_count:1, payment_method:"cash",     total_amount:35000,  created_at:daysAgo(5), is_voided:true,  invoice_id:8, void_reason:"Customer returned item — size issue" },
  { id:9,  invoice_number:"VL-2026-009", customer_name:"Chantal Murerwa",          worker_name:"Alice Mukamana",        branch_name:"Kimironko", items_count:3, payment_method:"mtn_momo", total_amount:91000,  created_at:daysAgo(5), is_voided:false, invoice_id:9 },
  { id:10, invoice_number:"VL-2026-010", customer_name:"Celestine Nyirahabimana",  worker_name:"Jean Pierre Habimana",  branch_name:"Nyabugogo", items_count:7, payment_method:"mtn_momo", total_amount:315000, created_at:daysAgo(6), is_voided:false, invoice_id:10 },
  { id:11, invoice_number:"VL-2026-011", customer_name:"Valens Tuyishime",         worker_name:"Alice Mukamana",        branch_name:"Kimironko", items_count:1, payment_method:"cash",     total_amount:20000,  created_at:daysAgo(7), is_voided:false, invoice_id:11 },
  { id:12, invoice_number:"VL-2026-012", customer_name:"Walk-in",                  worker_name:"Marie Uwamahoro",       branch_name:"Nyabugogo", items_count:2, payment_method:"mtn_momo", total_amount:63000,  created_at:daysAgo(8), is_voided:false, invoice_id:12 },
];

let CUSTOMERS = [
  { id:1, name:"Celestine Nyirahabimana", phone:"0788123456", location:"Nyamirambo", type:"wholesaler", segment:"vip",     total_orders:48, total_spent:12400000, last_purchase:"2026-05-30", notes:"VIP wholesale client — bulk orders" },
  { id:2, name:"Olivier Hakizimana",      phone:"0722334455", location:"Remera",     type:"retailer",   segment:"vip",     total_orders:31, total_spent:5800000,  last_purchase:"2026-05-28", notes:"" },
  { id:3, name:"Sandrine Uwera",          phone:"0733556677", location:"Kacyiru",    type:"retailer",   segment:"regular", total_orders:12, total_spent:1900000,  last_purchase:"2026-05-20", notes:"" },
  { id:4, name:"Alliance Fashion Shop",   phone:"0788990011", location:"Kimironko",  type:"wholesaler", segment:"vip",     total_orders:22, total_spent:9200000,  last_purchase:"2026-06-01", notes:"Boutique chain — 3 outlets" },
  { id:5, name:"Chantal Murerwa",         phone:"0722001122", location:"Muhima",     type:"retailer",   segment:"regular", total_orders:7,  total_spent:840000,   last_purchase:"2026-04-15", notes:"" },
  { id:6, name:"Valens Tuyishime",        phone:"0733223344", location:"Gisozi",     type:"retailer",   segment:"new",     total_orders:2,  total_spent:95000,    last_purchase:"2026-05-31", notes:"" },
  { id:7, name:"Style Hub Boutique",      phone:"0788445566", location:"CBD",        type:"wholesaler", segment:"regular", total_orders:18, total_spent:4300000,  last_purchase:"2026-05-25", notes:"" },
  { id:8, name:"Josiane Ingabire",        phone:"0722667788", location:"Kanombe",    type:"retailer",   segment:"new",     total_orders:1,  total_spent:35000,    last_purchase:"2026-06-02", notes:"" },
];

let SUPPLIERS = [
  { id:1, name:"Guangzhou Tianhao Trading",   wechat:"tianhao888",   whatsapp:"+8613512345678", city:"Guangzhou", country:"China", specialty:"Jackets & Coats",     orders_count:8,  total_rwf:18500000, reliability_pct:94 },
  { id:2, name:"Yiwu Fashion World Co.",      wechat:"yiwufashion",  whatsapp:"+8613687654321", city:"Yiwu",      country:"China", specialty:"Ladies Dresses",      orders_count:12, total_rwf:24100000, reliability_pct:88 },
  { id:3, name:"Shenzhen Trendy Apparel",     wechat:"sztrendy2024", whatsapp:"+8613998877665", city:"Shenzhen",  country:"China", specialty:"Shoes & Accessories", orders_count:5,  total_rwf:9800000,  reliability_pct:96 },
  { id:4, name:"Hangzhou Silk Road Garments", wechat:"hzsilkroad",   whatsapp:"+8613776655443", city:"Hangzhou",  country:"China", specialty:"Shirts & Trousers",   orders_count:6,  total_rwf:13200000, reliability_pct:91 },
  { id:5, name:"Foshan Denim Masters",        wechat:"fsdenim2024",  whatsapp:"+8613554433221", city:"Foshan",    country:"China", specialty:"Jeans & Denim",       orders_count:4,  total_rwf:7600000,  reliability_pct:85 },
];

let PROCUREMENT = [
  { id:1, supplier_id:1, supplier_name:"Guangzhou Tianhao Trading", order_date:"2026-04-10", arrival_date:"2026-05-05", currency:"CNY", exchange_rate:195, shipping_cost:450000, customs_cost:280000, items_count:6, items_cost:1240000, status:"stocked",   notes:"Spring collection jackets" },
  { id:2, supplier_id:2, supplier_name:"Yiwu Fashion World Co.",    order_date:"2026-05-01", arrival_date:"2026-06-10", currency:"CNY", exchange_rate:195, shipping_cost:380000, customs_cost:210000, items_count:8, items_cost:980000,  status:"in_transit",notes:"Summer dresses batch" },
  { id:3, supplier_id:3, supplier_name:"Shenzhen Trendy Apparel",   order_date:"2026-05-15", arrival_date:"2026-06-20", currency:"USD", exchange_rate:1300,shipping_cost:520000, customs_cost:310000, items_count:4, items_cost:720000,  status:"ordered",   notes:"Shoes restock Q2" },
  { id:4, supplier_id:4, supplier_name:"Hangzhou Silk Road Garments",order_date:"2026-03-20",arrival_date:"2026-04-18", currency:"CNY", exchange_rate:193, shipping_cost:320000, customs_cost:190000, items_count:10,items_cost:1580000, status:"stocked",   notes:"Shirts bulk order" },
  { id:5, supplier_id:1, supplier_name:"Guangzhou Tianhao Trading", order_date:"2026-05-25", arrival_date:"2026-06-28", currency:"CNY", exchange_rate:196, shipping_cost:480000, customs_cost:300000, items_count:5, items_cost:890000,  status:"at_customs",notes:"Winter preview stock" },
  { id:6, supplier_id:2, supplier_name:"Yiwu Fashion World Co.",    order_date:"2026-05-28", arrival_date:"2026-07-05", currency:"CNY", exchange_rate:196, shipping_cost:400000, customs_cost:250000, items_count:7, items_cost:1100000, status:"ordered",   notes:"New arrivals for Kimironko" },
];

let INVOICES = [
  { id:1,  invoice_number:"VL-2026-001", customer_name:"Celestine Nyirahabimana", branch_name:"Nyabugogo", total_amount:145000, issued_at:daysAgo(1), status:"paid" },
  { id:2,  invoice_number:"VL-2026-002", customer_name:"Walk-in",                  branch_name:"Nyabugogo", total_amount:52000,  issued_at:daysAgo(1), status:"paid" },
  { id:3,  invoice_number:"VL-2026-003", customer_name:"Alliance Fashion Shop",    branch_name:"Kimironko", total_amount:280000, issued_at:daysAgo(2), status:"pending" },
  { id:4,  invoice_number:"VL-2026-004", customer_name:"Olivier Hakizimana",       branch_name:"Nyabugogo", total_amount:78000,  issued_at:daysAgo(2), status:"paid" },
  { id:5,  invoice_number:"VL-2026-005", customer_name:"Walk-in",                  branch_name:"Kimironko", total_amount:25000,  issued_at:daysAgo(3), status:"paid" },
  { id:6,  invoice_number:"VL-2026-006", customer_name:"Style Hub Boutique",       branch_name:"Nyabugogo", total_amount:420000, issued_at:daysAgo(3), status:"pending" },
  { id:7,  invoice_number:"VL-2026-007", customer_name:"Sandrine Uwera",           branch_name:"Nyabugogo", total_amount:46000,  issued_at:daysAgo(4), status:"paid" },
  { id:8,  invoice_number:"VL-2026-008", customer_name:"Walk-in",                  branch_name:"Nyabugogo", total_amount:35000,  issued_at:daysAgo(5), status:"voided" },
  { id:9,  invoice_number:"VL-2026-009", customer_name:"Chantal Murerwa",          branch_name:"Kimironko", total_amount:91000,  issued_at:daysAgo(5), status:"paid" },
  { id:10, invoice_number:"VL-2026-010", customer_name:"Celestine Nyirahabimana",  branch_name:"Nyabugogo", total_amount:315000, issued_at:daysAgo(6), status:"overdue" },
  { id:11, invoice_number:"VL-2026-011", customer_name:"Valens Tuyishime",         branch_name:"Kimironko", total_amount:20000,  issued_at:daysAgo(7), status:"paid" },
  { id:12, invoice_number:"VL-2026-012", customer_name:"Walk-in",                  branch_name:"Nyabugogo", total_amount:63000,  issued_at:daysAgo(8), status:"paid" },
];

let EXPENSES = [
  { id:1,  expense_date:"2026-06-01", category:"Rent",            description:"June rent - Nyabugogo",     amount:350000, branch_id:1, branch_name:"Nyabugogo", recorder_name:"Jean Pierre Habimana" },
  { id:2,  expense_date:"2026-06-01", category:"Rent",            description:"June rent - Kimironko",     amount:280000, branch_id:2, branch_name:"Kimironko", recorder_name:"Alice Mukamana" },
  { id:3,  expense_date:"2026-06-01", category:"Staff Salaries",  description:"May salary - workers",      amount:1200000,branch_id:1, branch_name:"Nyabugogo", recorder_name:"Jean Pierre Habimana" },
  { id:4,  expense_date:"2026-05-28", category:"Transport",       description:"Delivery to branches",      amount:45000,  branch_id:1, branch_name:"Nyabugogo", recorder_name:"Marie Uwamahoro" },
  { id:5,  expense_date:"2026-05-25", category:"Packaging",       description:"Bags and boxes May",        amount:85000,  branch_id:1, branch_name:"Nyabugogo", recorder_name:"Eric Ndayisabye" },
  { id:6,  expense_date:"2026-05-22", category:"Utilities",       description:"Electricity - both shops",  amount:62000,  branch_id:1, branch_name:"Nyabugogo", recorder_name:"Jean Pierre Habimana" },
  { id:7,  expense_date:"2026-05-20", category:"Marketing",       description:"Facebook ads May",          amount:40000,  branch_id:2, branch_name:"Kimironko", recorder_name:"Alice Mukamana" },
  { id:8,  expense_date:"2026-05-15", category:"Customs & Taxes", description:"Order #5 customs payment",  amount:300000, branch_id:1, branch_name:"Nyabugogo", recorder_name:"Jean Pierre Habimana" },
  { id:9,  expense_date:"2026-05-10", category:"China Travel",    description:"Boss trip to Guangzhou",    amount:850000, branch_id:1, branch_name:"Nyabugogo", recorder_name:"Jean Pierre Habimana" },
  { id:10, expense_date:"2026-05-05", category:"Other",           description:"Shop maintenance",          amount:35000,  branch_id:2, branch_name:"Kimironko", recorder_name:"Alice Mukamana" },
];

let NOTIFICATIONS = [
  { id:1, type:"low_stock",   title:"Low Stock Alert",       message:"Polo T-Shirt (M, Sky Blue) has only 4 units left at Nyabugogo",             created_at:daysAgo(0), is_read:false },
  { id:2, type:"low_stock",   title:"Low Stock Alert",       message:"Slim Fit Chinos (32, Khaki) has only 3 units left at Nyabugogo",            created_at:daysAgo(0), is_read:false },
  { id:3, type:"procurement", title:"Order Arrived",         message:"Procurement order #5 from Guangzhou Tianhao Trading is at customs",        created_at:daysAgo(1), is_read:false },
  { id:4, type:"sale",        title:"Large Sale Recorded",   message:"Style Hub Boutique purchased 10 items for RWF 420,000",                    created_at:daysAgo(1), is_read:true },
  { id:5, type:"stock",       title:"New Stock Added",       message:"Bomber Jacket (XL, Green) added to Kimironko — 7 units",                   created_at:daysAgo(2), is_read:true },
  { id:6, type:"worker",      title:"Worker Deactivated",    message:"Patrick Nkurunziza has been deactivated",                                  created_at:daysAgo(3), is_read:true },
  { id:7, type:"sale",        title:"Sale Voided",           message:"Invoice VL-2026-008 was voided — size issue return",                       created_at:daysAgo(4), is_read:true },
  { id:8, type:"procurement", title:"New Order Created",     message:"New procurement order from Yiwu Fashion World Co. — 6 items",              created_at:daysAgo(5), is_read:true },
];

let AUDIT = [
  { id:1,  user_name:"Jean Pierre Habimana", action:"SALE_CREATED",      entity_type:"sale",        details:"Invoice VL-2026-012 — RWF 63,000",        created_at:daysAgo(0) },
  { id:2,  user_name:"Marie Uwamahoro",      action:"SALE_CREATED",      entity_type:"sale",        details:"Invoice VL-2026-011 — RWF 20,000",        created_at:daysAgo(0) },
  { id:3,  user_name:"Jean Pierre Habimana", action:"STOCK_UPDATED",     entity_type:"stock",       details:"Hoodie Fleece qty changed 8→11",          created_at:daysAgo(1) },
  { id:4,  user_name:"Alice Mukamana",       action:"SALE_CREATED",      entity_type:"sale",        details:"Invoice VL-2026-010 — RWF 315,000",       created_at:daysAgo(1) },
  { id:5,  user_name:"Rukundo joseph",   action:"WORKER_CREATED",    entity_type:"worker",      details:"Patrick Nkurunziza added as worker",      created_at:daysAgo(2) },
  { id:6,  user_name:"Jean Pierre Habimana", action:"SALE_VOIDED",       entity_type:"sale",        details:"Invoice VL-2026-008 voided",              created_at:daysAgo(2) },
  { id:7,  user_name:"Alice Mukamana",       action:"STOCK_TRANSFER",    entity_type:"stock",       details:"Bomber Jacket 5 units: Nyabugogo→Kimironko",created_at:daysAgo(3) },
  { id:8,  user_name:"Rukundo joseph",  action:"PROCUREMENT_CREATED",entity_type:"procurement",details:"Order from Yiwu Fashion World Co.",       created_at:daysAgo(3) },
  { id:9,  user_name:"Jean Pierre Habimana", action:"LOGIN",             entity_type:"user",        details:"Logged in from Nyabugogo",                created_at:daysAgo(4) },
  { id:10, user_name:"Alice Mukamana",       action:"EXPENSE_CREATED",   entity_type:"expense",     details:"Shop maintenance — RWF 35,000",           created_at:daysAgo(4) },
  { id:11, user_name:"Rukundo joseph",  action:"SUPPLIER_UPDATED",  entity_type:"supplier",    details:"Yiwu Fashion World Co. notes updated",    created_at:daysAgo(5) },
  { id:12, user_name:"Jean Pierre Habimana", action:"STOCK_CREATED",     entity_type:"stock",       details:"Track Suit Set added — 10 units",         created_at:daysAgo(5) },
];

const addAudit = (user_name, action, entity_type, details) => {
  AUDIT.unshift({ id: nextId(AUDIT), user_name: user_name || "Rukundo joseph", action, entity_type, details, created_at: nowIso() });
};

// ─── Dashboard helpers ────────────────────────────────────────────────────────

let _trend = null;
const getTrend = () => {
  if (!_trend) {
    _trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      _trend.push({ date: d.toISOString().slice(0,10), branch1: Math.floor(200000+Math.random()*400000), branch2: Math.floor(150000+Math.random()*350000) });
    }
  }
  return _trend;
};

let _monthly = null;
const getMonthly = () => {
  if (!_monthly) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    _monthly = months.map(m => {
      const revenue = 3000000 + Math.floor(Math.random()*4000000);
      const cogs = Math.floor(revenue*0.45);
      const expenses = 800000 + Math.floor(Math.random()*400000);
      return { month:m, revenue, cogs, expenses, grossProfit:revenue-cogs, netProfit:revenue-cogs-expenses };
    });
  }
  return _monthly;
};

// ─── Route handler ────────────────────────────────────────────────────────────

function handle(method, url, body) {
  const path = url.replace(/^\/api/, "").split("?")[0];
  const parts = path.split("/").filter(Boolean);
  const [r0, r1, r2] = parts;

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (path === "/auth/login") {
    const USERS = {
      "rukundojosephtuyishime@gmail.com":    { id:1, name:"Rukundo joseph",   email:"rukundojosephtuyishime@gmail.com",    role:"admin",   branch_id:null, branch_name:"All Branches" },
      "manager@valano.rw":  { id:2, name:"Jean Pierre Habimana", email:"manager@valano.rw",  role:"manager", branch_id:1,    branch_name:"Nyabugogo" },
      "accounts@valano.rw": { id:3, name:"Uwimana Angélique",    email:"accounts@valano.rw", role:"manager", branch_id:2,    branch_name:"Kimironko" },
      "worker1@valano.rw":  { id:4, name:"Marie Uwamahoro",      email:"worker1@valano.rw",  role:"worker",  branch_id:1,    branch_name:"Nyabugogo" },
    };
    const u = USERS[body?.email];
    if (!u || body?.password !== "rukundo2007") throw { response:{ status:401, data:{ error:"Invalid email or password" } } };
    addAudit(u.name, "LOGIN", "user", `Logged in as ${u.role}`);
    return { user:u, accessToken:"demo-token", refreshToken:"demo-refresh" };
  }
  if (r0 === "auth") return { ok:true };

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  if (path === "/settings") return { branches: BRANCHES, business_name:"VALANO SHOP", currency:"RWF" };

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  if (r0 === "dashboard") {
    if (r1 === "stats") return {
      totalStockValue: STOCK.reduce((s,i)=>s+i.quantity*i.cost_price_rwf,0),
      todayRevenue:    SALES.filter(s=>!s.is_voided && s.created_at>=daysAgo(1)).reduce((s,x)=>s+x.total_amount,0),
      monthlyProfit:   2840000,
      activeWorkers:   WORKERS.filter(w=>w.is_active).length,
    };
    if (r1 === "sales-trend")      return getTrend();
    if (r1 === "stock-health")     return { in_stock:STOCK.filter(x=>computeStatus(x.quantity,x.low_stock_threshold)==="in_stock").length, low_stock:STOCK.filter(x=>computeStatus(x.quantity,x.low_stock_threshold)==="low_stock").length, out_of_stock:STOCK.filter(x=>computeStatus(x.quantity,x.low_stock_threshold)==="out_of_stock").length };
    if (r1 === "top-items")        return [{ name:"Winter Puffer Jacket",total_sold:38,revenue:1330000},{name:"Slim Fit Jeans",total_sold:31,revenue:620000},{name:"Floral Summer Dress",total_sold:27,revenue:675000},{name:"Leather Ankle Boots",total_sold:22,revenue:990000},{name:"Hoodie Fleece",total_sold:19,revenue:532000},{name:"Cargo Trousers",total_sold:17,revenue:374000},{name:"Polo T-Shirt",total_sold:15,revenue:180000},{name:"Denim Jacket",total_sold:14,revenue:560000}];
    if (r1 === "worker-leaderboard") return WORKERS.filter(w=>w.is_active).sort((a,b)=>b.monthly_revenue-a.monthly_revenue).map(w=>({ id:w.id,name:w.name,branch:w.branch_name,revenue:w.monthly_revenue,monthly_target:w.monthly_target }));
    if (r1 === "low-stock-alerts")  return STOCK.filter(x=>computeStatus(x.quantity,x.low_stock_threshold)!=="in_stock").map(x=>({ id:x.id,name:x.name,branch_name:x.branch_name,quantity:x.quantity }));
    if (r1 === "activity-feed")     return AUDIT.slice(0,8).map(a=>({ id:a.id,action:a.action,user_name:a.user_name,created_at:a.created_at }));
    if (r1 === "branch-comparison") return [{ branch:"Nyabugogo",revenue:WORKERS.filter(w=>w.branch_id===1).reduce((s,w)=>s+w.monthly_revenue,0) },{ branch:"Kimironko",revenue:WORKERS.filter(w=>w.branch_id===2).reduce((s,w)=>s+w.monthly_revenue,0) }];
  }

  // ── STOCK ─────────────────────────────────────────────────────────────────
  if (r0 === "stock") {
    if (!r1 && method === "GET")  return { data: STOCK.map(enrichStock), total: STOCK.length };
    if (!r1 && method === "POST") {
      const id = nextId(STOCK);
      const bnum = String(id).padStart(5,"0");
      const bname = branchName(body.branch_id);
      const item = { id, ...body, branch_id:parseInt(body.branch_id), branch_name:bname, barcode:`VL-${bnum}`, created_at:nowIso() };
      STOCK.push(item);
      addAudit("Rukundo joseph","STOCK_CREATED","stock",`${item.name} added — ${item.quantity} units at ${bname}`);
      return enrichStock(item);
    }
    if (r1 === "transfer" && method === "POST") {
      const { item_id, from_branch, to_branch, quantity } = body;
      const item = STOCK.find(x=>x.id===parseInt(item_id));
      if (item) { item.quantity = Math.max(0, item.quantity - parseInt(quantity)); }
      const fbName = branchName(from_branch); const tbName = branchName(to_branch);
      addAudit("Rukundo joseph","STOCK_TRANSFER","stock",`${item?.name} ${quantity} units: ${fbName}→${tbName}`);
      return { ok:true };
    }
    if (r2 === "history" && method === "GET") return [
      { id:1,date:daysAgo(1),type:"sale",     quantity:-2,done_by:"Marie Uwamahoro",      from_branch:null,to_branch:null },
      { id:2,date:daysAgo(3),type:"transfer", quantity:-5,done_by:"Jean Pierre Habimana", from_branch:"Nyabugogo",to_branch:"Kimironko" },
      { id:3,date:daysAgo(8),type:"stock_in", quantity:10,done_by:"Admin",                from_branch:null,to_branch:null },
      { id:4,date:daysAgo(12),type:"sale",    quantity:-3,done_by:"Eric Ndayisabye",      from_branch:null,to_branch:null },
    ];
    if (r1 && method === "GET") {
      const item = STOCK.find(x=>x.id===parseInt(r1));
      return item ? enrichStock(item) : null;
    }
    if (r1 && method === "PUT") {
      const idx = STOCK.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) {
        const bname = branchName(body.branch_id || STOCK[idx].branch_id);
        STOCK[idx] = { ...STOCK[idx], ...body, branch_id:parseInt(body.branch_id||STOCK[idx].branch_id), branch_name:bname };
        addAudit("Rukundo joseph","STOCK_UPDATED","stock",`${STOCK[idx].name} updated`);
        return enrichStock(STOCK[idx]);
      }
    }
    if (r1 && method === "DELETE") {
      const item = STOCK.find(x=>x.id===parseInt(r1));
      STOCK = STOCK.filter(x=>x.id!==parseInt(r1));
      addAudit("Rukundo joseph","STOCK_DELETED","stock",`${item?.name} removed`);
      return { ok:true };
    }
  }

  // ── SALES ─────────────────────────────────────────────────────────────────
  if (r0 === "sales") {
    if (!r1 && method === "GET") {
      const active = SALES.filter(s=>!s.is_voided);
      const revenue = active.reduce((s,x)=>s+x.total_amount,0);
      return { data:SALES, total:SALES.length, stats:{ count:SALES.length, revenue, avg_sale:active.length?Math.round(revenue/active.length):0 } };
    }
    if (!r1 && method === "POST") {
      const id = nextId(SALES);
      const inv = `VL-2026-${String(id).padStart(3,"0")}`;
      const total = (body.items||[]).reduce((s,i)=>s+(i.unit_price||0)*(i.quantity||0),0);
      const sale = { id, invoice_number:inv, customer_name:body.customer_name||"Walk-in", worker_name:"Rukundo joseph", branch_name:"Nyabugogo", items_count:(body.items||[]).length, payment_method:body.payment_method||"cash", total_amount:total, created_at:nowIso(), is_voided:false, invoice_id:id };
      SALES.unshift(sale);
      // Also add to invoices
      INVOICES.unshift({ id:nextId(INVOICES), invoice_number:inv, customer_name:sale.customer_name, branch_name:"Nyabugogo", total_amount:total, issued_at:nowIso(), status:"paid" });
      addAudit("Rukundo joseph","SALE_CREATED","sale",`Invoice ${inv} — RWF ${total.toLocaleString()}`);
      return { invoice_number:inv, id };
    }
    if (r2 === "void" && method === "POST") {
      const idx = SALES.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) { SALES[idx] = { ...SALES[idx], is_voided:true, void_reason:body.void_reason }; }
      const invIdx = INVOICES.findIndex(x=>x.invoice_number===SALES[idx]?.invoice_number);
      if (invIdx !== -1) INVOICES[invIdx].status = "voided";
      addAudit("Rukundo joseph","SALE_VOIDED","sale",`Invoice ${SALES[idx]?.invoice_number} voided`);
      return { ok:true };
    }
    if (r1 && method === "GET") {
      const s = SALES.find(x=>x.id===parseInt(r1)) || SALES[0];
      return { ...s, items:[{ item_name:"Winter Puffer Jacket",size:"M",quantity:2,unit_price:35000,subtotal:70000 },{ item_name:"Slim Fit Jeans",size:"30",quantity:1,unit_price:20000,subtotal:20000 },{ item_name:"Polo T-Shirt",size:"M",quantity:2,unit_price:12000,subtotal:24000 }] };
    }
  }

  // ── PROCUREMENT ───────────────────────────────────────────────────────────
  if (r0 === "procurement") {
    if (!r1 && method === "GET") {
      const summary = [
        { status:"in_transit",cnt:PROCUREMENT.filter(x=>x.status==="in_transit").length },
        { status:"at_customs",cnt:PROCUREMENT.filter(x=>x.status==="at_customs").length },
        { status:"arrived",   cnt:PROCUREMENT.filter(x=>x.status==="arrived").length },
      ];
      return { data:PROCUREMENT, total:PROCUREMENT.length, summary };
    }
    if (!r1 && method === "POST") {
      const sup = SUPPLIERS.find(s=>s.id===parseInt(body.supplier_id));
      const id = nextId(PROCUREMENT);
      const order = { id, ...body, supplier_id:parseInt(body.supplier_id), supplier_name:sup?.name||"Unknown", items_count:(body.items||[]).length, items_cost:(body.items||[]).reduce((s,i)=>(s+(parseFloat(i.unit_cost)||0)*(parseInt(i.quantity)||0))*(parseFloat(body.exchange_rate)||1),0), status:"ordered" };
      PROCUREMENT.unshift(order);
      addAudit("Rukundo joseph","PROCUREMENT_CREATED","procurement",`Order #${id} from ${order.supplier_name}`);
      return order;
    }
    if (r2 === "status" && method === "PUT") {
      const idx = PROCUREMENT.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) PROCUREMENT[idx].status = body.status;
      addAudit("Rukundo joseph","PROCUREMENT_UPDATED","procurement",`Order #${r1} status → ${body.status}`);
      return { ok:true };
    }
    if (r2 === "stock-in" && method === "POST") {
      const idx = PROCUREMENT.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) PROCUREMENT[idx].status = "stocked";
      addAudit("Rukundo joseph","STOCK_IN","procurement",`Order #${r1} stocked in at ${branchName(body.branch_id)}`);
      return { ok:true };
    }
    if (r1 && method === "GET") {
      const o = PROCUREMENT.find(x=>x.id===parseInt(r1)) || PROCUREMENT[1];
      return { ...o, items:[{ id:1,item_name:"Floral Summer Dress",category:"Dresses",size:"S",color:"Red",quantity:30,unit_cost:65,currency:o.currency },{ id:2,item_name:"Wrap Midi Dress",category:"Dresses",size:"M",color:"Purple",quantity:20,unit_cost:70,currency:o.currency }] };
    }
  }

  // ── WORKERS ───────────────────────────────────────────────────────────────
  if (r0 === "workers") {
    if (!r1 && method === "GET") return WORKERS;
    if (!r1 && method === "POST") {
      const id = nextId(WORKERS);
      const w = { id, ...body, branch_id:parseInt(body.branch_id), branch_name:branchName(body.branch_id), is_active:true, monthly_sales:0, monthly_revenue:0 };
      WORKERS.push(w);
      addAudit("Rukundo joseph","WORKER_CREATED","worker",`${w.name} added as ${w.role}`);
      return w;
    }
    if (r2 === "performance" && method === "GET") {
      const w = WORKERS.find(x=>x.id===parseInt(r1)) || WORKERS[0];
      const trend = [];
      for (let i=29;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); trend.push({ date:d.toISOString().slice(0,10),revenue:Math.floor(50000+Math.random()*200000) }); }
      return { totalSales:w.monthly_sales*3,totalRevenue:w.monthly_revenue*3,avgSaleValue:Math.round(w.monthly_revenue/Math.max(w.monthly_sales,1)),commissionEarned:Math.floor(w.monthly_revenue*w.commission_rate/100),monthlyRevenue:w.monthly_revenue,monthlyTarget:w.monthly_target,targetProgress:Math.min(100,Math.round(w.monthly_revenue/w.monthly_target*100)),dailyTrend:trend,byCategory:[{category:"Jackets",revenue:Math.floor(w.monthly_revenue*.3)},{category:"Trousers",revenue:Math.floor(w.monthly_revenue*.22)},{category:"Dresses",revenue:Math.floor(w.monthly_revenue*.25)},{category:"Shirts",revenue:Math.floor(w.monthly_revenue*.15)},{category:"Shoes",revenue:Math.floor(w.monthly_revenue*.08)}],topItems:[{name:"Winter Puffer Jacket",units:12,revenue:Math.floor(w.monthly_revenue*.18)},{name:"Slim Fit Jeans",units:9,revenue:Math.floor(w.monthly_revenue*.12)}] };
    }
    if (r2 === "deactivate" && method === "PUT") {
      const idx = WORKERS.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) { WORKERS[idx].is_active = false; addAudit("Rukundo joseph","WORKER_DEACTIVATED","worker",`${WORKERS[idx].name} deactivated`); }
      return { ok:true };
    }
    if (r1 && method === "GET")  return WORKERS.find(x=>x.id===parseInt(r1)) || WORKERS[0];
    if (r1 && method === "PUT")  {
      const idx = WORKERS.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) { WORKERS[idx] = { ...WORKERS[idx], ...body, branch_id:parseInt(body.branch_id||WORKERS[idx].branch_id), branch_name:branchName(body.branch_id||WORKERS[idx].branch_id) }; addAudit("Rukundo joseph","WORKER_UPDATED","worker",`${WORKERS[idx].name} updated`); }
      return WORKERS[idx];
    }
  }

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  if (r0 === "customers") {
    if (!r1 && method === "GET") {
      const summary = [{ segment:"vip",cnt:CUSTOMERS.filter(c=>c.segment==="vip").length },{ segment:"regular",cnt:CUSTOMERS.filter(c=>c.segment==="regular").length },{ segment:"new",cnt:CUSTOMERS.filter(c=>c.segment==="new").length }];
      return { data:CUSTOMERS, total:CUSTOMERS.length, summary };
    }
    if (!r1 && method === "POST") {
      const id = nextId(CUSTOMERS);
      const c = { id, ...body, segment:"new", total_orders:0, total_spent:0, last_purchase:null };
      CUSTOMERS.push(c);
      addAudit("Rukundo joseph","CUSTOMER_CREATED","customer",`${c.name} added`);
      return c;
    }
    if (r1 && method === "GET") {
      const c = CUSTOMERS.find(x=>x.id===parseInt(r1)) || CUSTOMERS[0];
      return { ...c, sales:SALES.filter(s=>s.customer_name===c.name).slice(0,5) };
    }
  }

  // ── SUPPLIERS ─────────────────────────────────────────────────────────────
  if (r0 === "suppliers") {
    if (!r1 && method === "GET")  return SUPPLIERS;
    if (!r1 && method === "POST") {
      const s = { id:nextId(SUPPLIERS), ...body, orders_count:0, total_rwf:0, reliability_pct:100 };
      SUPPLIERS.push(s);
      addAudit("Rukundo joseph","SUPPLIER_CREATED","supplier",`${s.name} added`);
      return s;
    }
    if (r1 && method === "PUT") {
      const idx = SUPPLIERS.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) { SUPPLIERS[idx] = { ...SUPPLIERS[idx], ...body }; addAudit("Rukundo joseph","SUPPLIER_UPDATED","supplier",`${SUPPLIERS[idx].name} updated`); }
      return SUPPLIERS[idx];
    }
    if (r1 && method === "DELETE") {
      const s = SUPPLIERS.find(x=>x.id===parseInt(r1));
      SUPPLIERS = SUPPLIERS.filter(x=>x.id!==parseInt(r1));
      addAudit("Rukundo joseph","SUPPLIER_DELETED","supplier",`${s?.name} removed`);
      return { ok:true };
    }
  }

  // ── INVOICES ──────────────────────────────────────────────────────────────
  if (r0 === "invoices") {
    if (!r1 && method === "GET") {
      const summary = ["paid","pending","overdue","voided"].map(s=>({ status:s, cnt:INVOICES.filter(x=>x.status===s).length, total:INVOICES.filter(x=>x.status===s).reduce((a,x)=>a+x.total_amount,0) }));
      return { data:INVOICES, total:INVOICES.length, summary };
    }
    if (r2 === "status" && method === "PUT") {
      const idx = INVOICES.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) { INVOICES[idx].status = body.status; addAudit("Rukundo joseph","INVOICE_UPDATED","invoice",`Invoice ${INVOICES[idx].invoice_number} marked ${body.status}`); }
      return { ok:true };
    }
  }

  // ── EXPENSES ──────────────────────────────────────────────────────────────
  if (r0 === "expenses") {
    if (!r1 && method === "GET") {
      const cats = ["Rent","Staff Salaries","China Travel","Customs & Taxes","Transport","Packaging","Utilities","Marketing","Other"];
      const byCategory = cats.map(cat=>({ category:cat, total:EXPENSES.filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0) })).filter(c=>c.total>0);
      return { data:EXPENSES, total:EXPENSES.length, byCategory };
    }
    if (!r1 && method === "POST") {
      const id = nextId(EXPENSES);
      const e = { id, ...body, amount:parseFloat(body.amount), branch_name:branchName(body.branch_id), recorder_name:"Rukundo joseph" };
      EXPENSES.unshift(e);
      addAudit("Rukundo joseph","EXPENSE_CREATED","expense",`${e.category} — RWF ${parseFloat(e.amount).toLocaleString()}`);
      return e;
    }
    if (r1 && method === "DELETE") {
      const e = EXPENSES.find(x=>x.id===parseInt(r1));
      EXPENSES = EXPENSES.filter(x=>x.id!==parseInt(r1));
      addAudit("Rukundo joseph","EXPENSE_DELETED","expense",`${e?.category} expense removed`);
      return { ok:true };
    }
  }

  // ── FINANCE ───────────────────────────────────────────────────────────────
  if (r0 === "finance" && r1 === "pnl") {
    const monthly = getMonthly();
    const revenue = monthly.reduce((s,m)=>s+m.revenue,0);
    const cogs = monthly.reduce((s,m)=>s+m.cogs,0);
    const expenses = monthly.reduce((s,m)=>s+m.expenses,0);
    const grossProfit = revenue-cogs; const netProfit = grossProfit-expenses;
    return { totals:{ revenue,cogs,expenses,grossProfit,netProfit,grossMargin:(grossProfit/revenue*100).toFixed(1),netMargin:(netProfit/revenue*100).toFixed(1) }, byMonth:monthly };
  }

  // ── REPORTS ───────────────────────────────────────────────────────────────
  if (r0 === "reports") {
    if (r1 === "sales") {
      const daily = [];
      for (let i=29;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); daily.push({ date:d.toISOString().slice(0,10),revenue:Math.floor(200000+Math.random()*600000),sales:Math.floor(3+Math.random()*15) }); }
      return { totals:{ total_sales:SALES.length,total_revenue:SALES.filter(s=>!s.is_voided).reduce((s,x)=>s+x.total_amount,0),avg_sale:Math.round(SALES.filter(s=>!s.is_voided).reduce((s,x)=>s+x.total_amount,0)/Math.max(SALES.filter(s=>!s.is_voided).length,1)) }, daily, workers:WORKERS.filter(w=>w.is_active).map(w=>({ name:w.name,branch:w.branch_name,sales:w.monthly_sales,revenue:w.monthly_revenue,avg_sale:Math.round(w.monthly_revenue/Math.max(w.monthly_sales,1)) })) };
    }
    if (r1 === "stock") return { totals:{ items:STOCK.length,value:STOCK.reduce((s,x)=>s+x.quantity*x.cost_price_rwf,0),low:STOCK.filter(x=>computeStatus(x.quantity,x.low_stock_threshold)==="low_stock").length,out:STOCK.filter(x=>computeStatus(x.quantity,x.low_stock_threshold)==="out_of_stock").length }, data:STOCK.map(x=>({ ...enrichStock(x),total_value:x.quantity*x.cost_price_rwf })) };
    if (r1 === "worker-performance") return WORKERS.filter(w=>w.is_active).map(w=>({ name:w.name,branch:w.branch_name,sales_count:w.monthly_sales,revenue:w.monthly_revenue,monthly_target:w.monthly_target,achievement_pct:Math.round(w.monthly_revenue/w.monthly_target*100),commission_due:Math.floor(w.monthly_revenue*w.commission_rate/100) }));
    if (r1 === "financial") { const monthly=getMonthly(); return { monthly,byBranch:[{ branch:"Nyabugogo",revenue:4820000,expenses:1850000 },{ branch:"Kimironko",revenue:3890000,expenses:1480000 }] }; }
    if (r1 === "procurement") return PROCUREMENT.map(o=>({ ...o,items_cost_cny:(o.currency==="CNY"?(o.items_cost/o.exchange_rate).toFixed(0):o.items_cost),items_cost_rwf:o.items_cost+o.shipping_cost+o.customs_cost }));
    if (r1 === "audit") return AUDIT;
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (r0 === "notifications") {
    if (!r1 && method === "GET") return NOTIFICATIONS;
    if (r1 && method === "PUT") {
      const idx = NOTIFICATIONS.findIndex(x=>x.id===parseInt(r1));
      if (idx !== -1) NOTIFICATIONS[idx].is_read = true;
      return { ok:true };
    }
  }

  return { ok:true };
}

// ─── API surface ──────────────────────────────────────────────────────────────

const api = {
  get: async (url, config) => {
    await delay();
    return { data: handle("GET", url, config?.params) };
  },
  post: async (url, body) => {
    await delay();
    try { return { data: handle("POST", url, body) }; }
    catch (e) { throw e; }
  },
  put: async (url, body) => {
    await delay();
    return { data: handle("PUT", url, body) };
  },
  delete: async (url) => {
    await delay();
    return { data: handle("DELETE", url, null) };
  },
  interceptors: { request:{ use:()=>{} }, response:{ use:()=>{} } },
};

export default api;
