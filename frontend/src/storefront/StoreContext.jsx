import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchStore } from "./lib/storeApi";

const StoreContext = createContext(null);

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside a StoreProvider");
  return value;
}

const cartStorageKey = (slug) => `inzira_store_cart_${slug}`;

function readCart(slug) {
  try {
    const raw = localStorage.getItem(cartStorageKey(slug));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((line) => ({ id: Number(line?.id), quantity: Number(line?.quantity) }))
      .filter((line) => Number.isInteger(line.id) && line.id > 0 && line.quantity > 0);
  } catch {
    return [];
  }
}

export function StoreProvider({ slug, children }) {
  const [status, setStatus] = useState("loading");
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState(() => readCart(slug));
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    fetchStore(slug, { signal: controller.signal })
      .then((data) => {
        setPayload(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err);
        setStatus("error");
      });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    setCart(readCart(slug));
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey(slug), JSON.stringify(cart));
    } catch {
      // A full or blocked storage quota only costs cart persistence.
    }
  }, [slug, cart]);

  const products = useMemo(() => payload?.products || [], [payload]);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const addToCart = useCallback((productId, quantity = 1) => {
    const id = Number(productId);
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!Number.isInteger(id) || id <= 0) return;
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (!existing) return [...current, { id, quantity: qty }];
      return current.map((line) =>
        line.id === id ? { ...line, quantity: Math.min(999, line.quantity + qty) } : line
      );
    });
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    const id = Number(productId);
    const qty = Math.floor(Number(quantity) || 0);
    setCart((current) =>
      qty <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) => (line.id === id ? { ...line, quantity: Math.min(999, qty) } : line))
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    const id = Number(productId);
    setCart((current) => current.filter((line) => line.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // Cart lines are always resolved against the freshly fetched catalogue, so
  // prices shown match the server and unpublished items disappear on their own.
  const lines = useMemo(() => {
    if (!products.length) return [];
    const byId = new Map(products.map((product) => [product.id, product]));
    return cart
      .map((line) => {
        const product = byId.get(line.id);
        if (!product) return null;
        return { ...product, quantity: line.quantity, lineTotal: product.price * line.quantity };
      })
      .filter(Boolean);
  }, [cart, products]);

  const value = useMemo(
    () => ({
      slug,
      base: `/shop/${slug}`,
      status,
      error,
      store: payload?.store || null,
      heroSlides: payload?.heroSlides || [],
      categories: payload?.categories || [],
      brands: payload?.brands || [],
      trustBadges: payload?.trustBadges || [],
      products,
      currency: payload?.store?.currency || "RWF",
      cart: {
        lines,
        itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
        total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
        isOpen: cartOpen,
        open: openCart,
        close: closeCart,
        add: addToCart,
        setQuantity,
        remove: removeFromCart,
        clear: clearCart,
        has: (id) => cart.some((line) => line.id === Number(id)),
      },
    }),
    [
      slug, status, error, payload, products, lines, cartOpen, cart,
      openCart, closeCart, addToCart, setQuantity, removeFromCart, clearCart,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
