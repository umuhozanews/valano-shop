import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LanguageContext = createContext(null);

const TRANSLATIONS = {
  en: {
    // Nav Sections
    main_menu: "Main Menu",
    management: "Management",
    finance: "Finance",
    reports: "Reports",
    others: "Others",
    production_nav: "Production",
    real_estate: "Real Estate",

    // Nav Items
    dashboard: "Dashboard",
    stock: "Stock",
    sales: "Sales",
    procurement: "Procurement",
    workers: "Workers",
    customers: "Customers",
    suppliers: "Suppliers",
    invoices: "Invoices",
    expenses: "Expenses",
    profit_loss: "Profit & Loss",
    sales_report: "Sales Report",
    stock_report: "Stock Report",
    worker_performance: "Worker Performance",
    audit_log: "Audit Log",
    notifications: "Notifications",
    settings: "Settings",
    raw_materials: "Raw Materials",
    properties: "Properties",
    tenants: "Tenants",
    rent_payments: "Rent Payments",
    
    // Businesses
    industry: "KNOTTY INDUSTRY",
    shop: "KNOTTY FASHION",
    real_estate_biz: "KNOTTY ESTATES",
    switch_business: "Switch Business",
    
    // Auth
    welcome_back: "Welcome back",
    sign_in_account: "Sign in to your account",
    email: "Email address",
    password: "Password",
    remember_me: "Remember me",
    sign_in: "Sign In",
    signing_in: "Signing in...",
    login_failed: "Login failed. Check your credentials.",
    
    // General Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    loading: "Loading...",
    actions: "Actions",
    view: "View",
    print: "Print",
    export: "Export",
    filter: "Filter",
    clear: "Clear",
    all: "All",
    status: "Status",
    date: "Date",
    total: "Total",
    amount: "Amount",
    name: "Name",
    phone: "Phone",
    category: "Category",
    description: "Description",
    success: "Success",
    error: "Error",
    confirm_delete: "Are you sure you want to delete this?",

    // Dashboard
    total_revenue: "Total Revenue",
    total_sales: "Total Sales",
    stock_value: "Stock Value",
    active_workers: "Active Workers",
    recent_activity: "Recent Activity",
    top_selling_items: "Top Selling Items",
    sales_trend: "Sales Trend",
    low_stock_alerts: "Low Stock Alerts",
    items_sold: "items sold",

    // Stock & Production
    add_item: "Add Item",
    item_name: "Item Name",
    barcode: "Barcode",
    quantity: "Quantity",
    cost_price: "Cost Price",
    selling_price: "Selling Price",
    min_stock: "Min Stock",
    size: "Size",
    color: "Color",
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    transfer_stock: "Transfer Stock",
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",

    // Sales & Rent
    new_sale: "New Sale",
    invoice_no: "Invoice No",
    customer: "Customer",
    payment_method: "Payment Method",
    subtotal: "Subtotal",
    tax: "Tax",
    grand_total: "Grand Total",
    void_sale: "Void Sale",
    sale_details: "Sale Details",
    cash: "Cash",
    momo: "Mobile Money",
    bank: "Bank Transfer",

    // Real Estate
    occupied: "Occupied",
    vacant: "Vacant",
    partial: "Partial",
    address: "Address",
    rent_status: "Rent Status",
    paid: "Paid",
    pending: "Pending",

    // Finance
    revenue: "Revenue",
    cogs: "COGS (Cost of Goods)",
    gross_profit: "Gross Profit",
    net_profit: "Net Profit",
    operating_expenses: "Operating Expenses",
    monthly_summary: "Monthly Summary",

    // Settings
    business_info: "Business Information",
    shop_name: "Shop Name",
    address_label: "Address",
    city: "City",
    currency: "Currency",
    language: "Language",
    roles_permissions: "Roles & Permissions",
  },
  rw: {
    // Nav Sections
    main_menu: "Ibikoreshwa cyane",
    management: "Imicungire",
    finance: "Imari",
    reports: "Raporo",
    others: "Ibindi",
    production_nav: "Umusaruro",
    real_estate: "Inyubako",

    // Nav Items
    dashboard: "Incamake",
    stock: "Ububiko",
    sales: "Icuruzwa",
    procurement: "Ibyaranguwe",
    workers: "Abakozi",
    customers: "Abaguzi",
    suppliers: "Abaranguza",
    invoices: "Inyemezabwishyu",
    expenses: "Ayakoreshejwe",
    profit_loss: "Inyungu n'Igihombo",
    sales_report: "Raporo y'Icuruzwa",
    stock_report: "Raporo y'Ububiko",
    worker_performance: "Imikorere y'Abakozi",
    audit_log: "Ibyabaye muri sisitemu",
    notifications: "Imenyesha",
    settings: "Igenamiterere",
    raw_materials: "Ibikoresho by'ibanze",
    properties: "Inyubako",
    tenants: "Abapangayi",
    rent_payments: "Ubukode",
    
    // Businesses
    industry: "KNOTTY INDUSTRY",
    shop: "KNOTTY FASHION",
    real_estate_biz: "KNOTTY ESTATES",
    switch_business: "Hindura Ubucuruzi",
    
    // Auth
    welcome_back: "Muraho, ikaze nanone",
    sign_in_account: "Injira muri sisitemu",
    email: "Imeri yawe",
    password: "Ijambo ry'ibanga",
    remember_me: "Nyibuka",
    sign_in: "Injira",
    signing_in: "Turacyinjira...",
    login_failed: "Kwinjira ntibyakunze. Reba imeri cyangwa ijambo ry'ibanga.",
    
    // General Actions
    save: "Bika",
    cancel: "Reka",
    delete: "Siba",
    edit: "Hindura",
    add: "Ongeraho",
    search: "Shaka",
    loading: "Biracyatunganywa...",
    actions: "Ibikorerwa",
    view: "Reba",
    print: "Sohora",
    export: "Bika hanze",
    filter: "Hitamo",
    clear: "Hanagura",
    all: "Byose",
    status: "Imiterere",
    date: "Itariki",
    total: "Iteranyirizo",
    amount: "Ayishyuwe",
    name: "Izina",
    phone: "Telefoni",
    category: "Icyiciro",
    description: "Ibisobanuro",
    success: "Byagenze neza",
    error: "Habaye ikosa",
    confirm_delete: "Wizeye neza ko ushaka gusiba ibi?",

    // Dashboard
    total_revenue: "Amafaranga yose yinjiye",
    total_sales: "Icuruzwa ryose",
    stock_value: "Agaciro k'ububiko",
    active_workers: "Abakozi bahari",
    recent_activity: "Ibiherutse gukorwa",
    top_selling_items: "Ibicuruzwa bikunzwe",
    sales_trend: "Imiterere y'icuruzwa",
    low_stock_alerts: "Ibirimo gushira mu bubiko",
    items_sold: "byagurishijwe",

    // Stock & Production
    add_item: "Ongeraho igicuruzwa",
    item_name: "Izina ry'igicuruzwa",
    barcode: "Kodegihamya",
    quantity: "Umubare",
    cost_price: "Ikiguzi cyaguzwe",
    selling_price: "Igiciro cyo kugurisha",
    min_stock: "Umubare ntarengwa",
    size: "Ingano",
    color: "Ibara",
    in_stock: "Bihari",
    low_stock: "Birimo gushira",
    out_of_stock: "Byashize",
    transfer_stock: "Kwimura ibintu",
    planned: "Byateganyijwe",
    in_progress: "Biracyakorwa",
    completed: "Byarangiye",
    cancelled: "Byahagaritswe",

    // Sales & Rent
    new_sale: "Icuruzwa rishya",
    invoice_no: "Inyemezabwishyu No",
    customer: "Umuguzi",
    payment_method: "Uburyo bwo kwishyura",
    subtotal: "Iteranyirizo rito",
    tax: "Imisoro",
    grand_total: "Iteranyirizo ryose",
    void_sale: "Siba icuruzwa",
    sale_details: "Ibisobanuro by'icuruzwa",
    cash: "Amafaranga cash",
    momo: "Momo",
    bank: "Banki",

    // Real Estate
    occupied: "Irimo abantu",
    vacant: "Itegereje abantu",
    partial: "Irimo bamwe",
    address: "Aho iherereye",
    rent_status: "Imishyurire",
    paid: "Yishyuwe",
    pending: "Itegerejwe",

    // Finance
    revenue: "Amafaranga yinjiye",
    cogs: "Ayakoreshejwe mu kuranguza",
    gross_profit: "Inyungu mbumbe",
    net_profit: "Inyungu nyayo",
    operating_expenses: "Imikoreshereze y'ubucuruzi",
    monthly_summary: "Incamake y'ukwezi",

    // Settings
    business_info: "Ibisobanuro by'ubucuruzi",
    shop_name: "Izina ry'iduka",
    address_label: "Aho riherereye",
    city: "Umujyi",
    currency: "Ifaranga rikoreshwa",
    language: "Ururimi",
    roles_permissions: "Inshingano n'Uburenganzira",
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("valano_lang") || "en");

  const t = useCallback((key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"][key] || key;
  }, [lang]);

  const switchLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem("valano_lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
