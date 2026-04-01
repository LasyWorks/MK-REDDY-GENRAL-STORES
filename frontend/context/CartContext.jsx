"use client";
import secureStorage from "@/lib/secureStorage";
import api from "@/lib/api";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import cartService from "@/services/cartService";
// Store cart locally so users don't lose items if they close browser or logout
const STORAGE_KEY = "mk-reddy-cart";
const CartContext = createContext({
  items: [],
  totalCount: 0,
  totalPrice: 0,
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
  clearCartLocal: () => {},
  syncCartToBackend: async () => {},
  isCartOpen: false,
  openCart: () => {},
  closeCart: () => {},
});
function load() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    // Return empty cart if storage is corrupted - don't crash app
    return [];
  }
}
function save(items) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return !!secureStorage.getItem("token");
}
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wholesale pricing: detect user type and fetch store-wide discount fallback
  const wsInfoRef = useRef({ isWholesale: false, discountPct: 0 });
  useEffect(() => {
    const userRaw = typeof window !== "undefined" ? secureStorage.getItem("user") : null;
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        const isWs = u.user_type === "wholesale" || u.role === "wholesale_customer";
        wsInfoRef.current.isWholesale = isWs;
        if (isWs) {
          api.get("/settings/public").then((res) => {
            if (res.data?.wholesale_discount_pct) {
              wsInfoRef.current.discountPct = parseFloat(res.data.wholesale_discount_pct) || 0;
            }
          }).catch(() => {});
        }
      } catch {
        wsInfoRef.current = { isWholesale: false, discountPct: 0 };
      }
    }
  }, []);
  // Load cart: on mount and after login, merge server cart with local cart
  const loadAndMergeCart = useCallback(async () => {
    const local = load();
    if (!isLoggedIn()) {
      setItems(local);
      return;
    }
    try {
      const res = await cartService.get();
      const serverItems = (res?.data?.items || []).map((si) => ({
        id: si.product_id,
        name: si.product_name || si.product_name_en,
        price: parseFloat(si.unit_price ?? si.current_price ?? 0),
        mrp: parseFloat(si.current_price ?? si.unit_price ?? 0),
        image_url: si.image_url || null,
        unit_pack_size: si.unit_pack_size || null,
        brand: si.brand || null,
        variant: si.variant || null,
        quantity: si.quantity,
        stock_quantity: si.stock_quantity ?? 99,
        max_order_quantity: si.max_order_quantity ?? 99,
        min_order_quantity: si.min_order_quantity ?? 1,
      }));

      if (serverItems.length === 0) {
        // Nothing on server yet — keep local cart as-is
        setItems(local);
        return;
      }

      // Merge: server is source of truth; add any local-only items on top
      const merged = [...serverItems];
      local.forEach((localItem) => {
        const exists = merged.find((s) => s.id === localItem.id);
        if (!exists) merged.push(localItem);
      });
      setItems(merged);
    } catch {
      // Server unreachable — fall back to local cart
      setItems(local);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadAndMergeCart());
  }, [loadAndMergeCart]);

  // Re-sync cart whenever user logs in on this tab
  useEffect(() => {
    const handleAuthChange = () => { queueMicrotask(() => loadAndMergeCart()); };
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, [loadAndMergeCart]);
  // Auto-save cart to localStorage whenever it changes
  useEffect(() => {
    save(items);
  }, [items]);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const backendSync = useCallback(async (fn) => {
    // Only sync to server if user is logged in - guest users keep cart locally
    if (!isLoggedIn()) return;
    try {
      await fn();
    } catch (e) {
      // Cart works offline - don't fail if server is down
      console.warn("[cart] API sync failed:", e.message);
    }
  }, []);
  const addItem = useCallback(
    async (product, qty = 1) => {
      // Resolve effective price: wholesale price for wholesale users, retail price otherwise
      const { isWholesale, discountPct } = wsInfoRef.current;
      let effectivePrice = parseFloat(product.price);
      if (isWholesale) {
        if (product.wholesale_price) {
          effectivePrice = parseFloat(product.wholesale_price);
        } else if (discountPct > 0) {
          effectivePrice = parseFloat((effectivePrice * (1 - discountPct / 100)).toFixed(2));
        }
      }

      setItems((prev) => {
        const existing = prev.find((i) => i.id === product.id);
        // Enforce business rules: max quantity and stock limits
        const maxQty = product.max_order_quantity ?? 99;
        const stock = product.stock_quantity ?? 0;
        // Don't add out-of-stock items
        if (stock <= 0) return prev;
        if (existing) {
          const newQty = Math.min(existing.quantity + qty, maxQty, stock);
          return prev.map((i) =>
            i.id === product.id ? { ...i, quantity: newQty, price: effectivePrice } : i,
          );
        }
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: effectivePrice,
            mrp: parseFloat(product.mrp || product.price),
            image_url: product.image_url || null,
            unit_pack_size: product.unit_pack_size || null,
            brand: product.brand || null,
            variant: product.variant || null,
            quantity: Math.min(qty, maxQty, stock),
            stock_quantity: stock,
            max_order_quantity: maxQty,
            min_order_quantity: product.min_order_quantity ?? 1,
          },
        ];
      });
      backendSync(() => cartService.addItem(product.id, qty));
    },
    [backendSync],
  );
  const removeItem = useCallback(
    async (productId) => {
      setItems((prev) => prev.filter((i) => i.id !== productId));
      backendSync(() => cartService.removeItem(productId));
    },
    [backendSync],
  );
  const updateQty = useCallback(
    async (productId, qty) => {
      if (qty <= 0) {
        removeItem(productId);
        return;
      }
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== productId) return i;
          const bounded = Math.min(
            qty,
            i.max_order_quantity ?? 99,
            i.stock_quantity ?? 99,
          );
          return { ...i, quantity: bounded };
        }),
      );
      backendSync(() => cartService.updateItem(productId, qty));
    },
    [removeItem, backendSync],
  );
  const clearCartLocal = useCallback(() => {
    setItems([]);
  }, []);
  const clearCart = useCallback(async () => {
    setItems([]);
    backendSync(() => cartService.clear());
  }, [backendSync]);
  const syncCartToBackend = useCallback(async () => {
    if (!isLoggedIn()) return null;
    const currentItems = load();
    if (currentItems.length === 0) return null;
    const mapped = currentItems.map((i) => ({
      product_id: i.id,
      quantity: i.quantity,
    }));
    const res = await cartService.syncAll(mapped);
    return res.data;
  }, []);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        totalPrice,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        clearCartLocal,
        syncCartToBackend,
        isCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  return useContext(CartContext);
}
