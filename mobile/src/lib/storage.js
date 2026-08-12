// DataBridge Mobile App Persistent Local Engine & Storage Helper
// Shares the exact same keys as the main Inzira Insights system so data stays synchronized

const K_STOCK = "FASHION_STOCK";
const K_SALES = "FASHION_SALES";
const K_EXPENSES = "FASHION_EXPENSES";
const K_SUPPLIERS = "FASHION_SUPPLIERS";
const K_INVOICES = "FASHION_INVOICES";
const K_CUSTOMERS = "FASHION_CUSTOMERS";

function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("databridge:data_changed"));
  }
}

function getJSON(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    notifyDataChanged();
  } catch (e) {
    console.error("Storage write error:", e);
  }
}

const nowIso = () => new Date().toISOString();
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

function initDefaults() {
  if (!localStorage.getItem(K_STOCK)) {
    setJSON(K_STOCK, [
      { id: 1, name: "Winter Puffer Jacket", category: "Jackets", size: "M", color: "Black", quantity: 24, cost_price_rwf: 18000, sell_price_rwf: 35000, low_stock_threshold: 5, barcode: "VL-00001", created_at: daysAgo(30) },
      { id: 2, name: "Slim Fit Chinos", category: "Trousers", size: "32", color: "Khaki", quantity: 3, cost_price_rwf: 9500, sell_price_rwf: 18000, low_stock_threshold: 5, barcode: "VL-00002", created_at: daysAgo(28) },
      { id: 3, name: "Floral Summer Dress", category: "Dresses", size: "S", color: "Red", quantity: 18, cost_price_rwf: 12000, sell_price_rwf: 25000, low_stock_threshold: 5, barcode: "VL-00003", created_at: daysAgo(25) },
      { id: 4, name: "Classic White Shirt", category: "Shirts", size: "L", color: "White", quantity: 0, cost_price_rwf: 7000, sell_price_rwf: 14000, low_stock_threshold: 5, barcode: "VL-00004", created_at: daysAgo(22) },
      { id: 5, name: "Hoodie Fleece", category: "Hoodies", size: "XL", color: "Navy", quantity: 11, cost_price_rwf: 14000, sell_price_rwf: 28000, low_stock_threshold: 5, barcode: "VL-00005", created_at: daysAgo(20) },
      { id: 6, name: "Leather Ankle Boots", category: "Shoes", size: "40", color: "Brown", quantity: 8, cost_price_rwf: 22000, sell_price_rwf: 45000, low_stock_threshold: 3, barcode: "VL-00006", created_at: daysAgo(18) },
      { id: 7, name: "Cargo Trousers", category: "Trousers", size: "34", color: "Olive", quantity: 15, cost_price_rwf: 11000, sell_price_rwf: 22000, low_stock_threshold: 5, barcode: "VL-00007", created_at: daysAgo(16) },
      { id: 8, name: "Polo T-Shirt", category: "Shirts", size: "M", color: "Sky Blue", quantity: 4, cost_price_rwf: 6000, sell_price_rwf: 12000, low_stock_threshold: 5, barcode: "VL-00008", created_at: daysAgo(14) }
    ]);
  }

  if (!localStorage.getItem(K_SALES)) {
    setJSON(K_SALES, [
      { id: 1, invoice_number: "VL-2026-001", customer_name: "Celestine Nyirahabimana", worker_name: "Jean Pierre Habimana", items_count: 5, payment_method: "mtn_momo", total_amount: 145000, amount_paid: 145000, is_debt: false, created_at: daysAgo(1), is_voided: false },
      { id: 2, invoice_number: "VL-2026-002", customer_name: "Walk-in Customer", worker_name: "Marie Uwamahoro", items_count: 2, payment_method: "cash", total_amount: 52000, amount_paid: 52000, is_debt: false, created_at: daysAgo(1), is_voided: false },
      { id: 3, invoice_number: "VL-2026-003", customer_name: "Alliance Fashion Shop", worker_name: "Rukundo Joseph", items_count: 8, payment_method: "mtn_momo", total_amount: 280000, amount_paid: 100000, is_debt: true, remaining_debt: 180000, due_date: daysAgo(-5).split("T")[0], created_at: daysAgo(2), is_voided: false },
      { id: 4, invoice_number: "VL-2026-004", customer_name: "Olivier Hakizimana", worker_name: "Eric Ndayisabye", items_count: 3, payment_method: "cash", total_amount: 78000, amount_paid: 78000, is_debt: false, created_at: daysAgo(2), is_voided: false }
    ]);
  }

  if (!localStorage.getItem(K_EXPENSES)) {
    setJSON(K_EXPENSES, [
      { id: 1, category: "Shop Rent", amount: 150000, description: "Monthly shop rent - Nyabugogo", expense_date: daysAgo(2).split("T")[0], created_at: daysAgo(2) },
      { id: 2, category: "Transport", amount: 25000, description: "Cargo delivery from airport", expense_date: daysAgo(4).split("T")[0], created_at: daysAgo(4) },
      { id: 3, category: "Utilities", amount: 35000, description: "Electricity & Water bill", expense_date: daysAgo(7).split("T")[0], created_at: daysAgo(7) },
      { id: 4, category: "Packaging", amount: 12000, description: "Branded shopping bags", expense_date: daysAgo(10).split("T")[0], created_at: daysAgo(10) }
    ]);
  }

  if (!localStorage.getItem(K_SUPPLIERS)) {
    setJSON(K_SUPPLIERS, [
      { id: 1, name: "Guangzhou Fashion Co.", wechat: "gzfashion2024", whatsapp: "+8613800000001", city: "Guangzhou", country: "China", specialty: "T-Shirts, Casual Wear" },
      { id: 2, name: "Yiwu Wholesale Hub", wechat: "yiwuhub_trade", whatsapp: "+8613800000002", city: "Yiwu", country: "China", specialty: "Accessories, Mixed Clothing" },
      { id: 3, name: "Shenzhen Style Ltd.", wechat: "szstylelimited", whatsapp: "+8613800000003", city: "Shenzhen", country: "China", specialty: "Formal Wear, Suits" }
    ]);
  }

  if (!localStorage.getItem(K_INVOICES)) {
    setJSON(K_INVOICES, [
      { id: 1, invoice_number: "INV-2026-001", customer_name: "Celestine Nyirahabimana", total_amount: 145000, status: "paid", issued_at: daysAgo(1), due_date: daysAgo(-7).split("T")[0], notes: "Paid via MTN MoMo" },
      { id: 2, invoice_number: "INV-2026-002", customer_name: "Alliance Fashion Shop", total_amount: 280000, status: "unpaid", issued_at: daysAgo(2), due_date: daysAgo(-5).split("T")[0], notes: "Partial Payment - 180,000 RWF remaining debt" },
      { id: 3, invoice_number: "INV-2026-003", customer_name: "Olivier Hakizimana", total_amount: 78000, status: "paid", issued_at: daysAgo(3), due_date: daysAgo(-3).split("T")[0], notes: "Cash payment" }
    ]);
  }
}

