// src/components/billing/Transactions.jsx
import React, { useState, useEffect, useCallback } from "react";
import { billAPI } from "../../services/api";
import {
  formatCurrency,
  formatDateTime,
  getErrorMessage,
} from "../../utils/helpers";
import {
  PageLoader,
  EmptyState,
  Modal,
  ConfirmDialog,
  SectionHeader,
} from "../shared/UI";
import {
  FileText,
  ExternalLink,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const paymentColor = (m) =>
  ({ cash: "#3a7a5a", card: "#3a5a7a", upi: "#7a3a7a", other: "#6b6560" })[m] ||
  "#6b6560";
const statusStyle = (s) =>
  ({
    completed: { bg: "var(--success-light)", color: "var(--success)" },
    cancelled: { bg: "var(--danger-light)", color: "var(--danger)" },
    refunded: { bg: "var(--accent-light)", color: "var(--accent-dark)" },
  })[s] || { bg: "var(--bg-sunken)", color: "var(--text-muted)" };

export default function Transactions() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedBill, setSelectedBill] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = { page: p, limit: 15, ...filters };
        if (!params.startDate) delete params.startDate;
        if (!params.endDate) delete params.endDate;
        if (!params.status) delete params.status;
        const res = await billAPI.getAll(params);
        setBills(res.data.data.bills);
        setPages(res.data.data.pages);
        setTotal(res.data.data.total);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [page, filters],
  );

  useEffect(() => {
    load();
  }, [page]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await billAPI.cancel(cancelTarget.id);
      toast.success("Bill cancelled, stock restored");
      setCancelTarget(null);
      setSelectedBill(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const openInvoice = async (bill) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/bills/${bill.id}/invoice`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Invoice error:", response.status, errText);
        throw new Error(`Server error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("pdf")) {
        const text = await response.text();
        console.error("Not a PDF response:", text);
        throw new Error("Server did not return a PDF");
      }

      const blob = await response.blob();
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
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast.error(`Could not open invoice: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1280 }} className="fade-in">
      <SectionHeader title="Transactions" subtitle={`${total} bills`} />

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
          className="input-field"
          style={{ width: 150 }}
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="input-field"
          style={{ width: 150 }}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="input-field"
          style={{ width: 140 }}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setPage(1);
            load(1);
          }}
          className="btn-primary"
          style={{ padding: "9px 16px" }}
        >
          Apply
        </button>
        <button
          onClick={() => {
            setFilters({ startDate: "", endDate: "", status: "" });
            setPage(1);
            setTimeout(() => load(1), 0);
          }}
          className="btn-ghost"
          style={{ padding: "9px 16px" }}
        >
          Clear
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <PageLoader />
        ) : bills.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No transactions"
            description="Bills appear here after checkout"
          />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13.5,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      "Bill No.",
                      "Date & Time",
                      "Customer",
                      "Items",
                      "Payment",
                      "Total",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: ["Total", "Items"].includes(h)
                            ? "right"
                            : ["Status", ""].includes(h)
                              ? "center"
                              : "left",
                          padding: "11px 18px",
                          color: "var(--text-muted)",
                          fontWeight: 500,
                          fontSize: 11.5,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill, i) => {
                    const ss = statusStyle(bill.status);
                    return (
                      <tr
                        key={bill.id}
                        className="table-row-hover"
                        onClick={() => setSelectedBill(bill)}
                        style={{
                          borderBottom:
                            i < bills.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                          cursor: "pointer",
                          transition: "background 0.12s ease",
                        }}
                      >
                        <td style={{ padding: "13px 18px" }}>
                          <p
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 12.5,
                              color: "var(--text-primary)",
                              fontWeight: 500,
                            }}
                          >
                            {bill.billNumber}
                          </p>
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            color: "var(--text-muted)",
                            fontSize: 12.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDateTime(bill.createdAt)}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {bill.customerName || (
                            <span style={{ color: "var(--text-muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            textAlign: "right",
                            color: "var(--text-secondary)",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {bill.items?.length || 0}
                        </td>
                        <td style={{ padding: "13px 18px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: paymentColor(bill.paymentMethod),
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 12.5,
                                color: "var(--text-secondary)",
                                textTransform: "capitalize",
                              }}
                            >
                              {bill.paymentMethod}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            textAlign: "right",
                            fontWeight: 600,
                            fontFamily: "JetBrains Mono, monospace",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(bill.totalAmount)}
                        </td>
                        <td
                          style={{ padding: "13px 18px", textAlign: "center" }}
                        >
                          <span
                            className="badge"
                            style={{
                              background: ss.bg,
                              color: ss.color,
                              textTransform: "capitalize",
                            }}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td
                          style={{ padding: "13px 18px", textAlign: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={() => openInvoice(bill)}
                              title="Invoice PDF"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                background: "none",
                                border: "1px solid var(--border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                transition: "all 0.12s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color =
                                  "var(--text-primary)";
                                e.currentTarget.style.background =
                                  "var(--bg-sunken)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color =
                                  "var(--text-muted)";
                                e.currentTarget.style.background = "none";
                              }}
                            >
                              <ExternalLink size={12} />
                            </button>
                            {bill.status === "completed" && (
                              <button
                                onClick={() => setCancelTarget(bill)}
                                title="Cancel"
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 7,
                                  background: "none",
                                  border: "1px solid var(--border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "var(--text-muted)",
                                  transition: "all 0.12s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--danger)";
                                  e.currentTarget.style.background =
                                    "var(--danger-light)";
                                  e.currentTarget.style.borderColor =
                                    "rgba(184,64,64,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color =
                                    "var(--text-muted)";
                                  e.currentTarget.style.background = "none";
                                  e.currentTarget.style.borderColor =
                                    "var(--border)";
                                }}
                              >
                                <XCircle size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  Page {page} of {pages}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn-ghost"
                    style={{ padding: "6px 10px" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pages}
                    className="btn-ghost"
                    style={{ padding: "6px 10px" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={selectedBill?.billNumber}
        maxWidth={520}
      >
        {selectedBill && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                ["Date", formatDateTime(selectedBill.createdAt)],
                ["Payment", selectedBill.paymentMethod],
                selectedBill.customerName && [
                  "Customer",
                  selectedBill.customerName,
                ],
                selectedBill.customerPhone && [
                  "Phone",
                  selectedBill.customerPhone,
                ],
              ]
                .filter(Boolean)
                .map(([label, val]) => (
                  <div
                    key={label}
                    className="card-sunken"
                    style={{ padding: "10px 14px" }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: 13.5,
                        color: "var(--text-primary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {val}
                    </p>
                  </div>
                ))}
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Item", "Qty", "Unit", "Total"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === "Item" ? "left" : "right",
                        padding: "8px 10px",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedBill.items?.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        padding: "10px 10px",
                        color: "var(--text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {item.productName}
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        textAlign: "right",
                        color: "var(--text-secondary)",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        textAlign: "right",
                        color: "var(--text-secondary)",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              className="card-sunken"
              style={{
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 7,
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
                  {formatCurrency(selectedBill.subtotal)}
                </span>
              </div>
              {parseFloat(selectedBill.taxAmount) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>Tax ({selectedBill.taxRate}%)</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(selectedBill.taxAmount)}
                  </span>
                </div>
              )}
              {parseFloat(selectedBill.discountAmount) > 0 && (
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
                    −{formatCurrency(selectedBill.discountAmount)}
                  </span>
                </div>
              )}
              <div
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "3px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
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
                  {formatCurrency(selectedBill.totalAmount)}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => openInvoice(selectedBill)}
                className="btn-ghost"
                style={{ flex: 1, justifyContent: "center" }}
              >
                <ExternalLink size={13} /> PDF
              </button>
              {selectedBill.status === "completed" && (
                <button
                  onClick={() => {
                    setSelectedBill(null);
                    setCancelTarget(selectedBill);
                  }}
                  className="btn-danger"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <XCircle size={13} /> Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Bill"
        message={`Cancel bill "${cancelTarget?.billNumber}"? Stock will be automatically restored.`}
        loading={cancelling}
      />
    </div>
  );
}
