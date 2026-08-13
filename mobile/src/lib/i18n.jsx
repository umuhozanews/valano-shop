import { createContext, useContext, useState, useCallback } from "react";
import { LANG_KEY } from "./api";

// Natural, native daily-used Kinyarwanda + English dictionary
const DICT = {
  // Generic & Interface Actions
  loading: { en: "Loading…", rw: "Biratunganywa…" },
  save: { en: "Save Changes", rw: "Bika ibyahinduwe" },
  cancel: { en: "Cancel", rw: "Hagarika" },
  add: { en: "Add", rw: "Ongeraho" },
  search: { en: "Search…", rw: "Shakisha…" },
  retry: { en: "Try again", rw: "Ongera ugerageze" },
  offline: { en: "OFFLINE", rw: "NTA MURONGO" },
  today: { en: "Today", rw: "Uyu munsi" },
  all: { en: "All", rw: "Byose" },
  logout: { en: "Log out", rw: "Sohoka" },
  confirm: { en: "Confirm", rw: "Emeza" },
  delete: { en: "Delete", rw: "Siba" },
  edit: { en: "Edit", rw: "Hindura" },
  status: { en: "Status", rw: "Imiterere" },
  action: { en: "Action", rw: "Igikorwa" },
  download: { en: "Download PDF", rw: "Kura mo PDF" },
  print: { en: "Print Receipt", rw: "Capa Inyanzuro" },

  // Sign in & Authentication
  welcome: { en: "Murakaza neza 👋", rw: "Murakaza neza 👋" },
  signin_sub: {
    en: "Free forever for your business. Just your phone number or email.",
    rw: "Ni ubuntu burundu ku bucuruzi bwawe. Numero ya telefone cyangwa email gusa.",
  },
  tab_email: { en: "Email", rw: "Email" },
  tab_phone: { en: "Phone", rw: "Telefone" },
  email: { en: "Email Address", rw: "Aderesi ya Email" },
  password: { en: "Password", rw: "Ijambo ry'ibanga" },
  phone: { en: "Phone number", rw: "Numero ya telefone" },
  otp_code: { en: "6-digit code", rw: "Kode y'imibare 6" },
  send_code: { en: "Send code", rw: "Ohereza kode" },
  verify: { en: "Verify & sign in", rw: "Emeza winjire" },
  signin: { en: "Sign in", rw: "Injira" },
  privacy: {
    en: "Your data stays private and protected.",
    rw: "Amakuru yawe abikwa mu ibanga kandi arindwa.",
  },
  google_signin: { en: "Continue with Google", rw: "Komeza ukoresheje Google" },

  // Signup & Onboarding Flow
  signup: { en: "Sign up free", rw: "Iyandikishe ku ubuntu" },
  signup_title: { en: "Create your free shop account", rw: "Fungura konti y'ubucuruzi bwawe ku ubuntu" },
  signup_sub: { en: "Join thousands of SME owners growing their business with DataBridge.", rw: "Wiyunge ku magana y'abacuruzi bari kugura ubucuruzi bwabo na DataBridge." },
  already_have_account: { en: "Already have an account?", rw: "Ufite konti ariko?" },
  dont_have_account: { en: "Don't have an account?", rw: "Nta konti ufite?" },
  full_name: { en: "Owner Full Name", rw: "Izina ry'Nyir'ubucuruzi" },
  agree_terms: { en: "I agree to the Terms & Privacy Policy", rw: "Ndemera amategeko n'amabwiriza y'ibanga" },
  
  // Onboarding Setup Wizard (Kayko-inspired)
  setup_title: { en: "Set up your shop", rw: "Tunganya duka ryawe" },
  step_account: { en: "Account", rw: "Konti" },
  step_business: { en: "Business", rw: "Ubucuruzi" },
  step_finance: { en: "Finance", rw: "Imari" },
  step_goals: { en: "Goals", rw: "Intego" },
  step_launch: { en: "Ready", rw: "Biarakwiye" },
  
  question_shop_name: { en: "What is your Business / Shop name?", rw: "Izina ry'Duka ryawe ni ryari?" },
  question_category: { en: "What type of business do you run?", rw: "Ukora ubucuruzi bw'ubuhe bwoko?" },
  question_currency: { en: "Which currency do you use?", rw: "Ukoresha iyihe faranga?" },
  question_initial_cash: { en: "Initial Cash / Till Balance", rw: "Amafaranga ufite mu ntoki tangiriro" },
  question_goals: { en: "What are your main business goals?", rw: "Intego zawe z'ingenzi mu bucuruzi ni izihe?" },
  question_sample_data: { en: "Would you like demo items to test?", rw: "Uribaza kongeramo ibicuruzwa by'icya geragezo?" },
  
  cat_retail: { en: "Retail & Supermarket", rw: "Ubucuruzi busanzwe & Supermarket" },
  cat_wholesale: { en: "Wholesale & Distribution", rw: "Ikiranguzo & Gukwirakwiza" },
  cat_electronics: { en: "Electronics & Phones", rw: "Elesitoroniki & Telefone" },
  cat_pharmacy: { en: "Pharmacy & Health", rw: "Farmasi & Ubuzima" },
  cat_boutique: { en: "Clothing & Fashion Boutique", rw: "Imyenda & Inkweto" },
  cat_hardware: { en: "Hardware & Construction (Quincaillerie)", rw: "Igikoresho cy'ubwubatsi (Quincaillerie)" },
  cat_services: { en: "Services & Salon / Barber", rw: "Serivisi & Salon / Kogosha" },
  cat_cafe: { en: "Restaurant, Bakery & Café", rw: "Restora, Imigati & Café" },

  goal_pos: { en: "Record daily sales & print receipts", rw: "Kwandika igurisha rya buri munsi & inyanzuro" },
  goal_stock: { en: "Track inventory stock & low stock alerts", rw: "Gukurikirana ububiko & n'imburira y'ibishira" },
  goal_debts: { en: "Manage customer debts & invoice payables", rw: "Gucunga amadeni y'abakiriya & fagitire" },
  goal_sacco: { en: "Build Credit Health & apply for SACCO loans", rw: "Kuzamura amanota y'ubuzima bwa SACCO" },
  
  sample_yes: { en: "Yes, add sample items so I can test", rw: "Yego, ongeramo ibicuruzwa mgerageze" },
  sample_no: { en: "No, start with a clean empty shop", rw: "Oya, ntangirire ku duka ridafite kantu" },
  
  launch_btn: { en: "Launch My Shop Dashboard 🚀", rw: "Tangiye gukoresha DataBridge 🚀" },
  setup_complete_title: { en: "Your shop is ready!", rw: "Duka ryawe ryatunganyijwe!" },
  setup_complete_sub: { en: "Everything is set up. You can start recording sales right away.", rw: "Byose byatunganyijwe. Ushobora gutangira kwandika igurisha n'ubu." },

  // Main Bottom Navigation
  nav_home: { en: "Home", rw: "Ahabanza" },
  nav_sell: { en: "Sell", rw: "Gurisha" },
  nav_stock: { en: "Stock", rw: "Ububiko" },
  nav_expenses: { en: "Expenses", rw: "Ibyakoreshejwe" },
  nav_suppliers: { en: "Customers & Payables", rw: "Abakiriya n'Ababerewemo" },
  nav_invoices: { en: "Invoices", rw: "Factures / Inyanzuro" },
  nav_pnl: { en: "Profit & Loss", rw: "Inyungu n'Igihombo" },
  nav_books: { en: "Financial Books", rw: "Ibitabo by'Imari" },
  nav_reports: { en: "Reports", rw: "Raporu" },
  nav_settings: { en: "Settings", rw: "Igenamiterere" },

  // Dashboard Overview
  hello: { en: "Muraho,", rw: "Muraho," },
  health_score: { en: "Business Health Score", rw: "Amanota y'Ubuzima bw'Ubucuruzi" },
  see_drivers: { en: "See what's driving this", rw: "Reba icyabitera" },
  todays_sales: { en: "Today's Sales", rw: "Ibyacurujwe uyu munsi" },
  todays_expenses: { en: "Today's Expenses", rw: "Ibyakoreshejwe uyu munsi" },
  cash_in_till: { en: "Cash in Till", rw: "Amafaranga arimo mu ntoki" },
  quick_actions: { en: "Quick actions", rw: "Ibikorwa byihuse" },
  record_sale: { en: "Record Sale", rw: "Andika igurisha" },
  add_expense: { en: "Add Expense", rw: "Ongeraho ikoreshwa" },
  add_stock: { en: "Add Stock", rw: "Ongeraho ibicuruzwa" },
  recent_activity: { en: "Recent activity", rw: "Ibyakozwe vuba" },
  no_activity: { en: "No sales yet today.", rw: "Nta gurisha rirakorwa uyu munsi." },

  // POS & Sell Screen
  record_a_sale: { en: "Record a Sale", rw: "Andika Igurisha" },
  items: { en: "items", rw: "ibintu" },
  charge: { en: "Charge", rw: "Saba Kwishyura" },
  cart_empty: { en: "Tap products to add them to the sale.", rw: "Kanda ku bicuruzwa kugira ngo ubyongere mu igurisha." },
  no_products: { en: "No products yet. Add stock first.", rw: "Nta bicuruzwa biraboneka. Banza wongere ibicuruzwa mu bubiko." },
  payment_method: { en: "How did they pay?", rw: "Bishyuye mu buhe buryo?" },
  pay_cash: { en: "Cash", rw: "Amafaranga mu ntoki" },
  pay_momo: { en: "MTN MoMo", rw: "MTN Mobile Money" },
  pay_airtel: { en: "Airtel Money", rw: "Airtel Money" },
  pay_credit: { en: "Credit (owes)", rw: "Ideni (Ubereyemo)" },
  complete_sale: { en: "Complete sale", rw: "Rangiza igurisha" },
  sale_recorded: { en: "Sale recorded successfully", rw: "Igurisha ryanditswe neza" },
  customer_name: { en: "Customer name (optional)", rw: "Izina ry'umukiriya (bishoboka)" },

  // Stock & Inventory Screen
  my_stock: { en: "My Stock", rw: "Ububiko Bwanjye" },
  search_stock: { en: "Search your stock…", rw: "Shakisha mu bicuruzwa…" },
  running_low: { en: "running low", rw: "birabura muri stoke" },
  out_of_stock: { en: "Out of stock", rw: "Byarangiye mu duka" },
  low: { en: "Low", rw: "Bike" },
  in_stock: { en: "In stock", rw: "Biri mu bubiko" },
  new_item: { en: "New product", rw: "Igicuruzwa gishya" },
  item_name: { en: "Product name", rw: "Izina ry'igicuruzwa" },
  category: { en: "Category", rw: "Icyiciro" },
  quantity: { en: "Quantity", rw: "Ingano" },
  unit: { en: "Unit (kg, pcs…)", rw: "Igipimo (kg, ibice…)" },
  cost_price: { en: "Cost price (RWF)", rw: "Igiciro cyo kugura (RWF)" },
  sell_price: { en: "Sell price (RWF)", rw: "Igiciro cyo kugurisha (RWF)" },
  low_threshold: { en: "Alert me when below", rw: "Ukuza mmenyesha iyo bigeze munsi ya" },
  no_stock: { en: "Your stock is empty. Add your first product.", rw: "Ububiko bwawe ni ubusa. Ongeraho igicuruzwa cya mbere." },

  // Expenses Screen
  expenses_title: { en: "Expenses", rw: "Ibyakoreshejwe" },
  this_month_so_far: { en: "This month, so far", rw: "Uku kwezi, kugeza ubu" },
  vs_last_month: { en: "vs last month", rw: "ugereranyije n'ukwezi gushize" },
  recent_entries: { en: "Recent entries", rw: "Ibyanditswe vuba" },
  new_expense: { en: "New expense", rw: "Ikoreshwa gishya" },
  amount: { en: "Amount (RWF)", rw: "Amafaranga (RWF)" },
  description: { en: "Description (optional)", rw: "Ibisobanuro (bishoboka)" },
  date: { en: "Date", rw: "Itariki" },
  no_expenses: { en: "No expenses recorded yet.", rw: "Nta byakoreshejwe byanditswe." },

  // Customers & Suppliers Screen
  suppliers_title: { en: "Customers & Payables", rw: "Abakiriya n'Ababerewemo" },
  tab_customers: { en: "Customers", rw: "Abakiriya" },
  tab_owed: { en: "Owed to Us (Receivables)", rw: "Abo tubereyemo ideni (Ibyacu)" },
  tab_payables: { en: "Payables (Suppliers)", rw: "Abatwanditseho (Abatwebereyemo)" },
  total_you_owe: { en: "Total you owe suppliers", rw: "Igiteranyo ubereyemo abatanga ibicuruzwa" },
  all_paid: { en: "All paid up", rw: "Byishyuwe byose" },
  owe: { en: "Owe", rw: "Ubereyemo" },
  new_supplier: { en: "New supplier", rw: "Utanga ibicuruzwa mushya" },
  supplier_name: { en: "Supplier name", rw: "Izina ry'utanga ibicuruzwa" },
  products_supplied: { en: "Products supplied", rw: "Ibicuruzwa atanga" },
  no_suppliers: { en: "No suppliers yet. Add your first one.", rw: "Nta batanga ibicuruzwa. Ongeraho uwa mbere." },

  // Invoices & EBM Receipts
  invoices_title: { en: "Customer Invoices", rw: "Inyanzuro y'Abakiriya / Factures" },
  ebm_receipt: { en: "EBM Receipt", rw: "Inyanzuro ya EBM" },

  // Financial Books Screen
  books_title: { en: "Double-Entry Financial Books", rw: "Ibitabo by'Imari n'Ubucungamari" },
  journal_entries: { en: "Journal Entries", rw: "Ibyandikwa mu Gitabo Nyamukuru" },
  general_ledger: { en: "General Ledger", rw: "Igitabo cy'Imari Cyose" },
  cash_book: { en: "Cash Book", rw: "Igitabo cy'Amafaranga" },
  trial_balance: { en: "Trial Balance", rw: "Igenzura ry'Imari" },

  // Profit & Loss Screen
  pnl_title: { en: "Profit & Loss Statement", rw: "Raporu y'Inyungu n'Igihombo" },
  gross_profit: { en: "Gross Profit", rw: "Inyungu Mbonera" },
  net_profit: { en: "Net Profit", rw: "Inyungu Nshuro" },

  // Reports Screen
  reports_title: { en: "Business Analytics & Reports", rw: "Raporu n'Ibipimo by'Ubucuruzi" },

  // Settings & Profile
  business_info: { en: "Business Info", rw: "Amakuru y'Ubucuruzi" },
  team_workers: { en: "Team & Workers", rw: "Abakozi n'Abagize Ikipe" },
  roles_access: { en: "Roles & Access", rw: "Inshingano n'Uburenganzira" },
  user_profile: { en: "User Profile", rw: "Umwirondoro w'Umukoresha" },
  data_consent: { en: "Data & Consent", rw: "Amakuru n'Uburanganzira" },
  add_worker: { en: "Add Worker", rw: "Ongeraho Umukozi" },
  shop_name: { en: "Business / Shop Name", rw: "Izina ry'Ubucuruzi / Duka" },
  shop_address: { en: "Location / Address", rw: "Icyerekezo / Aho rihereye" },
  sector: { en: "Business Sector", rw: "Urwego rw'Ubucuruzi" },

  // Business Health Score
  health_title: { en: "Business Health Score", rw: "Amanota y'Ubuzima bw'Ubucuruzi" },
  better_than: { en: "A quick, honest read on your business", rw: "Isuzuma ryihuse kandi ryukuri ku bucuruzi bwawe" },
  top_factors: { en: "What's helping & hurting", rw: "Ibifasha n'ibibangamira ubucuruzi" },
  recommendations: { en: "What to do next", rw: "Icyakorwa ubutaha" },
  no_score: {
    en: "No score yet. Tap below to calculate your first Business Health Score.",
    rw: "Nta manota arahari. Kanda hasi ubare amanota yawe ya mbere.",
  },
  calculate: { en: "Calculate my score", rw: "Bara amanota yanjye" },
  recalculate: { en: "Recalculate", rw: "Ongera ubare" },
  share_sacco: { en: "Share score with my SACCO", rw: "Sangiza SACCO yanjye amanota" },
  lender_note: {
    en: "A higher score helps lenders like your SACCO trust your business — and unlocks better loan terms.",
    rw: "Amanota menshi afasha abaguza nka SACCO kwizera ubucuruzi bwawe — akanaguha inguzanyo nziza.",
  },
  band_green: { en: "Strong", rw: "Rikomeye" },
  band_amber: { en: "Fair", rw: "Rihagije" },
  band_red: { en: "Needs care", rw: "Rikeneye ubufasha" },
};

export function t(key, lang) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || "en");

  const setLang = useCallback((next) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "en" ? "rw" : "en";
      localStorage.setItem(LANG_KEY, next);
      return next;
    });
  }, []);

  const tr = useCallback((key) => t(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t: tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
