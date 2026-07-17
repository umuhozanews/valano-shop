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
export const NAV_ITEMS = [
  {
    section: "MAIN", tKey: "nav_main",
    items: [
      { label: "Dashboard",     tKey: "dashboard",      icon: "LayoutDashboard", path: "/app/dashboard",  roles: ["pulse_admin","sme_owner","admin","manager","accountant","databridge_advisor"] },
      { label: "Point of Sale", tKey: "point_of_sale",  icon: "ShoppingCart",    path: "/app/sales/new",  roles: ["pulse_admin","sme_owner","admin","manager","cashier"] },
      { label: "Sales History", tKey: "sales_history",  icon: "Receipt",         path: "/app/sales",      roles: ["pulse_admin","sme_owner","admin","manager","accountant","cashier"] },
    ],
  },
  {
    section: "INVENTORY", tKey: "nav_inventory",
    items: [
      { label: "SITOKE",          tKey: "stock",           icon: "Package",       path: "/app/stock",            roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Purchase Orders", tKey: "purchase_orders", icon: "Truck",         path: "/app/purchase-orders",  roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Suppliers",       tKey: "suppliers",       icon: "Globe",         path: "/app/suppliers",        roles: ["pulse_admin","sme_owner","admin","accountant"] },
    ],
  },
  {
    section: "CRM", tKey: "nav_crm",
    items: [
      { label: "Customers",    tKey: "customers",   icon: "UserCheck",  path: "/app/customers",   roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Receivables",  tKey: "receivables", icon: "Scale",      path: "/app/receivables", roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Payables",     tKey: "payables",    icon: "CreditCard", path: "/app/payables",    roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
    ],
  },
  {
    section: "FINANCE", tKey: "nav_finance",
    items: [
      { label: "Expenses",         tKey: "expenses",         icon: "CreditCard", path: "/app/expenses",     roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Invoices",         tKey: "invoices",         icon: "FileText",   path: "/app/invoices",     roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Profit & Loss",    tKey: "profit_loss",      icon: "TrendingUp", path: "/app/finance/pnl",  roles: ["pulse_admin","sme_owner","admin","accountant"] },
      { label: "Financial Books",  tKey: "financial_books",  icon: "BookOpen",   path: "/app/books",        roles: ["pulse_admin","sme_owner","admin","accountant"] },
    ],
  },
  {
    section: "REPORTS", tKey: "nav_reports",
    items: [
      { label: "Sales Report",  tKey: "sales_report",  icon: "BarChart2",     path: "/app/reports/sales", roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Stock Report",  tKey: "stock_report",  icon: "ClipboardList", path: "/app/reports/stock", roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Tax Reports",   tKey: "tax_reports",   icon: "Shield",        path: "/app/reports/tax",   roles: ["pulse_admin","sme_owner","admin","accountant"] },
    ],
  },
  {
    section: "INTELLIGENCE", tKey: "nav_intelligence",
    items: [
      { label: "Health Score",  tKey: "health_score",  icon: "Activity", path: "/app/health-score",  roles: ["pulse_admin","sme_owner","admin"] },
      { label: "Notifications", tKey: "notifications", icon: "Bell",     path: "/app/notifications", roles: ["pulse_admin","sme_owner","admin","manager","accountant","cashier","databridge_advisor","lender"] },
    ],
  },
  {
    section: "ADMIN", tKey: "nav_admin",
    items: [
      { label: "Audit Log",   tKey: "audit_log",    icon: "Shield",   path: "/app/reports/audit", roles: ["pulse_admin","admin"] },
      { label: "Settings",    tKey: "settings",     icon: "Settings", path: "/app/settings",      roles: ["pulse_admin","sme_owner","admin"] },
      { label: "Pulse Admin", tKey: "pulse_admin",  icon: "Activity", path: "/app/admin",         roles: ["pulse_admin"] },
    ],
  },
  {
    section: "LENDER", tKey: "nav_lender",
    items: [
      { label: "Portfolio", tKey: "portfolio", icon: "TrendingUp", path: "/app/lender", roles: ["lender","pulse_admin"] },
    ],
  },
];
