import { createContext, useContext, useState, useEffect } from "react";
import { BUSINESSES, BUSINESS_TYPES } from "../utils/constants";

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [activeBusiness, setActiveBusiness] = useState(() => {
    const stored = localStorage.getItem("active_business_id");
    return BUSINESSES.find(b => b.id === stored) || BUSINESSES[0];
  });

  const switchBusiness = (id) => {
    const biz = BUSINESSES.find(b => b.id === id);
    if (biz) {
      setActiveBusiness(biz);
      localStorage.setItem("active_business_id", id);
      // Reload or reset stats as needed
      window.location.reload(); 
    }
  };

  useEffect(() => {
    // Update theme color based on business
    document.documentElement.style.setProperty('--color-primary', activeBusiness.color);
  }, [activeBusiness]);

  return (
    <BusinessContext.Provider value={{ activeBusiness, switchBusiness, businesses: BUSINESSES }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
