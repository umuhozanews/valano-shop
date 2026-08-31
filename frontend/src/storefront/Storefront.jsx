import { useMemo } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { StoreProvider, useStore } from "./StoreContext";
import { buildStoreThemeVars, DEFAULT_STORE_THEME } from "./lib/theme";
import StoreLayout from "./StoreLayout";
import StoreHome from "./pages/StoreHome";
import StoreCategory from "./pages/StoreCategory";
import StoreProduct from "./pages/StoreProduct";
import StoreSearch from "./pages/StoreSearch";
import StoreCheckout from "./pages/StoreCheckout";
import StoreAbout from "./pages/StoreAbout";
import StoreContact from "./pages/StoreContact";
import { EmptyState, StoreSkeleton } from "./components/Bits";

function StoreUnavailable({ error }) {
  const unpublished = error?.code === "STORE_UNPUBLISHED";
  const notFound = error?.status === 404;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <EmptyState
          icon={unpublished ? "🚧" : notFound ? "🔍" : "⚠️"}
          title={
            unpublished
              ? "This shop is not open yet"
              : notFound
                ? "Shop not found"
                : "We could not load this shop"
          }
          message={
            unpublished
              ? "The owner is still setting things up. Please check back soon."
              : notFound
                ? "Check the web address, or ask the shop for the correct link."
                : error?.message || "Something went wrong. Please refresh the page and try again."
          }
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg transition hover:opacity-90"
            >
              Try again
            </button>
          }
        />
        <p className="mt-6 text-center text-xs text-store-muted">
          Online shops powered by <span className="font-semibold">Inzira</span>
        </p>
      </div>
    </div>
  );
}

function StorePageNotFound() {
  const { base } = useStore();
  return (
    <div className="py-10">
      <EmptyState
        icon="🧭"
        title="Page not found"
        message="That page does not exist on this shop."
        action={
          <Link
            to={base}
            className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg transition hover:opacity-90"
          >
            Back to shop home
          </Link>
        }
      />
    </div>
  );
}

function StoreShell() {
  const { status, error, store } = useStore();

  // The theme is applied to the wrapper (not :root) so the storefront can never
  // leak its palette into the dashboard when a user navigates back to /app.
  const themeVars = useMemo(() => buildStoreThemeVars(store?.theme || DEFAULT_STORE_THEME), [store?.theme]);

  return (
    <div className="storefront-root min-h-screen" style={themeVars}>
      {status === "loading" && <StoreSkeleton />}
      {status === "error" && <StoreUnavailable error={error} />}
      {status === "ready" && (
        <Routes>
          <Route element={<StoreLayout />}>
            <Route index element={<StoreHome />} />
            <Route path="category/:categorySlug" element={<StoreCategory />} />
            <Route path="product/:productSlug" element={<StoreProduct />} />
            <Route path="search" element={<StoreSearch />} />
            <Route path="cart" element={<StoreCheckout />} />
            <Route path="checkout" element={<StoreCheckout />} />
            <Route path="about" element={<StoreAbout />} />
            <Route path="contact" element={<StoreContact />} />
            <Route path="*" element={<StorePageNotFound />} />
          </Route>
        </Routes>
      )}
    </div>
  );
}

export default function Storefront() {
  const { slug } = useParams();

  return (
    <StoreProvider slug={slug}>
      <StoreShell />
    </StoreProvider>
  );
}
