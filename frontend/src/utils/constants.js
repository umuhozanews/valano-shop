export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  WORKER: "worker",
  VIEWER: "viewer",
};

export const PAYMENT_METHODS = ["cash", "momo", "bank_transfer", "credit"];

export const ITEM_CATEGORIES = [
  "T-Shirts",
  "Shirts",
  "Trousers",
  "Jeans",
  "Dresses",
  "Jackets",
  "Suits",
  "Shoes",
  "Accessories",
  "Other",
];

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Transport",
  "Customs",
  "Marketing",
  "Supplies",
  "Other",
];

export const SIZES = ["XS","S","M","L","XL","XXL","One Size","28","30","32","34","36","37","38","39","40","41","42","43","44","45"];

export const CURRENCIES = ["RWF", "CNY", "USD", "EUR"];

export const ORDER_STATUSES = ["draft", "placed", "shipped", "customs", "arrived", "cancelled"];

export const CUSTOMER_TYPES = ["retail", "wholesale", "vip"];

export const CUSTOMER_SEGMENTS = ["new", "regular", "loyal", "inactive"];

export const NAV_ITEMS = [
  {
    section: "MAIN MENU",
    items: [
      { label: "Dashboard",   icon: "LayoutDashboard", path: "/app/dashboard",     roles: ["admin","manager"] },
      { label: "Stock",       icon: "Package",         path: "/app/stock",         roles: ["admin","manager"] },
      { label: "Sales",       icon: "ShoppingCart",    path: "/app/sales",         roles: ["admin","manager","worker"] },
      { label: "Procurement", icon: "Truck",           path: "/app/procurement",   roles: ["admin","manager"] },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      { label: "Workers",   icon: "Users",     path: "/app/workers",   roles: ["admin","manager"] },
      { label: "Customers", icon: "UserCheck", path: "/app/customers", roles: ["admin","manager"] },
      { label: "Suppliers", icon: "Globe",     path: "/app/suppliers", roles: ["admin"] },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { label: "Invoices",     icon: "FileText",  path: "/app/invoices",    roles: ["admin","manager"] },
      { label: "Expenses",     icon: "Receipt",   path: "/app/expenses",    roles: ["admin","manager"] },
      { label: "Profit & Loss",icon: "TrendingUp",path: "/app/finance/pnl", roles: ["admin"] },
    ],
  },
  {
    section: "REPORTS",
    items: [
      { label: "Sales Report",       icon: "BarChart2",    path: "/app/reports/sales",   roles: ["admin","manager"] },
      { label: "Stock Report",       icon: "ClipboardList",path: "/app/reports/stock",   roles: ["admin","manager"] },
      { label: "Worker Performance", icon: "Award",        path: "/app/reports/workers", roles: ["admin","manager"] },
      { label: "Audit Log",          icon: "Shield",       path: "/app/reports/audit",   roles: ["admin"] },
    ],
  },
  {
    section: "OTHERS",
    items: [
      { label: "Notifications", icon: "Bell",     path: "/app/notifications", roles: ["admin","manager","worker"] },
      { label: "Settings",      icon: "Settings", path: "/app/settings",      roles: ["admin"] },
    ],
  },
];
