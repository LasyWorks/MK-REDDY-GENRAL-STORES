"use client";
import secureStorage from "@/lib/secureStorage";

/**
 * CartContext – global cart state
 *
 * Strategy:
 *  • Guest users  → cart lives in localStorage
 *  • Logged-in users → cart syncs with the backend API; localStorage is the
 *    fast-loading cache (hydrated on mount, written on every change).
 *    Each mutation fires its own independent backend call (no shared mutex).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import cartService from "@/services/cartService";

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

// ── helpers ──────────────────────────────────────────────────────────
function load() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
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

// ── Provider ──────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(load());
  }, []);

  // Persist every change
  useEffect(() => {
    save(items);
  }, [items]);

  // ── derived values ─────────────────────────────────────────────────
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // ── backend sync helper (fire-and-forget, each call independent) ───
  const backendSync = useCallback(async (fn) => {
    if (!isLoggedIn()) return;
    try {
      await fn();
    } catch (e) {
      console.warn("[cart] API sync failed:", e.message);
    }
  }, []);

  // ── mutations ──────────────────────────────────────────────────────

  /**
   * Add/increment a product in the cart.
   */
  const addItem = useCallback(
    async (product, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === product.id);
        const maxQty = product.max_order_quantity ?? 99;
        const stock = product.stock_quantity ?? 0;
        if (stock <= 0) return prev;

        if (existing) {
          const newQty = Math.min(existing.quantity + qty, maxQty, stock);
          return prev.map((i) =>
            i.id === product.id ? { ...i, quantity: newQty } : i
          );
        }
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
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
    [backendSync]
  );

  /**
   * Remove a product entirely from the cart.
   */
  const removeItem = useCallback(
    async (productId) => {
      setItems((prev) => prev.filter((i) => i.id !== productId));
      backendSync(() => cartService.removeItem(productId));
    },
    [backendSync]
  );

  /**
   * Set absolute quantity for a product.
   * Passing qty <= 0 removes the item.
   */
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
            i.stock_quantity ?? 99
          );
          return { ...i, quantity: bounded };
        })
      );
      backendSync(() => cartService.updateItem(productId, qty));
    },
    [removeItem, backendSync]
  );

  /**
   * Empty the cart (local state only — no API call).
   * Used after order placement (backend already cleared the cart).
   */
  const clearCartLocal = useCallback(() => {
    setItems([]);
  }, []);

  /**
   * Empty the cart (local + API).
   */
  const clearCart = useCallback(async () => {
    setItems([]);
    backendSync(() => cartService.clear());
  }, [backendSync]);

  /**
   * Full-sync local cart → backend cart.
   * Call this before placing an order to ensure the backend has all items.
   * Returns the backend cart response so checkout can validate.
   */
  const syncCartToBackend = useCallback(async () => {
    if (!isLoggedIn()) return null;
    const currentItems = load(); // read from localStorage for latest
    if (currentItems.length === 0) return null;
    const mapped = currentItems.map((i) => ({
      product_id: i.id,
      quantity: i.quantity,
    }));
    const res = await cartService.syncAll(mapped);
    return res.data; // the backend cart
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