initDefaults();

export const StorageEngine = {
  // ── Stock Operations ──
  getStock() {
    return getJSON(K_STOCK);
  },
  saveStockItem(item) {
    const list = getJSON(K_STOCK);
    if (item.id) {
      const idx = list.findIndex(x => x.id === item.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...item };
      else list.push(item);
    } else {
      const newId = Math.max(0, ...list.map(x => x.id)) + 1;
      const newItem = {
        id: newId,
        barcode: `VL-${String(newId).padStart(5, "0")}`,
        created_at: nowIso(),
        ...item,
        quantity: Number(item.quantity) || 0,
        cost_price_rwf: Number(item.cost_price_rwf) || 0,
        sell_price_rwf: Number(item.sell_price_rwf) || 0,
        low_stock_threshold: Number(item.low_stock_threshold) || 5
      };
      list.unshift(newItem);
      item = newItem;
    }
    setJSON(K_STOCK, list);
    return item;
  },
  deleteStockItem(id) {
    const list = getJSON(K_STOCK).filter(x => x.id !== id);
    setJSON(K_STOCK, list);
  },

  // ── Sales Operations ──
  getSales() {
    return getJSON(K_SALES);
  },
  createSale({ items, payment_method, customer_name, worker_name, amount_paid, due_date, is_partial }) {
    const sales = getJSON(K_SALES);
    const stock = getJSON(K_STOCK);
    const invoices = getJSON(K_INVOICES);

    let totalAmount = 0;
    let totalItems = 0;

    items.forEach(line => {
      totalItems += Number(line.quantity) || 0;
      totalAmount += (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

      const stItem = stock.find(s => s.id === line.stock_item_id);
      if (stItem) {
        stItem.quantity = Math.max(0, (Number(stItem.quantity) || 0) - (Number(line.quantity) || 0));
      }
    });

    setJSON(K_STOCK, stock);

    const paidVal = is_partial ? Math.max(0, Number(amount_paid) || 0) : totalAmount;
    const remainingDebt = Math.max(0, totalAmount - paidVal);
    const isDebt = remainingDebt > 0;

    const saleId = Math.max(0, ...sales.map(x => x.id)) + 1;
    const invNo = `VL-2026-${String(saleId).padStart(3, "0")}`;

    const newSale = {
      id: saleId,
      invoice_number: invNo,
      customer_name: customer_name || "Walk-in Customer",
      worker_name: worker_name || "DataBridge Mobile User",
      items_count: totalItems,
      payment_method: payment_method || "cash",
      total_amount: totalAmount,
      amount_paid: paidVal,
      remaining_debt: remainingDebt,
      is_debt: isDebt,
      due_date: due_date || null,
      created_at: nowIso(),
      is_voided: false,
      items
    };

    sales.unshift(newSale);
    setJSON(K_SALES, sales);

    // Create matching invoice & debt receivable
    const invId = Math.max(0, ...invoices.map(x => x.id)) + 1;
    invoices.unshift({
      id: invId,
      invoice_number: `INV-2026-${String(invId).padStart(3, "0")}`,
      customer_name: newSale.customer_name,
      total_amount: totalAmount,
      status: isDebt ? "unpaid" : "paid",
      issued_at: nowIso(),
      due_date: due_date || nowIso().split("T")[0],
      notes: isDebt ? `Partial Sale / Debt: Paid ${paidVal.toLocaleString()} RWF, Debt ${remainingDebt.toLocaleString()} RWF` : `Full sale via ${payment_method}`
    });
    setJSON(K_INVOICES, invoices);

    return newSale;
  },
  voidSale(saleId) {
    const sales = getJSON(K_SALES);
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      sale.is_voided = true;
      setJSON(K_SALES, sales);
    }
  },

  // ── Expenses Operations ──
  getExpenses() {
    return getJSON(K_EXPENSES);
  },
  saveExpense(exp) {
    const list = getJSON(K_EXPENSES);
    if (exp.id) {
      const idx = list.findIndex(x => x.id === exp.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...exp };
    } else {
      const newId = Math.max(0, ...list.map(x => x.id)) + 1;
      const newExp = {
        id: newId,
        category: exp.category,
        amount: Number(exp.amount) || 0,
        description: exp.description || "",
        expense_date: exp.expense_date || nowIso().split("T")[0],
        created_at: nowIso()
      };
      list.unshift(newExp);
      exp = newExp;
    }
    setJSON(K_EXPENSES, list);
    return exp;
  },
  deleteExpense(id) {
    const list = getJSON(K_EXPENSES).filter(x => x.id !== id);
    setJSON(K_EXPENSES, list);
  },

  // ── Suppliers Operations ──
  getSuppliers() {
    return getJSON(K_SUPPLIERS);
  },
  saveSupplier(sup) {
    const list = getJSON(K_SUPPLIERS);
    if (sup.id) {
      const idx = list.findIndex(x => x.id === sup.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...sup };
    } else {
      const newId = Math.max(0, ...list.map(x => x.id)) + 1;
      const newSup = { id: newId, ...sup };
      list.unshift(newSup);
      sup = newSup;
    }
    setJSON(K_SUPPLIERS, list);
    return sup;
  },
  deleteSupplier(id) {
    const list = getJSON(K_SUPPLIERS).filter(x => x.id !== id);
    setJSON(K_SUPPLIERS, list);
  },

  // ── Invoices Operations ──
  getInvoices() {
    return getJSON(K_INVOICES);
  },
  saveInvoice(inv) {
    const list = getJSON(K_INVOICES);
    if (inv.id) {
      const idx = list.findIndex(x => x.id === inv.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...inv };
    } else {
      const newId = Math.max(0, ...list.map(x => x.id)) + 1;
      const newInv = {
        id: newId,
        invoice_number: `INV-2026-${String(newId).padStart(3, "0")}`,
        customer_name: inv.customer_name || "Customer",
        total_amount: Number(inv.total_amount) || 0,
        status: inv.status || "unpaid",
        issued_at: nowIso(),
        due_date: inv.due_date || nowIso().split("T")[0],
        notes: inv.notes || ""
      };
      list.unshift(newInv);
      inv = newInv;
    }
    setJSON(K_INVOICES, list);
    return inv;
  },
  markInvoicePaid(id) {
    const list = getJSON(K_INVOICES);
    const item = list.find(x => x.id === id);
    if (item) {
      item.status = "paid";
      setJSON(K_INVOICES, list);
    }
  },
  deleteInvoice(id) {
    const list = getJSON(K_INVOICES).filter(x => x.id !== id);
    setJSON(K_INVOICES, list);
  }
};
