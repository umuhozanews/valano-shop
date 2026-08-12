import { createContext, useContext, useState, useCallback } from "react";
import { LANG_KEY } from "./api";

// Plain-language copy in English + Kinyarwanda, from the first screen onward.
const DICT = {
  // Generic
  loading: { en: "Loading…", rw: "Biratunganywa…" },
  save: { en: "Save", rw: "Bika" },
  cancel: { en: "Cancel", rw: "Hagarika" },
  add: { en: "Add", rw: "Ongeraho" },
  search: { en: "Search…", rw: "Shakisha…" },
  retry: { en: "Try again", rw: "Ongera ugerageze" },
  offline: { en: "OFFLINE", rw: "NTA MURONGO" },
  today: { en: "Today", rw: "Uyu munsi" },
  all: { en: "All", rw: "Byose" },
  logout: { en: "Log out", rw: "Sohoka" },

  // Sign in
  welcome: { en: "Murakaza neza 👋", rw: "Murakaza neza 👋" },
  signin_sub: {
    en: "Free forever for your business. Just your phone number or email.",
    rw: "Ni ubuntu burundu ku bucuruzi bwawe. Numero ya telefone cyangwa email gusa.",
  },
  tab_email: { en: "Email", rw: "Email" },
  tab_phone: { en: "Phone", rw: "Telefone" },
  email: { en: "Email", rw: "Email" },
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

  // Nav
  nav_home: { en: "Home", rw: "Ahabanza" },
  nav_sell: { en: "Sell", rw: "Gurisha" },
  nav_stock: { en: "Stock", rw: "Ububiko" },
  nav_expenses: { en: "Expenses", rw: "Ibyakoreshejwe" },
  nav_suppliers: { en: "Suppliers", rw: "Abatanga ibicuruzwa" },

  // Dashboard
  hello: { en: "Muraho,", rw: "Muraho," },
  health_score: { en: "Business Health Score", rw: "Amanota y'ubuzima bw'ubucuruzi" },
  see_drivers: { en: "See what's driving this", rw: "Reba icyabitera" },
  todays_sales: { en: "Today's Sales", rw: "Ibyacurujwe uyu munsi" },
  todays_expenses: { en: "Today's Expenses", rw: "Ibyakoreshejwe uyu munsi" },
  cash_in_till: { en: "Cash in Till", rw: "Amafaranga afite" },
  quick_actions: { en: "Quick actions", rw: "Ibikorwa byihuse" },
  record_sale: { en: "Record Sale", rw: "Andika igurisha" },
  add_expense: { en: "Add Expense", rw: "Ongeraho ikoreshwa" },
  add_stock: { en: "Add Stock", rw: "Ongeraho ibicuruzwa" },
  recent_activity: { en: "Recent activity", rw: "Ibyakozwe vuba" },
  no_activity: { en: "No sales yet today.", rw: "Nta gurisha rirakorwa uyu munsi." },

  // Sell
  record_a_sale: { en: "Record a Sale", rw: "Andika igurisha" },
  items: { en: "items", rw: "ibintu" },
  charge: { en: "Charge", rw: "Saba kwishyura" },
  cart_empty: { en: "Tap products to add them to the sale.", rw: "Kanda ibicuruzwa kugira ngo ubyongere." },
  no_products: { en: "No products yet. Add stock first.", rw: "Nta bicuruzwa birahari. Banza wongereho ibicuruzwa." },
  payment_method: { en: "How did they pay?", rw: "Bishyuye bate?" },
  pay_cash: { en: "Cash", rw: "Amafaranga" },
  pay_momo: { en: "MTN MoMo", rw: "MTN MoMo" },
  pay_airtel: { en: "Airtel Money", rw: "Airtel Money" },
  pay_credit: { en: "Credit (owes)", rw: "Ideni (arafiteho)" },
  complete_sale: { en: "Complete sale", rw: "Rangiza igurisha" },
  sale_recorded: { en: "Sale recorded", rw: "Igurisha ryanditswe" },
  customer_name: { en: "Customer name (optional)", rw: "Izina ry'umukiriya (bishoboka)" },

  // Stock
  my_stock: { en: "My Stock", rw: "Ububiko bwanjye" },
  search_stock: { en: "Search your stock…", rw: "Shakisha mu bicuruzwa…" },
  running_low: { en: "running low", rw: "birangira" },
  out_of_stock: { en: "Out of stock", rw: "Byarangiye" },
  low: { en: "Low", rw: "Bike" },
  in_stock: { en: "In stock", rw: "Birahari" },
  new_item: { en: "New product", rw: "Igicuruzwa gishya" },
  item_name: { en: "Product name", rw: "Izina ry'igicuruzwa" },
  category: { en: "Category", rw: "Icyiciro" },
  quantity: { en: "Quantity", rw: "Ingano" },
  unit: { en: "Unit (kg, pcs…)", rw: "Igipimo (kg, ibice…)" },
  cost_price: { en: "Cost price (RWF)", rw: "Igiciro cyo kugura (RWF)" },
  sell_price: { en: "Sell price (RWF)", rw: "Igiciro cyo kugurisha (RWF)" },
  low_threshold: { en: "Alert me when below", rw: "Menyesha iyo bigeze munsi ya" },
  no_stock: { en: "Your stock is empty. Add your first product.", rw: "Ububiko bwawe ni ubusa. Ongeraho igicuruzwa cya mbere." },

  // Expenses
  expenses_title: { en: "Expenses", rw: "Ibyakoreshejwe" },
  this_month_so_far: { en: "This month, so far", rw: "Uku kwezi, kugeza ubu" },
  vs_last_month: { en: "vs last month", rw: "ugereranyije n'ukwezi gushize" },
  recent_entries: { en: "Recent entries", rw: "Ibyanditswe vuba" },
  new_expense: { en: "New expense", rw: "Ikoreshwa gishya" },
  amount: { en: "Amount (RWF)", rw: "Amafaranga (RWF)" },
  description: { en: "Description (optional)", rw: "Ibisobanuro (bishoboka)" },
  date: { en: "Date", rw: "Itariki" },
  no_expenses: { en: "No expenses recorded yet.", rw: "Nta byakoreshejwe byanditswe." },

  // Suppliers
  suppliers_title: { en: "Suppliers", rw: "Abatanga ibicuruzwa" },
  total_you_owe: { en: "Total you owe suppliers", rw: "Igiteranyo ubereyemo abatanga ibicuruzwa" },
  all_paid: { en: "All paid up", rw: "Byishyuwe byose" },
  owe: { en: "Owe", rw: "Ubereyemo" },
  last_order: { en: "Last order", rw: "Igurwa riheruka" },
  new_supplier: { en: "New supplier", rw: "Utanga ibicuruzwa mushya" },
  supplier_name: { en: "Supplier name", rw: "Izina ry'utanga ibicuruzwa" },
  products_supplied: { en: "Products supplied", rw: "Ibicuruzwa atanga" },
  no_suppliers: { en: "No suppliers yet. Add your first one.", rw: "Nta batanga ibicuruzwa. Ongeraho uwa mbere." },

  // Health score
  health_title: { en: "Business Health Score", rw: "Amanota y'ubuzima bw'ubucuruzi" },
  better_than: { en: "A quick, honest read on your business", rw: "Isuzuma ryihuse kandi ryukuri ku bucuruzi bwawe" },
  top_factors: { en: "What's helping & hurting", rw: "Ibifasha n'ibibangamira" },
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
