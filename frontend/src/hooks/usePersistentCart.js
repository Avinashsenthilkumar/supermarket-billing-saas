// src/hooks/usePersistentCart.js
// A half-built bill must survive a refresh, an accidental tab close, a crash, or a token
// expiry. Without this the cashier has to re-scan a 30-item trolley, which is the single
// most common complaint about browser-based tills.
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "pos.cart";
// A cart older than this is almost certainly abandoned, not interrupted.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || !Array.isArray(raw.cart)) return null;
    if (raw.savedAt && Date.now() - raw.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return raw;
  } catch {
    // Private mode, blocked site data, or a corrupted value — start clean.
    return null;
  }
};

const write = (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...value, savedAt: Date.now() }));
  } catch {
    /* quota or blocked storage — billing must keep working regardless */
  }
};

const clearStored = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Cart state that mirrors itself into localStorage.
 *
 * @returns {{
 *   cart: any[], setCart: Function,
 *   meta: object, setMeta: Function,
 *   restored: boolean, clearCart: Function, dismissRestored: Function
 * }}
 */
export default function usePersistentCart() {
  const initial = useRef(read());
  const [cart, setCart] = useState(() => initial.current?.cart || []);
  const [meta, setMeta] = useState(() => initial.current?.meta || {});
  // True only on the first mount after an interrupted sale, so the UI can say so once.
  const [restored, setRestored] = useState(() => (initial.current?.cart?.length || 0) > 0);

  useEffect(() => {
    if (cart.length === 0 && !Object.keys(meta).length) clearStored();
    else write({ cart, meta });
  }, [cart, meta]);

  // Another tab on the same till finishing a sale should empty this one too, so two
  // windows cannot sell the same trolley twice.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY) return;
      if (e.newValue === null) {
        setCart([]);
        setMeta({});
        return;
      }
      try {
        const next = JSON.parse(e.newValue);
        if (Array.isArray(next?.cart)) {
          setCart(next.cart);
          setMeta(next.meta || {});
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Warn before closing the tab with items in the cart.
  useEffect(() => {
    if (!cart.length) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [cart.length]);

  const clearCart = useCallback(() => {
    setCart([]);
    setMeta({});
    setRestored(false);
    clearStored();
  }, []);

  const dismissRestored = useCallback(() => setRestored(false), []);

  return { cart, setCart, meta, setMeta, restored, clearCart, dismissRestored };
}
