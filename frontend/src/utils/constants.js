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
    section: "MAIN",
    items: [
      { label: "Dashboard",     icon: "LayoutDashboard", path: "/app/dashboard"  },
      { label: "Point of Sale", icon: "ShoppingCart",    path: "/app/sales/new", roles: ["pulse_admin","sme_owner","admin","manager","cashier"] },
      { label: "Sales History", icon: "Receipt",         path: "/app/sales",     roles: ["pulse_admin","sme_owner","admin","manager","accountant","cashier"] },
    ],
  },
  {
    section: "INVENTORY",
    items: [
      { label: "Stock",           icon: "Package",       path: "/app/stock",               roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Purchase Orders", icon: "Truck",         path: "/app/purchase-orders",      roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Suppliers",       icon: "Globe",         path: "/app/suppliers",            roles: ["pulse_admin","sme_owner","admin","accountant"] },
    ],
  },
  {
    section: "CRM",
    items: [
      { label: "Customers",    icon: "UserCheck",  path: "/app/customers",          roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Receivables",  icon: "Scale",      path: "/app/receivables",        roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { label: "Expenses",     icon: "CreditCard",  path: "/app/expenses",          roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Invoices",     icon: "FileText",    path: "/app/invoices",          roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Profit & Loss",icon: "TrendingUp",  path: "/app/finance/pnl",       roles: ["pulse_admin","sme_owner","admin","accountant"] },
    ],
  },
  {
    section: "REPORTS",
    items: [
      { label: "Sales Report",    icon: "BarChart2",     path: "/app/reports/sales",    roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Stock Report",    icon: "ClipboardList", path: "/app/reports/stock",    roles: ["pulse_admin","sme_owner","admin","manager","accountant"] },
      { label: "Tax Reports",     icon: "Shield",        path: "/app/reports/tax",      roles: ["pulse_admin","sme_owner","admin","accountant"] },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { label: "Health Score",    icon: "Activity",      path: "/app/health-score",     roles: ["pulse_admin","sme_owner","admin"] },
      { label: "Notifications",   icon: "Bell",          path: "/app/notifications" },
    ],
  },
  {
    section: "ADMIN",
    items: [
      { label: "Audit Log",       icon: "Shield",        path: "/app/reports/audit",    roles: ["pulse_admin","admin"] },
      { label: "Settings",        icon: "Settings",      path: "/app/settings",         roles: ["pulse_admin","sme_owner","admin"] },
      { label: "Pulse Admin",     icon: "Activity",      path: "/app/admin",            roles: ["pulse_admin"] },
    ],
  },
  {
    section: "LENDER",
    items: [
      { label: "Portfolio",       icon: "TrendingUp",    path: "/app/lender",           roles: ["lender","pulse_admin"] },
    ],
  },
];
