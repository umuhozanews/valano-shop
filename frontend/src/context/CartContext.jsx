import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("valano_cart") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("valano_cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart({ id, name, img, price, size, colorName, quantity = 1 }) {
    setCart(prev => {
      const key = `${id}-${size}-${colorName}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { key, id, name, img, price, size, colorName, quantity }];
    });
  }

  function removeFromCart(key) {
    setCart(prev => prev.filter(i => i.key !== key));
  }

  function updateQty(key, qty) {
    if (qty < 1) { removeFromCart(key); return; }
    setCart(prev => prev.map(i => i.key === key ? { ...i, quantity: qty } : i));
  }

  function clearCart() { setCart([]); }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
