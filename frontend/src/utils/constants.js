export const ROLES = {
  OWNER: "admin",
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

export const BUSINESS_TYPES = {
  INDUSTRY: "industry",
  SHOP: "shop",
  REAL_ESTATE: "real_estate",
};

export const BUSINESSES = [
  { id: "b1", type: BUSINESS_TYPES.INDUSTRY,    name: "KNOTTY INDUSTRY", color: "#006C49" },
  { id: "b2", type: BUSINESS_TYPES.SHOP,        name: "KNOTTY FASHION",   color: "#1e3a8a" },
  { id: "b3", type: BUSINESS_TYPES.REAL_ESTATE, name: "KNOTTY ESTATES",   color: "#7c2d12" },
];

export const NAV_ITEMS = (activeBusiness) => {
  const type = activeBusiness?.type || BUSINESS_TYPES.SHOP;
  
  const common = [
    {
      section: "FINANCE",
      items: [
        { label: "Expenses",     icon: "Receipt",   path: "/app/expenses",    roles: ["admin","manager"] },
        { label: "Profit & Loss",icon: "TrendingUp",path: "/app/finance/pnl", roles: ["admin"] },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        { label: "Workers",   icon: "Users",     path: "/app/workers",   roles: ["admin","manager"] },
        { label: "Audit Log", icon: "Shield",    path: "/app/reports/audit",   roles: ["admin"] },
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

  const businessSpecific = {
    [BUSINESS_TYPES.INDUSTRY]: [
      {
        section: "PRODUCTION",
        items: [
          { label: "Dashboard",   icon: "LayoutDashboard", path: "/app/dashboard",     roles: ["admin","manager"] },
          { label: "Production",  icon: "Factory",         path: "/app/production",    roles: ["admin","manager"] },
          { label: "Raw Materials", icon: "Box",           path: "/app/stock",         roles: ["admin","manager"] },
          { label: "Procurement", icon: "Truck",           path: "/app/procurement",   roles: ["admin","manager"] },
        ],
      },
    ],
    [BUSINESS_TYPES.SHOP]: [
      {
        section: "SALES",
        items: [
          { label: "Dashboard",   icon: "LayoutDashboard", path: "/app/dashboard",     roles: ["admin","manager"] },
          { label: "Stock",       icon: "Package",         path: "/app/stock",         roles: ["admin","manager"] },
          { label: "Sales",       icon: "ShoppingCart",    path: "/app/sales",         roles: ["admin","manager","worker"] },
          { label: "Customers",   icon: "UserCheck",       path: "/app/customers",     roles: ["admin","manager"] },
        ],
      },
    ],
    [BUSINESS_TYPES.REAL_ESTATE]: [
      {
        section: "REAL ESTATE",
        items: [
          { label: "Dashboard",   icon: "LayoutDashboard", path: "/app/dashboard",     roles: ["admin","manager"] },
          { label: "Properties",  icon: "Home",            path: "/app/properties",    roles: ["admin","manager"] },
          { label: "Tenants",     icon: "Users",           path: "/app/tenants",       roles: ["admin","manager"] },
          { label: "Rent Payments", icon: "Key",           path: "/app/sales",         roles: ["admin","manager"] },
        ],
      },
    ],
  };

  return [...(businessSpecific[type] || []), ...common];
};
