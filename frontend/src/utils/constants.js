export const ROLES = {
  PULSE_ADMIN:      "pulse_admin",
  SME_OWNER:        "sme_owner",
  ADMIN:            "admin",
  MANAGER:          "manager",
  ACCOUNTANT:       "accountant",
  CASHIER:          "cashier",
  ADVISOR:          "databridge_advisor",
  LENDER:           "lender",
  VIEWER:           "viewer",
};

export const PAYMENT_METHODS = [
  "cash", "mtn_momo", "airtel", "card", "bank_transfer", "credit", "split"
];

export const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Transport", "Marketing",
  "Supplies", "Maintenance", "Loan Repayment", "Other",
];

// Keep for backward compat with StockList
export const ITEM_CATEGORIES = [
  "Groceries", "Beverages", "Hygiene", "Electronics", "Clothing",
  "Hardware", "Stationery", "Medicine", "Agriculture", "Other",
];
export const SIZES = ["XS","S","M","L","XL","XXL","One Size"];

export const STOCK_UNITS = [
  "pcs", "kg", "g", "litre", "ml", "packet", "box", "sack", "bottle", "pair", "roll", "sheet",
];

export const CURRENCIES = ["RWF", "USD", "EUR", "KES", "UGX"];

export const SECTORS = [
  "Retail Shop", "Wholesale", "Restaurant / Food", "Salon / Beauty",
  "Pharmacy", "Hardware", "Agribusiness", "Transport", "Construction",
  "Education", "Health", "Technology", "Other",
];

export const DISTRICTS = [
  "Gasabo", "Kicukiro", "Nyarugenge",
  "Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana",
  "Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo",
  "Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango",
  "Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rutsiro", "Rusizi",
];

export const CUSTOMER_TYPES    = ["retailer", "wholesaler", "vip"];
export const CUSTOMER_SEGMENTS = ["new", "regular", "loyal", "inactive"];

// ─── Navigation — Inzira Insights structure from PRD ─────────────────────────
// Role sets — manager/cashier = POS only; accountant = finance; sme_owner/admin = full
const OWNER_FIN = ["pulse_admin","sme_owner","admin","accountant"];
const OWNER_OPS = ["pulse_admin","sme_owner","admin"];

export const NAV_ITEMS = [
  {
    section: "MAIN", tKey: "nav_main",
    items: [
      { label: "Dashboard",     tKey: "dashboard",      icon: "LayoutDashboard", path: "/app/dashboard",  roles: ["pulse_admin","sme_owner","admin","accountant","databridge_advisor"] },
      { label: "Point of Sale", tKey: "point_of_sale",  icon: "ShoppingCart",    path: "/app/sales/new",  roles: ["pulse_admin","sme_owner","admin","manager","cashier"] },
      { label: "Sales History", tKey: "sales_history",  icon: "Receipt",         path: "/app/sales",      roles: ["pulse_admin","sme_owner","admin","accountant","manager","cashier"] },
    ],
  },
  {
    section: "INVENTORY", tKey: "nav_inventory",
    items: [
      { label: "SITOKE",          tKey: "stock",           icon: "Package",       path: "/app/stock",            roles: OWNER_FIN },
      { label: "Purchase Orders", tKey: "purchase_orders", icon: "Truck",         path: "/app/purchase-orders",  roles: OWNER_FIN },
      { label: "Suppliers",       tKey: "suppliers",       icon: "Globe",         path: "/app/suppliers",        roles: OWNER_FIN },
    ],
  },
  {
    section: "CRM", tKey: "nav_crm",
    items: [
      { label: "Customers",    tKey: "customers",   icon: "UserCheck",  path: "/app/customers",   roles: OWNER_FIN },
      { label: "Receivables",  tKey: "receivables", icon: "Scale",      path: "/app/receivables", roles: OWNER_FIN },
      { label: "Payables",     tKey: "payables",    icon: "CreditCard", path: "/app/payables",    roles: OWNER_FIN },
    ],
  },
  {
    section: "FINANCE", tKey: "nav_finance",
    items: [
      { label: "Expenses",         tKey: "expenses",         icon: "CreditCard", path: "/app/expenses",     roles: OWNER_FIN },
      { label: "Invoices",         tKey: "invoices",         icon: "FileText",   path: "/app/invoices",     roles: OWNER_FIN },
      { label: "Profit & Loss",    tKey: "profit_loss",      icon: "TrendingUp", path: "/app/finance/pnl",  roles: OWNER_FIN },
      { label: "Financial Books",  tKey: "financial_books",  icon: "BookOpen",   path: "/app/books",        roles: OWNER_FIN },
    ],
  },
  {
    section: "REPORTS", tKey: "nav_reports",
    items: [
      { label: "Sales Report",  tKey: "sales_report",  icon: "BarChart2",     path: "/app/reports/sales", roles: OWNER_FIN },
      { label: "Stock Report",  tKey: "stock_report",  icon: "ClipboardList", path: "/app/reports/stock", roles: OWNER_FIN },
      { label: "Tax Reports",   tKey: "tax_reports",   icon: "Shield",        path: "/app/reports/tax",   roles: OWNER_FIN },
    ],
  },
  {
    section: "INTELLIGENCE", tKey: "nav_intelligence",
    items: [
      { label: "Health Score",  tKey: "health_score",  icon: "Activity", path: "/app/health-score",  roles: OWNER_OPS },
      { label: "Notifications", tKey: "notifications", icon: "Bell",     path: "/app/notifications", roles: ["pulse_admin","sme_owner","admin","manager","accountant","cashier","databridge_advisor","lender"] },
    ],
  },
  {
    section: "ADMIN", tKey: "nav_admin",
    items: [
      { label: "Audit Log",   tKey: "audit_log",    icon: "Shield",   path: "/app/reports/audit", roles: ["pulse_admin","admin"] },
      { label: "Settings",    tKey: "settings",     icon: "Settings", path: "/app/settings",      roles: ["pulse_admin","sme_owner","admin","databridge_advisor","lender"] },
      { label: "Pulse Admin", tKey: "pulse_admin",  icon: "Activity", path: "/app/admin",         roles: ["pulse_admin"] },
    ],
  },
  {
    section: "ADVISOR", tKey: "nav_advisor",
    items: [
      { label: "Advisor Portal", tKey: "advisor_portal", icon: "Activity", path: "/app/advisor", roles: ["databridge_advisor","pulse_admin"] },
    ],
  },
  {
    section: "LENDER", tKey: "nav_lender",
    items: [
      { label: "Lender Portfolio", tKey: "portfolio", icon: "TrendingUp", path: "/app/lender", roles: ["lender","pulse_admin"] },
    ],
  },
];
