import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

  // Scope storage keys specifically to the logged-in user account ID/email/phone
  const userKey = useMemo(() => {
    if (!user) return "guest";
    const cleanId = String(user.id || user.email || user.phone || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
    return cleanId;
  }, [user]);

  const STOCK_KEY = `db_stock_${userKey}`;
  const SALES_KEY = `db_sales_${userKey}`;
  const EXPENSES_KEY = `db_expenses_${userKey}`;

  // Load account-specific stock
  const [stock, setStock] = useState(() => {
    try {
      const saved = localStorage.getItem(`db_stock_${userKey}`);
      return saved !== null ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load account-specific sales
  const [sales, setSales] = useState(() => {
    try {
      const saved = localStorage.getItem(`db_sales_${userKey}`);
      return saved !== null ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load account-specific expenses
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(`db_expenses_${userKey}`);
      return saved !== null ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Re-sync local state whenever active user account changes
  useEffect(() => {
    try {
      const savedStock = localStorage.getItem(STOCK_KEY);
      const savedSales = localStorage.getItem(SALES_KEY);
      const savedExpenses = localStorage.getItem(EXPENSES_KEY);

      setStock(savedStock !== null ? JSON.parse(savedStock) : []);
      setSales(savedSales !== null ? JSON.parse(savedSales) : []);
      setExpenses(savedExpenses !== null ? JSON.parse(savedExpenses) : []);
    } catch (e) {
      console.error("Failed to load user-scoped data:", e);
    }
  }, [userKey, STOCK_KEY, SALES_KEY, EXPENSES_KEY]);

  // Method to completely reset all data state for a fresh new account
  const resetData = useCallback(() => {
    setStock([]);
    setSales([]);
    setExpenses([]);
    try {
      localStorage.setItem(STOCK_KEY, JSON.stringify([]));
      localStorage.setItem(SALES_KEY, JSON.stringify([]));
      localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
  }, [STOCK_KEY, SALES_KEY, EXPENSES_KEY]);

  // Sync state to user-scoped localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
    } catch (e) {
      console.error("Failed to save stock to localStorage:", e);
    }
  }, [stock, STOCK_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    } catch (e) {
      console.error("Failed to save sales to localStorage:", e);
    }
  }, [sales, SALES_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error("Failed to save expenses to localStorage:", e);
    }
  }, [expenses, EXPENSES_KEY]);

  // Real-Time Cross-Tab / Cross-Window Sync via Web Storage Listener
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STOCK_KEY) {
        try { setStock(e.newValue ? JSON.parse(e.newValue) : []); } catch {}
      }
      if (e.key === SALES_KEY) {
        try { setSales(e.newValue ? JSON.parse(e.newValue) : []); } catch {}
      }
      if (e.key === EXPENSES_KEY) {
        try { setExpenses(e.newValue ? JSON.parse(e.newValue) : []); } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [STOCK_KEY, SALES_KEY, EXPENSES_KEY]);

  // Sync data with Backend API, keeping user account consistent across devices
  const refreshAll = useCallback(async (silent = true) => {
    if (!silent) setLoading(true);
    try {
      const [stkRes, saleRes, expRes] = await Promise.allSettled([
        api.get("/stock", { params: { limit: 200 } }),
        api.get("/sales", { params: { limit: 100 } }),
        api.get("/expenses", { params: { limit: 100 } }),
      ]);

      if (stkRes.status === "fulfilled" && Array.isArray(stkRes.value.data?.data)) {
        const serverItems = stkRes.value.data.data;
        if (serverItems.length > 0) {
          setStock(prev => {
            const localOnly = prev.filter(p => typeof p.id === "number" && p.id > 1000000000000);
            const serverIds = new Set(serverItems.map(s => s.id));
            const filteredLocal = localOnly.filter(p => !serverIds.has(p.id));
            return [...filteredLocal, ...serverItems];
          });
        }
      }

      if (saleRes.status === "fulfilled" && Array.isArray(saleRes.value.data?.data)) {
        const serverSales = saleRes.value.data.data;
        if (serverSales.length > 0) {
          setSales(prev => {
            const localOnly = prev.filter(s => typeof s.id === "number" && s.id > 1000000000000);
            const serverIds = new Set(serverSales.map(s => s.id));
            const filteredLocal = localOnly.filter(s => !serverIds.has(s.id));
            return [...filteredLocal, ...serverSales];
          });
        }
      }

      if (expRes.status === "fulfilled" && Array.isArray(expRes.value.data?.data)) {
        const serverExpenses = expRes.value.data.data;
        if (serverExpenses.length > 0) {
          setExpenses(prev => {
            const localOnly = prev.filter(e => typeof e.id === "number" && e.id > 1000000000000);
            const serverIds = new Set(serverExpenses.map(e => e.id));
            const filteredLocal = localOnly.filter(e => !serverIds.has(e.id));
            return [...filteredLocal, ...serverExpenses];
          });
        }
      }
    } catch (err) {
      console.warn("[DataContext] Network sync warning, using local persistent state:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + Automatic 8-second polling + Window Focus & Online Sync
  useEffect(() => {
    refreshAll(false);

    const pollInterval = setInterval(() => {
      refreshAll(true);
    }, 8000);

    const handleFocus = () => refreshAll(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshAll(true);
    };
    const handleOnline = () => {
      setIsOnline(true);
      refreshAll(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshAll]);

  // Interconnected Record Sale Action
  const recordSale = async ({
    items,
    payment_method,
    customer_name,
    customer_phone,
    due_date,
    amount_paid,
    split_payments,
    notes,
  }) => {
    const saleTotal = items.reduce((s, l) => s + (Number(l.unit_price) * Number(l.quantity)), 0);
    const timestamp = Date.now();
    const invNum = `INV-2026-${String(sales.length + 1).padStart(3, "0")}`;

    let paidVal = 0;
    if (payment_method === "split" && split_payments) {
      paidVal = (Number(split_payments.cash) || 0) + (Number(split_payments.momo) || 0);
    } else if (payment_method === "credit") {
      paidVal = Number(amount_paid) || 0;
    } else {
      paidVal = amount_paid !== undefined ? Math.min(saleTotal, Number(amount_paid) || 0) : saleTotal;
    }

    const owedVal = Math.max(0, saleTotal - paidVal);

    let payStatus = "completed";
    if (owedVal > 0) {
      payStatus = paidVal > 0 ? "partial" : "debt";
    }

    const defaultDueDate = owedVal > 0 
      ? new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
      : null;

    const newSale = {
      id: timestamp,
      invoice_number: invNum,
      customer_name: customer_name?.trim() || "Walk-in Customer",
      customer_phone: customer_phone?.trim() || "",
      cashier_name: "Cashier",
      payment_method: payment_method || "cash",
      split_payments: payment_method === "split" ? split_payments : null,
      total_amount: saleTotal,
      amount_paid: paidVal,
      amount_owed: owedVal,
      due_date: due_date || defaultDueDate,
      payment_status: payStatus,
      notes: notes || "",
      items_count: items.length,
      items: items.map(i => ({
        stock_item_id: i.stock_item_id || null,
        item_name: i.item_name || i.name,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        subtotal: Number(i.unit_price) * Number(i.quantity)
      })),
      debt_payments: [],
      created_at: new Date().toISOString()
    };

    setSales(prev => [newSale, ...prev]);

    setStock(prevStock => {
      return prevStock.map(item => {
        const cartMatch = items.find(ci => ci.stock_item_id && String(ci.stock_item_id) === String(item.id));
        if (cartMatch) {
          const currentQty = Number(item.quantity) || 0;
          const newQty = Math.max(0, currentQty - Number(cartMatch.quantity));
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });

    try {
      const idempotencyKey = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await api.post(
        "/sales",
        {
          items,
          payment_method,
          customer_name,
          customer_phone,
          due_date: newSale.due_date,
          amount_paid: paidVal,
          amount_owed: owedVal,
          split_payments,
          notes,
        },
        {
          headers: { "Idempotency-Key": idempotencyKey },
        }
      );
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async sale post fallback:", err.message);
    }

    return newSale;
  };

  // Void a sale and restore inventory quantity
  const voidSale = async (saleId) => {
    const saleToVoid = sales.find(s => String(s.id) === String(saleId));
    if (saleToVoid && Array.isArray(saleToVoid.items)) {
      setStock(prevStock => {
        return prevStock.map(item => {
          const itemMatch = saleToVoid.items.find(i => i.stock_item_id && String(i.stock_item_id) === String(item.id));
          if (itemMatch) {
            return { ...item, quantity: (Number(item.quantity) || 0) + Number(itemMatch.quantity) };
          }
          return item;
        });
      });
    }

    setSales(prev => prev.filter(s => String(s.id) !== String(saleId)));

    try {
      await api.post(`/sales/${saleId}/void`, { void_reason: "Customer cancellation" });
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async sale void fallback:", err.message);
    }
  };

  // Record a payment towards an existing customer debt
  const recordDebtPayment = async (saleId, { amount, payment_method = "cash", note = "" }) => {
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return null;

    let updatedSale = null;

    setSales(prevSales => {
      return prevSales.map(sale => {
        if (String(sale.id) === String(saleId)) {
          const currentPaid = Number(sale.amount_paid) || 0;
          const newPaid = currentPaid + paymentAmount;
          const newOwed = Math.max(0, (Number(sale.total_amount) || 0) - newPaid);
          const newStatus = newOwed <= 0 ? "completed" : "partial";

          const newLog = {
            id: Date.now(),
            amount: paymentAmount,
            payment_method,
            note: note || "Debt repayment",
            created_at: new Date().toISOString()
          };

          updatedSale = {
            ...sale,
            amount_paid: newPaid,
            amount_owed: newOwed,
            payment_status: newStatus,
            debt_payments: [...(sale.debt_payments || []), newLog]
          };
          return updatedSale;
        }
        return sale;
      });
    });

    try {
      await api.post(`/sales/${saleId}/debt-payment`, {
        amount: paymentAmount,
        payment_method,
        note
      });
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async debt payment post fallback:", err.message);
    }

    return updatedSale;
  };

  // Interconnected Add Stock Item Action
  const addStockItem = async (newItem) => {
    const timestamp = Date.now();
    const created = {
      id: timestamp,
      name: newItem.name.trim(),
      category: newItem.category || "General",
      unit: newItem.unit || "pcs",
      quantity: Number(newItem.quantity) || 0,
      cost_price_rwf: Number(newItem.cost_price_rwf) || 0,
      sell_price_rwf: Number(newItem.sell_price_rwf) || 0,
      low_stock_threshold: Number(newItem.low_stock_threshold) || 5,
      is_active: true,
    };
    setStock(prev => [created, ...prev]);

    try {
      await api.post("/stock", newItem);
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async stock add fallback:", err.message);
    }

    return created;
  };

  // Update Stock Item Action
  const updateStockItem = async (id, updatedFields) => {
    setStock(prev =>
      prev.map(item => (String(item.id) === String(id) ? { ...item, ...updatedFields } : item))
    );
    try {
      await api.put(`/stock/${id}`, updatedFields);
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async stock update fallback:", err.message);
    }
  };

  // Delete Stock Item Action
  const deleteStockItem = async (id) => {
    setStock(prev => prev.filter(item => String(item.id) !== String(id)));
    try {
      await api.delete(`/stock/${id}`);
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async stock delete fallback:", err.message);
    }
  };

  // Interconnected Add Expense Action
  const addExpense = async (newExpense) => {
    const timestamp = Date.now();
    const created = {
      id: timestamp,
      title: newExpense.title || newExpense.description || newExpense.category,
      category: newExpense.category,
      amount_rwf: Number(newExpense.amount) || Number(newExpense.amount_rwf) || 0,
      amount: Number(newExpense.amount) || Number(newExpense.amount_rwf) || 0,
      description: newExpense.description || newExpense.notes || "",
      notes: newExpense.description || newExpense.notes || "",
      expense_date: newExpense.expense_date || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    setExpenses(prev => [created, ...prev]);

    try {
      await api.post("/expenses", newExpense);
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async expense add fallback:", err.message);
    }

    return created;
  };

  // Update Expense Action
  const updateExpense = async (id, updatedFields) => {
    setExpenses(prev =>
      prev.map(exp => (String(exp.id) === String(id) ? { ...exp, ...updatedFields } : exp))
    );
    try {
      await api.put(`/expenses/${id}`, updatedFields);
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async expense update fallback:", err.message);
    }
  };

  // Delete Expense Action
  const deleteExpense = async (id) => {
    setExpenses(prev => prev.filter(exp => String(exp.id) !== String(id)));
    try {
      await api.delete(`/expenses/${id}`);
      setTimeout(() => refreshAll(true), 1000);
    } catch (err) {
      console.warn("[DataContext] Async expense delete fallback:", err.message);
    }
  };

  const pendingSyncCount = useMemo(() => {
    const localStock = stock.filter(p => typeof p.id === "number" && p.id > 1000000000000).length;
    const localSales = sales.filter(s => typeof s.id === "number" && s.id > 1000000000000).length;
    const localExpenses = expenses.filter(e => typeof e.id === "number" && e.id > 1000000000000).length;
    return localStock + localSales + localExpenses;
  }, [stock, sales, expenses]);

  return (
    <DataContext.Provider
      value={{
        stock,
        sales,
        expenses,
        loading,
        isOnline,
        pendingSyncCount,
        recordSale,
        voidSale,
        recordDebtPayment,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        addExpense,
        updateExpense,
        deleteExpense,
        refreshAll,
        resetData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
