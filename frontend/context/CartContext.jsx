"use client";
import secureStorage from "@/lib/secureStorage";

/**
 * CartContext – global cart state
 *
 * Strategy:
 *  • Guest users  → cart lives in localStorage
 *  • Logged-in users → cart syncs with the backend API; localStorage is the
 *    fast-loading cache (hydrated on mount, written on every change)
 *
 * Shape of a cart item stored locally:
 * {
 *   id           : product.id,
 *   name         : string,
 *   price        : number,
 *   mrp          : number,
 *   image_url    : string | null,
 *   unit_pack_size: string | null,
 *   brand        : string | null,
 *   variant      : string | null,
 *   quantity     : number,
 *   stock_quantity: number,
 * }
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  const syncing = useRef(false);

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

  // ── mutations ──────────────────────────────────────────────────────

  /**
   * Add/increment a product in the cart.
   * @param {Object} product – raw product object from API
   * @param {number} qty     – how many to add (default 1)
   */
  const addItem = useCallback(
    async (product, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === product.id);
        const maxQty = product.max_order_quantity ?? 99;
        const stock = product.stock_quantity ?? 0;
        if (stock <= 0) return prev; // guard: out of stock

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

      // Sync with backend if logged in
      if (isLoggedIn() && !syncing.current) {
        syncing.current = true;
        try {
          await cartService.addItem(product.id, qty);
        } catch (e) {
          console.warn("[cart] API sync failed:", e.message);
        } finally {
          syncing.current = false;
        }
      }
    },
    []
  );

  /**
   * Remove a product entirely from the cart.
   */
  const removeItem = useCallback(async (productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));

    if (isLoggedIn() && !syncing.current) {
      syncing.current = true;
      try {
        await cartService.removeItem(productId);
      } catch (e) {
        console.warn("[cart] API sync failed:", e.message);
      } finally {
        syncing.current = false;
      }
    }
  }, []);

  /**
   * Set absolute quantity for a product.
   * Passing qty <= 0 removes the item.
   */
  const updateQty = useCallback(async (productId, qty) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== productId) return i;
        const bounded = Math.min(qty, i.max_order_quantity ?? 99, i.stock_quantity ?? 99);
        return { ...i, quantity: bounded };
      })
    );

    if (isLoggedIn() && !syncing.current) {
      syncing.current = true;
      try {
        await cartService.updateItem(productId, qty);
      } catch (e) {
        console.warn("[cart] API sync failed:", e.message);
      } finally {
        syncing.current = false;
      }
    }
  }, [removeItem]);

  /**
   * Empty the cart.
   */
  const clearCart = useCallback(async () => {
    setItems([]);
    if (isLoggedIn() && !syncing.current) {
      syncing.current = true;
      try {
        await cartService.clear();
      } catch (e) {
        console.warn("[cart] API sync failed:", e.message);
      } finally {
        syncing.current = false;
      }
    }
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
