import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import StoreHeader from "./components/StoreHeader";
import StoreFooter from "./components/StoreFooter";
import CartDrawer from "./components/CartDrawer";
import WhatsAppFab from "./components/WhatsAppFab";

export default function StoreLayout() {
  const { pathname, search } = useLocation();

  // Shoppers move between the grid, a product and the checkout constantly; each
  // of those is a new page and should start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search]);

  return (
    <>
      <StoreHeader />
      <main className="mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-6">
        <Outlet />
      </main>
      <StoreFooter />
      <CartDrawer />
      <WhatsAppFab />
    </>
  );
}
