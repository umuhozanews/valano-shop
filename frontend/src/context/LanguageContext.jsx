import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LanguageContext = createContext(null);

const TRANSLATIONS = {
  en: {
    // Nav
    dashboard: "Dashboard",
    stock: "Stock",
    sales: "Sales",
    procurement: "Procurement",
    workers: "Workers",
    customers: "Customers",
    suppliers: "Suppliers",
    invoices: "Invoices",
    expenses: "Expenses",
    pnl: "Profit & Loss",
    reports: "Reports",
    settings: "Settings",
    notifications: "Notifications",
    
    // Auth
    welcome_back: "Welcome back",
    sign_in_account: "Sign in to your account",
    email: "Email address",
    password: "Password",
    remember_me: "Remember me",
    sign_in: "Sign In",
    signing_in: "Signing in...",
    login_failed: "Login failed. Check your credentials.",
    
    // General
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    loading: "Loading...",
  },
  rw: {
    // Nav Sections
    main_menu: "Ibize imbere",
    management: "Imicungire",
    finance: "Imari",
    reports: "Raporo",
    others: "Ibindi",

    // Nav Items
    dashboard: "Incamake",
    stock: "Ububiko",
    sales: "Icuruzwa",
    procurement: "Ibyaranguwe",
    workers: "Abakozi",
    customers: "Abaguzi",
    suppliers: "Abaranguza",
    invoices: "Inyemezabwishyu",
    expenses: "Imikoreshereze",
    profit_loss: "Inyungu n'Igihombo",
    sales_report: "Raporo y'Icuruzwa",
    stock_report: "Raporo y'Ububiko",
    worker_performance: "Imikorere y'Abakozi",
    audit_log: "Ibyakozwe mu miterere",
    notifications: "Imenyesha",
    settings: "Igenamiterere",
    
    // Auth
    welcome_back: "Muraho, twongeye kuguha ikaze",
    sign_in_account: "Injira muri konti yawe",
    email: "Imeri yawe",
    password: "Ijambo ry'ibanga",
    remember_me: "Njyara mu banyibutsa",
    sign_in: "Injira",
    signing_in: "Turacyinjira...",
    login_failed: "Kwinjira ntibyakunze. Reba imeri cyangwa ijambo ry'ibanga.",
    
    // General
    save: "Bika",
    cancel: "Reka",
    delete: "Siba",
    edit: "Hindura",
    add: "Ongeraho",
    search: "Shaka",
    loading: "Biracyatunganywa...",
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
