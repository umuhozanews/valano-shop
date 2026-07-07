import { createContext, useContext } from "react";

// Inzira Insights is a single-business platform — no switcher needed.
// This context exists only to satisfy any remaining imports without crashing.
const BusinessContext = createContext({
  activeBusiness: { name: "Inzira Insights", color: "#10B981", type: "shop" },
  switchBusiness: () => {},
  businesses: [],
});

export function BusinessProvider({ children }) {
  return (
    <BusinessContext.Provider value={{
      activeBusiness: { name: "Inzira Insights", color: "#10B981", type: "shop" },
      switchBusiness: () => {},
      businesses: [],
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
