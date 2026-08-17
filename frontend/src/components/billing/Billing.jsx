// src/components/billing/Billing.jsx
import React, { useState, useCallback, useRef } from "react";
import BarcodeScanner from "../shared/BarcodeScanner";
import { productAPI, billAPI } from "../../services/api";
import { formatCurrency, getErrorMessage, debounce } from "../../utils/helpers";
import { Spinner, Modal, FormField } from "../shared/UI";
import toast from "react-hot-toast";
import {
  Scan,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  X,
  Camera,
  CameraOff,
  CheckCircle,
} from "lucide-react";

const PAYMENT_METHODS = ["cash", "card", "upi", "other"];

function CartItem({ item, onQty, onRemove }) {
  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 1,
          }}
        >
          {item.mrp && item.mrp > item.price && (
            <span
              style={{
                fontSize: 10.5,
                color: "var(--text-muted)",
                textDecoration: "line-through",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {formatCurrency(item.mrp)}
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {formatCurrency(item.price)}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onQty(item.productId, item.quantity - 1)}
          style={{
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
          }}
        >
          <Minus size={11} />
        </button>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            minWidth: 22,
            textAlign: "center",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {item.quantity}
        </span>
        <button
          onClick={() => onQty(item.productId, item.quantity + 1)}
          disabled={item.quantity >= item.stockQty}
          style={{
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
            opacity: item.quantity >= item.stockQty ? 0.3 : 1,
          }}
        >
          <Plus size={11} />
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          minWidth: 72,
          textAlign: "right",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {formatCurrency(item.price * item.quantity)}
      </p>
      <button
        onClick={() => onRemove(item.productId)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: 3,
          borderRadius: 5,
          display: "flex",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--text-muted)")
        }
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function Billing() {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // ✅ Camera OFF by default
  const [scannerActive, setScannerActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const searchRef = React.useRef(null);
  const usbBuffer = React.useRef("");
  const usbTimer = React.useRef(null);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter") {
        if (usbBuffer.current.length > 3) {
          const code = usbBuffer.current;
          usbBuffer.current = "";
          clearTimeout(usbTimer.current);
          handleScan(code);
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line

  const [billModal, setBillModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastBill, setLastBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [billForm, setBillForm] = useState({
    paymentMethod: "cash",
    customerName: "",
    customerPhone: "",
    taxRate: "0",
    discountAmount: "0",
    notes: "",
  });

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error(`Only ${product.quantity} in stock`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (product.quantity < 1) {
        toast.error(`"${product.name}" is out of stock`);
        return prev;
      }
      toast.success(`Added ${product.name}`, { duration: 1200, icon: "✓" });
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          mrp: product.mrp ? parseFloat(product.mrp) : null,
          price: parseFloat(product.price),
          quantity: 1,
          stockQty: product.quantity,
        },
      ];
    });
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleScan = useCallback(
    async (barcode) => {
      try {
        const res = await productAPI.getByBarcode(barcode);
        addToCart(res.data.data.product);
      } catch {
        toast.error(`No product: ${barcode}`);
      }
    },
    [addToCart],
  );

  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await productAPI.getAll({ search: q, limit: 7 });
        setSearchResults(res.data.data.products);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 280),
    [],
  );

  const updateQty = (productId, newQty) => {
    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        if (newQty > i.stockQty) {
          toast.error(`Max ${i.stockQty}`);
          return i;
        }
        return { ...i, quantity: newQty };
      }),
    );
  };
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i.productId !== id));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmt = subtotal * (parseFloat(billForm.taxRate || 0) / 100);
  const discount = parseFloat(billForm.discountAmount || 0);
  const total = subtotal + taxAmt - discount;

  const submitBill = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const res = await billAPI.create({
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        paymentMethod: billForm.paymentMethod,
        customerName: billForm.customerName || undefined,
        customerPhone: billForm.customerPhone || undefined,
        taxRate: parseFloat(billForm.taxRate || 0),
        discountAmount: parseFloat(billForm.discountAmount || 0),
        notes: billForm.notes || undefined,
      });
      setLastBill(res.data.data.bill);
      clearCart();
      setBillModal(false);
      setSuccessModal(true);
      setBillForm({
        paymentMethod: "cash",
        customerName: "",
        customerPhone: "",
        taxRate: "0",
        discountAmount: "0",
        notes: "",
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCamera = () => {
    const next = !showCamera;
    setShowCamera(next);
    setScannerActive(next);
  };

  return (
    <div
      className="billing-layout"
      style={{ display: "flex", height: "100vh", overflow: "hidden" }}
    >
      {/* ── Left panel ── */}
      <div
        className="billing-main"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            paddingBottom: 18,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Fraunces','Playfair Display',serif",
                fontSize: 26,
                fontWeight: 300,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Billing
            </h1>
            <p
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}
            >
              Scan barcode or search a product
            </p>
          </div>
          {/* ✅ Camera toggle button in header */}
          <button
            onClick={toggleCamera}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${showCamera ? "rgba(58,122,90,0.3)" : "var(--border)"}`,
              background: showCamera
                ? "var(--success-light)"
                : "var(--bg-secondary)",
              color: showCamera ? "var(--success)" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {showCamera ? <Camera size={14} /> : <CameraOff size={14} />}
            {showCamera ? "Camera On" : "Camera Off"}
          </button>
        </div>

        {/* ✅ Camera — only shown when toggled on */}
        {showCamera && (
          <div className="card" style={{ padding: 18 }}>
            <BarcodeScanner
              active={scannerActive}
              onScan={handleScan}
              onError={(e) => toast.error(e)}
              height={320}
            />
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              position: "relative",
            }}
          >
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            {searching && (
              <Spinner
                size={13}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                doSearch(e.target.value);
              }}
              placeholder="Search by name, barcode or serial…"
              className="input-field"
              style={{ paddingLeft: 36, fontSize: 15 }}
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div
              className="card fade-in-fast"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                zIndex: 20,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              }}
            >
              {searchResults.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.quantity === 0}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 16px",
                    background: "none",
                    border: "none",
                    borderBottom:
                      i < searchResults.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    cursor: p.quantity === 0 ? "not-allowed" : "pointer",
                    opacity: p.quantity === 0 ? 0.5 : 1,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (p.quantity > 0)
                      e.currentTarget.style.background = "var(--bg-sunken)";
                  }}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <div>
                    <p
                      style={{
                        fontSize: 13.5,
                        color: "var(--text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        marginTop: 1,
                      }}
                    >
                      {p.category || ""}
                      {p.category && p.barcode ? " · " : ""}
                      {p.barcode}
                    </p>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {p.mrp && parseFloat(p.mrp) > parseFloat(p.price) && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            textDecoration: "line-through",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {formatCurrency(p.mrp)}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color:
                          p.quantity < 5
                            ? "var(--accent)"
                            : "var(--text-muted)",
                        marginTop: 1,
                      }}
                    >
                      {p.quantity} left
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart (wider) ── */}
      <div
        className="billing-cart"
        style={{
          width: 420,
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-card)",
        }}
      >
        {/* Cart header */}
        <div
          style={{
            padding: "22px 22px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={16} style={{ color: "var(--accent)" }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Cart
            </span>
            {cart.length > 0 && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cart.length}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--danger)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px" }}>
          {cart.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 180,
                gap: 8,
              }}
            >
              <ShoppingCart
                size={28}
                style={{ color: "var(--border-strong)" }}
              />
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Cart is empty
              </p>
              <p style={{ fontSize: 12, color: "var(--border-strong)" }}>
                Scan or search a product
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onQty={updateQty}
                onRemove={removeFromCart}
              />
            ))
          )}
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div
            style={{
              padding: "16px 22px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <span>Subtotal</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {parseFloat(billForm.taxRate) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>Tax ({billForm.taxRate}%)</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(taxAmt)}
                  </span>
                </div>
              )}
              {parseFloat(billForm.discountAmount) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--success)",
                  }}
                >
                  <span>Discount</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    −{formatCurrency(discount)}
                  </span>
                </div>
              )}
              <div
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "4px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                <span>Total</span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: "var(--accent)",
                  }}
                >
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setBillModal(true)}
              className="btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "11px 18px",
              }}
            >
              <Receipt size={15} /> Generate Bill
            </button>
          </div>
        )}
      </div>

      {/* Bill modal */}
      <Modal
        isOpen={billModal}
        onClose={() => setBillModal(false)}
        title="Complete Sale"
        maxWidth={440}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FormField label="Payment Method" required>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 8,
              }}
            >
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setBillForm({ ...billForm, paymentMethod: m })}
                  style={{
                    padding: "8px 4px",
                    borderRadius: 9,
                    border: `1px solid ${billForm.paymentMethod === m ? "var(--accent)" : "var(--border)"}`,
                    background:
                      billForm.paymentMethod === m
                        ? "var(--accent-light)"
                        : "var(--bg-sunken)",
                    color:
                      billForm.paymentMethod === m
                        ? "var(--accent-dark)"
                        : "var(--text-secondary)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </FormField>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <FormField label="Customer Name">
              <input
                type="text"
                value={billForm.customerName}
                onChange={(e) =>
                  setBillForm({ ...billForm, customerName: e.target.value })
                }
                className="input-field"
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Phone">
              <input
                type="tel"
                value={billForm.customerPhone}
                onChange={(e) =>
                  setBillForm({ ...billForm, customerPhone: e.target.value })
                }
                className="input-field"
                placeholder="Optional"
              />
            </FormField>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <FormField label="Tax Rate (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={billForm.taxRate}
                onChange={(e) =>
                  setBillForm({ ...billForm, taxRate: e.target.value })
                }
                className="input-field"
              />
            </FormField>
            <FormField label="Discount (₹)">
              <input
                type="number"
                min="0"
                value={billForm.discountAmount}
                onChange={(e) =>
                  setBillForm({ ...billForm, discountAmount: e.target.value })
                }
                className="input-field"
              />
            </FormField>
          </div>
          <div className="card-sunken" style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              <span>Items</span>
              <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              <span>Total</span>
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {formatCurrency(total)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setBillModal(false)}
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </button>
            <button
              onClick={submitBill}
              disabled={submitting}
              className="btn-primary"
              style={{ flex: 1, justifyContent: "center" }}
            >
              {submitting ? (
                <Spinner size={14} color="#f5f0e8" />
              ) : (
                <CheckCircle size={14} />
              )}{" "}
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        title="Sale Complete"
        maxWidth={340}
      >
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--success-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            <CheckCircle size={24} style={{ color: "var(--success)" }} />
          </div>
          {lastBill && (
            <div
              className="card-sunken"
              style={{ padding: "14px 20px", width: "100%" }}
            >
              <p
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                }}
              >
                {lastBill.billNumber}
              </p>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {formatCurrency(lastBill.totalAmount)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textTransform: "capitalize",
                  marginTop: 4,
                }}
              >
                {lastBill.paymentMethod}
              </p>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button
              onClick={() => setSuccessModal(false)}
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center" }}
            >
              Done
            </button>
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  const res = await fetch(`/api/bills/${lastBill.id}/invoice`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) throw new Error("Failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.target = "_blank";
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }, 1000);
                } catch {
                  toast.error("Could not open invoice");
                }
              }}
              className="btn-primary"
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Receipt size={14} /> Invoice
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
