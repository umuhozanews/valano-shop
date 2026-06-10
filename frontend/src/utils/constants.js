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
      section: "MANAGEMENT",
      items: [
        { label: "Workers",   icon: "Users",     path: "/app/workers",   roles: ["admin","manager"] },
        { label: "Expenses",  icon: "Receipt",   path: "/app/expenses",    roles: ["admin","manager"] },
        { label: "Settings",  icon: "Settings",  path: "/app/settings",      roles: ["admin"] },
      ],
    },
  ];

  const businessSpecific = {
    [BUSINESS_TYPES.INDUSTRY]: [
      {
        section: "PRODUCTION",
        items: [
          { label: "Dashboard",       icon: "LayoutDashboard", path: "/app/dashboard" },
          { label: "Production Runs",  icon: "Factory",         path: "/app/production" },
          { label: "Raw Materials",    icon: "Box",            path: "/app/stock" },
          { label: "Finished Goods",   icon: "Package",         path: "/app/finished-goods" },
        ],
      },
      {
        section: "SUPPLY CHAIN",
        items: [
          { label: "Wholesale Orders", icon: "ShoppingCart",    path: "/app/sales" },
          { label: "Suppliers",        icon: "Truck",           path: "/app/suppliers" },
          { label: "Procurement",      icon: "ClipboardList",   path: "/app/procurement" },
        ],
      },
    ],
    [BUSINESS_TYPES.SHOP]: [
      {
        section: "SALES",
        items: [
          { label: "Dashboard",   icon: "LayoutDashboard", path: "/app/dashboard" },
          { label: "Stock",       icon: "Package",         path: "/app/stock" },
          { label: "Retail Sales",icon: "ShoppingCart",    path: "/app/sales" },
          { label: "Customers",   icon: "UserCheck",       path: "/app/customers" },
        ],
      },
      {
        section: "FINANCE",
        items: [
          { label: "Invoices",     icon: "FileText",  path: "/app/invoices" },
          { label: "Profit & Loss",icon: "TrendingUp",path: "/app/finance/pnl", roles: ["admin"] },
        ],
      },
    ],
    [BUSINESS_TYPES.REAL_ESTATE]: [
      {
        section: "REAL ESTATE",
        items: [
          { label: "Dashboard",   icon: "LayoutDashboard", path: "/app/dashboard" },
          { label: "Properties",  icon: "Home",            path: "/app/properties" },
          { label: "Tenants",     icon: "Users",           path: "/app/tenants" },
          { label: "Rent Payments", icon: "Key",           path: "/app/sales" },
        ],
      },
      {
        section: "OPERATIONS",
        items: [
          { label: "Maintenance",  icon: "Wrench",          path: "/app/maintenance" },
          { label: "Profit & Loss",icon: "TrendingUp",      path: "/app/finance/pnl", roles: ["admin"] },
        ],
      },
    ],
  };

  return [...(businessSpecific[type] || []), ...common];
};
