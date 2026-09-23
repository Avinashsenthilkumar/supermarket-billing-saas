// src/components/billing/Billing.jsx — POS: scan / search → cart → checkout (split pay, credit, loyalty, hold)
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Camera,
  CameraOff,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  User,
  Printer,
  FileText,
  X,
  Gift,
  Percent,
} from "lucide-react";
import BarcodeScanner from "../shared/BarcodeScanner";
import { productAPI, billAPI, customerAPI, openInvoice } from "../../services/api";
import { formatCurrency, formatQty, getErrorMessage, debounce, num, PAYMENT_LABELS, currencySymbol } from "../../utils/helpers";
import { calculateBill } from "../../utils/billMath";
import { printReceipt } from "../../utils/receipt";
import { Spinner, Modal, FormField } from "../shared/UI";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";

const mono = { fontFamily: "JetBrains Mono, monospace" };
const qtyBtn = {
  width: 26,
  height: 26,
  borderRadius: 7,
  background: "var(--bg-sunken)",
  border: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-secondary)",
  flexShrink: 0,
};

function CartItem({ item, line, onQty, onDiscount, onRemove, canDiscount }) {
  const [editDisc, setEditDisc] = useState(false);
  const step = item.allowDecimal ? 0.25 : 1;
  return (
    <div className="fade-in" style={{ padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1, fontSize: 11.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
            {item.mrp > item.price && <span style={{ textDecoration: "line-through", ...mono }}>{formatCurrency(item.mrp)}</span>}
            <span style={mono}>
              {formatCurrency(item.price)}
              {item.unit && item.unit !== "pcs" ? `/${item.unit}` : ""}
            </span>
            {item.taxRate > 0 && <span>· GST {item.taxRate}%</span>}
            {num(item.discount) > 0 && <span style={{ color: "var(--success)" }}>· −{formatCurrency(item.discount)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={() => onQty(item.productId, Math.round((item.quantity - step) * 1000) / 1000)} style={qtyBtn} aria-label="Decrease">
            <Minus size={11} />
          </button>
          <input
            value={item.qtyText ?? String(item.quantity)}
            onChange={(e) => onQty(item.productId, e.target.value, true)}
            onBlur={() => onQty(item.productId, item.quantity)}
            inputMode="decimal"
            aria-label="Quantity"
            style={{
              width: item.allowDecimal ? 56 : 40,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              padding: "3px 2px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              ...mono,
            }}
          />
          <button onClick={() => onQty(item.productId, Math.round((item.quantity + step) * 1000) / 1000)} style={qtyBtn} aria-label="Increase">
            <Plus size={11} />
          </button>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", minWidth: 72, textAlign: "right", ...mono }}>{formatCurrency(line?.total ?? 0)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            onClick={() => onRemove(item.productId)}
            aria-label="Remove"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Trash2 size={14} />
          </button>
          {canDiscount && (
            <button
              onClick={() => setEditDisc(!editDisc)}
              aria-label="Item discount"
              title="Item discount"
              style={{ background: "none", border: "none", cursor: "pointer", color: num(item.discount) > 0 ? "var(--success)" : "var(--text-muted)", padding: 2, display: "flex" }}
            >
              <Percent size={13} />
            </button>
          )}
        </div>
      </div>
      {editDisc && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}>
          Item discount ({currencySymbol()})
          <input
            type="number"
            min="0"
            autoFocus
            value={item.discount || ""}
            onChange={(e) => onDiscount(item.productId, e.target.value)}
            className="input-field"
            style={{ width: 110, padding: "5px 8px" }}
          />
          <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setEditDisc(false)}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}

const emptyCheckout = (method) => ({ discountValue: "", discountType: "amount", redeemPoints: "", split: false, method, payments: {}, tendered: "", notes: "" });

export default function Billing() {
  const { settings } = useSettings();
  const { can } = useAuth();
  const canDiscount = can("owner", "manager") || settings.cashierCanDiscount;
  const methods = (settings.paymentMethods && settings.paymentMethods.length ? settings.paymentMethods : ["cash", "upi", "card"]).filter(
    (m) => m !== "credit" || settings.allowCreditSale,
  );

  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [held, setHeld] = useState([]);
  const [heldOpen, setHeldOpen] = useState(false);
  const [heldId, setHeldId] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState(emptyCheckout(settings.defaultPaymentMethod || "cash"));
  const [submitting, setSubmitting] = useState(false);
  const [lastBill, setLastBill] = useState(null);
  const searchRef = useRef(null);
  const usbBuffer = useRef("");
  const usbTimer = useRef(null);

  // ── Cart operations ────────────────────────────────────────────────────────
  const addToCart = useCallback(
    (product, qty = 1) => {
      const stock = num(product.quantity);
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        const nextQty = (existing ? existing.quantity : 0) + qty;
        if (!settings.allowNegativeStock && nextQty > stock) {
          toast.error(stock <= 0 ? `"${product.name}" is out of stock` : `Only ${formatQty(stock, product.unit)} in stock`);
          return prev;
        }
        if (existing) return prev.map((i) => (i.productId === product.id ? { ...i, quantity: nextQty, qtyText: undefined } : i));
        return [
          {
            productId: product.id,
            name: product.name,
            mrp: product.mrp ? num(product.mrp) : null,
            price: num(product.price),
            taxRate: num(product.taxRate),
            unit: product.unit,
            allowDecimal: !!product.allowDecimal,
            quantity: qty,
            discount: 0,
            stockQty: stock,
          },
          ...prev,
        ];
      });
      setSearchQuery("");
      setSearchResults([]);
      setActiveIdx(0);
    },
    [settings.allowNegativeStock],
  );

  const handleScan = useCallback(
    async (barcode) => {
      const code = String(barcode).trim();
      if (!code) return;
      try {
        const res = await productAPI.getByBarcode(code);
        addToCart(res.data.data.product);
        toast.success(res.data.data.product.name, { duration: 900, icon: "✓" });
      } catch {
        toast.error(`No product for barcode ${code}`);
      }
    },
    [addToCart],
  );

  const updateQty = (productId, value, typing = false) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          if (typing) {
            const cleaned = String(value).replace(i.allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
            const n = parseFloat(cleaned);
            return { ...i, qtyText: cleaned, quantity: Number.isFinite(n) && n > 0 ? n : i.quantity };
          }
          let q = num(value);
          if (!i.allowDecimal) q = Math.round(q);
          if (q <= 0) return null;
          if (!settings.allowNegativeStock && q > i.stockQty) {
            toast.error(`Only ${formatQty(i.stockQty, i.unit)} in stock`);
            q = i.stockQty;
          }
          return { ...i, quantity: q, qtyText: undefined };
        })
        .filter(Boolean),
    );
  };
  const setItemDiscount = (productId, value) => setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, discount: Math.max(0, num(value)) } : i)));
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.productId !== id));
  const resetSale = () => {
    setCart([]);
    setCustomer(null);
    setCustPhone("");
    setCustName("");
    setHeldId(null);
    setCheckout(emptyCheckout(settings.defaultPaymentMethod || "cash"));
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  // ── Search ─────────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await productAPI.getAll({ search: q, limit: 8 });
        setSearchResults(res.data.data.products);
        setActiveIdx(0);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 250),
    [],
  );

  const onSearchKey = async (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      if (searchResults[activeIdx] && !/^\d{6,}$/.test(q)) return addToCart(searchResults[activeIdx]);
      // Barcode typed / scanned into the box
      try {
        const res = await productAPI.getByBarcode(q);
        addToCart(res.data.data.product);
      } catch {
        if (searchResults[activeIdx]) addToCart(searchResults[activeIdx]);
        else toast.error(`No product found for "${q}"`);
      }
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // ── Customer lookup ────────────────────────────────────────────────────────
  const lookupCustomer = async (phone) => {
    const p = String(phone || "").trim();
    if (p.length < 6) return;
    setLookingUp(true);
    try {
      const r = await customerAPI.lookup(p);
      const c = r.data.data.customer;
      setCustomer(c);
      if (c) setCustName(c.name);
    } catch {
      setCustomer(null);
    } finally {
      setLookingUp(false);
    }
  };

  // ── Held bills ─────────────────────────────────────────────────────────────
  const loadHeld = useCallback(async () => {
    try {
      const r = await billAPI.getHeld();
      setHeld(r.data.data.held);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadHeld();
  }, [loadHeld]);

  const holdCurrent = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    try {
      await billAPI.hold({
        label: custName || custPhone || undefined,
        cart,
        meta: { custPhone, custName },
      });
      if (heldId) await billAPI.deleteHeld(heldId).catch(() => {});
      toast.success("Bill put on hold");
      resetSale();
      loadHeld();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const resumeHeld = (h) => {
    if (cart.length && !window.confirm("Replace the current cart with the held bill?")) return;
    setCart(h.cart || []);
    setCustPhone(h.meta?.custPhone || "");
    setCustName(h.meta?.custName || "");
    setCustomer(null);
    if (h.meta?.custPhone) lookupCustomer(h.meta.custPhone);
    setHeldId(h.id);
    setHeldOpen(false);
  };

  // ── Totals (same math as server) ──────────────────────────────────────────
  const netBeforeBillDiscount = cart.reduce((s, i) => s + Math.max(0, i.price * i.quantity - num(i.discount)), 0);
  const billDiscount =
    checkout.discountType === "percent" ? (netBeforeBillDiscount * Math.min(100, num(checkout.discountValue))) / 100 : num(checkout.discountValue);
  const redeem = Math.floor(num(checkout.redeemPoints));
  const calc = useMemo(
    () =>
      calculateBill(
        cart.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity, discount: i.discount, taxRate: i.taxRate })),
        {
          billDiscount,
          loyaltyDiscount: redeem * num(settings.loyaltyPointValue, 1),
          pricesIncludeTax: settings.pricesIncludeTax,
          taxEnabled: settings.taxEnabled,
          roundOff: settings.roundOff,
        },
      ),
    [cart, billDiscount, redeem, settings.loyaltyPointValue, settings.pricesIncludeTax, settings.taxEnabled, settings.roundOff],
  );
  const lineFor = (productId) => calc.lines.find((l) => l.productId === productId);
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const paymentList = checkout.split
    ? Object.entries(checkout.payments)
        .filter(([, v]) => num(v) > 0)
        .map(([method, amount]) => ({ method, amount: num(amount) }))
    : checkout.method === "cash" && num(checkout.tendered) > 0
      ? [{ method: "cash", amount: num(checkout.tendered) }]
      : [{ method: checkout.method, amount: calc.totalAmount }];
  const tendered = paymentList.filter((p) => p.method !== "credit").reduce((s, p) => s + p.amount, 0);
  const change = Math.max(0, tendered - calc.totalAmount);
  const due = Math.max(0, Math.round((calc.totalAmount - tendered) * 100) / 100);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitBill = async () => {
    if (!cart.length || submitting) return;
    if (due > 0 && !custPhone.trim() && settings.requireCustomerForCredit) return toast.error("Enter customer phone for a credit / due sale");
    setSubmitting(true);
    try {
      const res = await billAPI.create({
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, discount: num(i.discount) })),
        customerId: customer?.id,
        customerName: custName || undefined,
        customerPhone: custPhone.trim() || undefined,
        discountAmount: checkout.discountType === "amount" ? num(checkout.discountValue) : 0,
        discountPercent: checkout.discountType === "percent" ? num(checkout.discountValue) : 0,
        redeemPoints: redeem || 0,
        payments: paymentList,
        notes: checkout.notes || undefined,
        heldBillId: heldId || undefined,
      });
      const bill = res.data.data.bill;
      setLastBill(bill);
      setCheckoutOpen(false);
      resetSale();
      if (heldId) loadHeld();
      if (settings.autoPrintAfterSale) printReceipt(bill, settings);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckout = () => {
    if (!cart.length) return;
    setCheckout((c) => ({ ...c, method: methods.includes(c.method) ? c.method : methods[0] }));
    setCheckoutOpen(true);
  };

  // ── Keyboard: USB scanner (typing outside inputs) + shortcuts ─────────────
  const handlersRef = useRef({});
  handlersRef.current = { handleScan, openCheckout, holdCurrent, submitBill, checkoutOpen };
  useEffect(() => {
    const onKey = (e) => {
      const h = handlersRef.current;
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        h.holdCurrent();
        return;
      }
      if (e.key === "F9" || e.key === "F12") {
        e.preventDefault();
        if (h.checkoutOpen) h.submitBill();
        else h.openCheckout();
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Enter") {
        if (usbBuffer.current.length > 3) {
          const code = usbBuffer.current;
          usbBuffer.current = "";
          clearTimeout(usbTimer.current);
          h.handleScan(code);
        }
        return;
      }
      if (e.key.length === 1) {
        usbBuffer.current += e.key;
        clearTimeout(usbTimer.current);
        usbTimer.current = setTimeout(() => {
          usbBuffer.current = "";
        }, 100);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pointsValue = customer ? num(customer.loyaltyPoints) * num(settings.loyaltyPointValue, 1) : 0;

  return (
    <div className="billing-layout" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Left panel ── */}
      <div className="billing-main" style={{ flex: 1, overflowY: "auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces','Playfair Display',serif", fontSize: 26, fontWeight: 300, color: "var(--text-primary)" }}>Billing</h1>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>F2 search · F4 hold · F9 checkout · scan anywhere</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={() => setHeldOpen(true)}>
              <PlayCircle size={14} /> Held ({held.length})
            </button>
            <button
              onClick={() => setShowCamera(!showCamera)}
              className="btn-ghost"
              style={showCamera ? { background: "var(--success-light)", color: "var(--success)", borderColor: "var(--success)" } : undefined}
            >
              {showCamera ? <Camera size={14} /> : <CameraOff size={14} />}
              {showCamera ? "Camera on" : "Camera off"}
            </button>
          </div>
        </div>

        {showCamera && (
          <div className="card" style={{ padding: 18 }}>
            <BarcodeScanner active={showCamera} onScan={handleScan} onError={(e) => toast.error(e)} height={300} />
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", zIndex: 1 }} />
          {searching && <Spinner size={14} style={{ position: "absolute", right: 13, top: "50%", marginTop: -7 }} />}
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              doSearch(e.target.value);
            }}
            onKeyDown={onSearchKey}
            placeholder="Search product name / scan or type barcode, then Enter…"
            className="input-field"
            style={{ paddingLeft: 38, fontSize: 15, padding: "12px 14px 12px 38px" }}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="card fade-in-fast" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
              {searchResults.map((p, i) => {
                const out = num(p.quantity) <= 0 && !settings.allowNegativeStock;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    onMouseEnter={() => setActiveIdx(i)}
                    disabled={out}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 16px",
                      background: i === activeIdx ? "var(--bg-sunken)" : "none",
                      border: "none",
                      borderBottom: i < searchResults.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: out ? "not-allowed" : "pointer",
                      opacity: out ? 0.5 : 1,
                      textAlign: "left",
                      color: "inherit",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{[p.brand, p.category, p.barcode].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                        {num(p.mrp) > num(p.price) && <span style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through", ...mono }}>{formatCurrency(p.mrp)}</span>}
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", ...mono }}>{formatCurrency(p.price)}</span>
                      </div>
                      <p style={{ fontSize: 11, color: num(p.quantity) <= num(p.reorderLevel) ? "var(--accent-dark)" : "var(--text-muted)", marginTop: 1 }}>
                        {formatQty(p.quantity, p.unit)} left
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
            <User size={14} style={{ color: "var(--accent)" }} /> Customer <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional — needed for credit & points)</span>
          </div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <input
                className="input-field"
                type="tel"
                placeholder="Phone number"
                value={custPhone}
                onChange={(e) => {
                  setCustPhone(e.target.value);
                  setCustomer(null);
                }}
                onBlur={() => lookupCustomer(custPhone)}
                onKeyDown={(e) => e.key === "Enter" && lookupCustomer(custPhone)}
              />
              {lookingUp && <Spinner size={13} style={{ position: "absolute", right: 10, top: "50%", marginTop: -6 }} />}
            </div>
            <input className="input-field" placeholder="Name" value={custName} onChange={(e) => setCustName(e.target.value)} />
          </div>
          {customer ? (
            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12.5, color: "var(--text-secondary)", flexWrap: "wrap" }}>
              <span>
                ✓ <b>{customer.name}</b> · {customer.totalBills} visits
              </span>
              {settings.loyaltyEnabled && (
                <span style={{ color: "var(--accent-dark)" }}>
                  <Gift size={12} style={{ verticalAlign: -2 }} /> {num(customer.loyaltyPoints)} pts ({formatCurrency(pointsValue)})
                </span>
              )}
              {num(customer.balance) > 0 && <span style={{ color: "var(--danger)" }}>Due {formatCurrency(customer.balance)}</span>}
              {num(customer.balance) < 0 && <span style={{ color: "var(--success)" }}>Advance {formatCurrency(-num(customer.balance))}</span>}
            </div>
          ) : (
            custPhone.trim().length >= 6 &&
            !lookingUp && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>New customer — will be saved with this bill.</p>
          )}
        </div>
      </div>

      {/* ── Right: Cart ── */}
      <div className="billing-cart" style={{ width: 430, borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg-card)" }}>
        <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Cart</span>
            {cart.length > 0 && (
              <span style={{ background: "var(--accent)", color: "var(--accent-contrast)", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cart.length}
              </span>
            )}
            {heldId && <span style={{ fontSize: 11, color: "var(--accent-dark)" }}>(resumed)</span>}
          </div>
          {cart.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={holdCurrent} style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <PauseCircle size={13} /> Hold
              </button>
              <button
                onClick={() => window.confirm("Clear the cart?") && resetSale()}
                style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px" }}>
          {cart.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8 }}>
              <ShoppingCart size={28} style={{ color: "var(--border-strong)" }} />
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Cart is empty</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Scan or search a product</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                line={lineFor(item.productId)}
                onQty={updateQty}
                onDiscount={setItemDiscount}
                onRemove={removeFromCart}
                canDiscount={canDiscount}
              />
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, fontSize: 13, color: "var(--text-secondary)" }}>
              <Row label={`Subtotal (${formatQty(totalQty)} qty)`} value={formatCurrency(calc.subtotal)} />
              {calc.itemDiscount > 0 && <Row label="Item discounts" value={`−${formatCurrency(calc.itemDiscount)}`} color="var(--success)" />}
              {settings.taxEnabled && calc.taxAmount > 0 && <Row label={`${settings.taxLabel || "GST"}${settings.pricesIncludeTax ? " (included)" : ""}`} value={formatCurrency(calc.taxAmount)} />}
              {calc.roundOff !== 0 && <Row label="Round off" value={formatCurrency(calc.roundOff)} />}
              <div style={{ height: 1, background: "var(--border)", margin: "3px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>Total</span>
                <span style={{ ...mono, color: "var(--accent-dark)" }}>{formatCurrency(calc.totalAmount)}</span>
              </div>
            </div>
            <button onClick={openCheckout} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px 18px", fontSize: 14 }}>
              <Receipt size={15} /> Checkout (F9)
            </button>
          </div>
        )}
      </div>

      {/* ── Checkout modal ── */}
      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Complete sale" maxWidth={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-sunken" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {cart.length} items · {custName || custPhone || "Walk-in customer"}
              </p>
              <p style={{ fontSize: 26, fontWeight: 600, color: "var(--accent-dark)", ...mono }}>{formatCurrency(calc.totalAmount)}</p>
            </div>
            {(calc.billDiscount > 0 || calc.loyaltyDiscount > 0) && (
              <div style={{ textAlign: "right", fontSize: 12, color: "var(--success)" }}>
                {calc.billDiscount > 0 && <p>Discount −{formatCurrency(calc.billDiscount)}</p>}
                {calc.loyaltyDiscount > 0 && <p>Points −{formatCurrency(calc.loyaltyDiscount)}</p>}
              </div>
            )}
          </div>

          {canDiscount && (
            <FormField label="Bill discount">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={checkout.discountValue}
                  onChange={(e) => setCheckout({ ...checkout, discountValue: e.target.value })}
                  placeholder="0"
                  style={{ flex: 1 }}
                />
                <select className="input-field" style={{ width: 90 }} value={checkout.discountType} onChange={(e) => setCheckout({ ...checkout, discountType: e.target.value })}>
                  <option value="amount">{currencySymbol()}</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </FormField>
          )}

          {settings.loyaltyEnabled && customer && num(customer.loyaltyPoints) >= num(settings.loyaltyMinRedeem) && (
            <FormField label={`Redeem points (has ${num(customer.loyaltyPoints)}, 1 pt = ${formatCurrency(settings.loyaltyPointValue)})`}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  max={num(customer.loyaltyPoints)}
                  className="input-field"
                  value={checkout.redeemPoints}
                  onChange={(e) => setCheckout({ ...checkout, redeemPoints: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button className="btn-ghost" onClick={() => setCheckout({ ...checkout, redeemPoints: String(Math.floor(num(customer.loyaltyPoints))) })}>
                  Use all
                </button>
              </div>
            </FormField>
          )}

          <FormField label="Payment">
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, methods.length + 1)}, 1fr)`, gap: 8 }}>
              {methods.map((m) => {
                const active = !checkout.split && checkout.method === m;
                return (
                  <button
                    key={m}
                    onClick={() => setCheckout({ ...checkout, split: false, method: m, tendered: "" })}
                    style={{
                      padding: "9px 4px",
                      borderRadius: 9,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-light)" : "var(--bg-sunken)",
                      color: active ? "var(--accent-dark)" : "var(--text-secondary)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {PAYMENT_LABELS[m] || m}
                  </button>
                );
              })}
              <button
                onClick={() => setCheckout({ ...checkout, split: true, payments: {} })}
                style={{
                  padding: "9px 4px",
                  borderRadius: 9,
                  border: `1px solid ${checkout.split ? "var(--accent)" : "var(--border)"}`,
                  background: checkout.split ? "var(--accent-light)" : "var(--bg-sunken)",
                  color: checkout.split ? "var(--accent-dark)" : "var(--text-secondary)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Split
              </button>
            </div>
          </FormField>

          {!checkout.split && checkout.method === "cash" && (
            <FormField label="Cash received (optional — to calculate change)">
              <input
                type="number"
                min="0"
                className="input-field"
                value={checkout.tendered}
                onChange={(e) => setCheckout({ ...checkout, tendered: e.target.value })}
                placeholder={calc.totalAmount.toFixed(2)}
                autoFocus
              />
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {[...new Set([Math.ceil(calc.totalAmount / 10) * 10, Math.ceil(calc.totalAmount / 100) * 100, Math.ceil(calc.totalAmount / 500) * 500, 2000])]
                  .filter((v) => v >= calc.totalAmount)
                  .slice(0, 4)
                  .map((v) => (
                    <button key={v} className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setCheckout({ ...checkout, tendered: String(v) })}>
                      {formatCurrency(v)}
                    </button>
                  ))}
              </div>
            </FormField>
          )}

          {checkout.split && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="form-grid">
              {methods.map((m) => (
                <FormField key={m} label={PAYMENT_LABELS[m] || m}>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={checkout.payments[m] || ""}
                    onChange={(e) => setCheckout({ ...checkout, payments: { ...checkout.payments, [m]: e.target.value } })}
                  />
                </FormField>
              ))}
            </div>
          )}

          <div className="card-sunken" style={{ padding: "10px 14px", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
            <Row label="Paid now" value={formatCurrency(Math.min(tendered, calc.totalAmount))} />
            {change > 0 && <Row label="Change to return" value={formatCurrency(change)} color="var(--success)" bold />}
            {due > 0 && <Row label="Balance due (credit)" value={formatCurrency(due)} color="var(--danger)" bold />}
          </div>

          <FormField label="Note (optional)">
            <input className="input-field" value={checkout.notes} onChange={(e) => setCheckout({ ...checkout, notes: e.target.value })} />
          </FormField>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setCheckoutOpen(false)} className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
              Back
            </button>
            <button onClick={submitBill} disabled={submitting} className="btn-primary" style={{ flex: 2, justifyContent: "center", padding: "11px" }}>
              {submitting ? <Spinner size={14} color="var(--bg)" /> : <CheckCircle size={15} />} Confirm sale (F9)
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Held bills ── */}
      <Modal isOpen={heldOpen} onClose={() => setHeldOpen(false)} title="Held bills" maxWidth={460}>
        {held.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>No bills on hold</p>
        ) : (
          held.map((h) => {
            const total = (h.cart || []).reduce((s, i) => s + num(i.price) * num(i.quantity) - num(i.discount), 0);
            return (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500 }}>{h.label}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {(h.cart || []).length} items · {formatCurrency(total)} · by {h.createdBy}
                  </p>
                </div>
                <button className="btn-primary" style={{ padding: "6px 12px" }} onClick={() => resumeHeld(h)}>
                  Resume
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: "6px 8px" }}
                  aria-label="Delete held bill"
                  onClick={async () => {
                    await billAPI.deleteHeld(h.id).catch(() => {});
                    loadHeld();
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })
        )}
      </Modal>

      {/* ── Success ── */}
      <Modal isOpen={!!lastBill} onClose={() => setLastBill(null)} title="Sale complete" maxWidth={380}>
        {lastBill && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={24} style={{ color: "var(--success)" }} />
            </div>
            <div className="card-sunken" style={{ padding: "14px 20px", width: "100%" }}>
              <p style={{ ...mono, fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{lastBill.billNumber}</p>
              <p style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", ...mono }}>{formatCurrency(lastBill.totalAmount)}</p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                {PAYMENT_LABELS[lastBill.paymentMethod] || lastBill.paymentMethod}
                {num(lastBill.changeReturned) > 0 && ` · Change ${formatCurrency(lastBill.changeReturned)}`}
              </p>
              {num(lastBill.dueAmount) > 0 && <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 4 }}>Due: {formatCurrency(lastBill.dueAmount)}</p>}
              {num(lastBill.loyaltyEarned) > 0 && <p style={{ fontSize: 12.5, color: "var(--accent-dark)", marginTop: 4 }}>+{num(lastBill.loyaltyEarned)} loyalty points</p>}
            </div>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => printReceipt(lastBill, settings) || toast.error("Allow pop-ups to print")}>
                <Printer size={14} /> Print
              </button>
              <button
                className="btn-ghost"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => openInvoice(lastBill.id).catch((e) => toast.error(getErrorMessage(e)))}
              >
                <FileText size={14} /> PDF
              </button>
            </div>
            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                setLastBill(null);
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
              autoFocus
            >
              New bill
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: color || "inherit", fontWeight: bold ? 600 : 400 }}>
      <span>{label}</span>
      <span style={mono}>{value}</span>
    </div>
  );
}
