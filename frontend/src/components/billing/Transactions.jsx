// src/components/billing/Transactions.jsx — sales history: view, reprint, return, cancel
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { FileText, XCircle, Printer, RotateCcw, Download } from "lucide-react";
import { billAPI, openInvoice } from "../../services/api";
import { formatCurrency, formatDateTime, formatQty, getErrorMessage, num, PAYMENT_LABELS, paymentColor, downloadCSV, debounce } from "../../utils/helpers";
import { printReceipt } from "../../utils/receipt";
import { PageLoader, EmptyState, Modal, SectionHeader, Page, Pagination, Pill, Table, Th, Td, SearchInput, Spinner, FormField } from "../shared/UI";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";

const STATUS = {
  completed: ["success", "Completed"],
  cancelled: ["danger", "Cancelled"],
  partially_returned: ["warning", "Part returned"],
  returned: ["info", "Returned"],
};

export default function Transactions() {
  const { settings } = useSettings();
  const { can } = useAuth();
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", startDate: "", endDate: "", status: "", paymentMethod: "", due: false });
  const [selected, setSelected] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const load = useCallback(async (p, f) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      Object.entries(f).forEach(([k, v]) => {
        if (v) params[k] = v === true ? "true" : v;
      });
      const res = await billAPI.getAll(params);
      setBills(res.data.data.bills);
      setPages(res.data.data.pages);
      setTotal(res.data.data.total);
      setSummary(res.data.data.summary);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, filters);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((f) => {
      setPage(1);
      load(1, f);
    }, 350),
    [],
  );
  const setFilter = (k, v, instant = true) => {
    const next = { ...filters, [k]: v };
    setFilters(next);
    if (k === "search") debouncedSearch(next);
    else if (instant) {
      setPage(1);
      load(1, next);
    }
  };

  const openBill = async (bill) => {
    setSelected(bill);
    try {
      const r = await billAPI.getById(bill.id);
      setSelected(r.data.data.bill);
    } catch {
      /* keep list version */
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await billAPI.cancel(selected.id, cancelReason);
      toast.success("Bill cancelled, stock restored");
      setCancelOpen(false);
      setCancelReason("");
      setSelected(null);
      load(page, filters);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = () =>
    downloadCSV(`sales_page${page}.csv`, [
      ["Bill", "Date", "Customer", "Phone", "Items", "Payment", "Total", "Due", "Status"],
      ...bills.map((b) => [b.billNumber, formatDateTime(b.createdAt), b.customerName, b.customerPhone, b.items?.length, b.paymentMethod, b.totalAmount, b.dueAmount, b.status]),
    ]);

  const canCancel = can("owner", "manager") || settings.cashierCanCancel;

  return (
    <Page>
      <SectionHeader
        title="Sales History"
        subtitle={`${total} bills${summary ? ` · ${formatCurrency(summary.totalAmount)}${summary.dueAmount > 0 ? ` · due ${formatCurrency(summary.dueAmount)}` : ""}` : ""}`}
        actions={
          <button className="btn-ghost" onClick={exportCSV} disabled={!bills.length}>
            <Download size={13} /> Export
          </button>
        }
      />

      <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <SearchInput value={filters.search} onChange={(v) => setFilter("search", v)} placeholder="Bill no, customer, phone…" style={{ width: 240 }} />
        <input type="date" value={filters.startDate} onChange={(e) => setFilter("startDate", e.target.value)} className="input-field" style={{ width: 150 }} />
        <input type="date" value={filters.endDate} onChange={(e) => setFilter("endDate", e.target.value)} className="input-field" style={{ width: 150 }} />
        <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="input-field" style={{ width: 150 }}>
          <option value="">All status</option>
          {Object.entries(STATUS).map(([k, [, l]]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select value={filters.paymentMethod} onChange={(e) => setFilter("paymentMethod", e.target.value)} className="input-field" style={{ width: 140 }}>
          <option value="">All payments</option>
          {["cash", "upi", "card", "credit", "split", "wallet", "cheque", "other"].map((m) => (
            <option key={m} value={m}>
              {PAYMENT_LABELS[m]}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={filters.due} onChange={(e) => setFilter("due", e.target.checked)} style={{ accentColor: "var(--accent)" }} /> Due only
        </label>
        <button
          className="btn-ghost"
          style={{ padding: "8px 12px" }}
          onClick={() => {
            const f = { search: "", startDate: "", endDate: "", status: "", paymentMethod: "", due: false };
            setFilters(f);
            setPage(1);
            load(1, f);
          }}
        >
          Clear
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <PageLoader />
        ) : bills.length === 0 ? (
          <EmptyState icon={FileText} title="No bills found" description="Bills appear here after checkout" />
        ) : (
          <>
            <div className="transactions-table">
              <Table minWidth={820}>
                <thead>
                  <tr>
                    <Th>Bill no.</Th>
                    <Th>Date & time</Th>
                    <Th>Customer</Th>
                    <Th align="right">Items</Th>
                    <Th>Payment</Th>
                    <Th align="right">Total</Th>
                    <Th align="center">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => {
                    const [tone, label] = STATUS[bill.status] || ["neutral", bill.status];
                    return (
                      <tr key={bill.id} className="table-row-hover" onClick={() => openBill(bill)} style={{ cursor: "pointer" }}>
                        <Td mono style={{ fontWeight: 500 }}>
                          {bill.billNumber}
                        </Td>
                        <Td muted style={{ whiteSpace: "nowrap", fontSize: 12.5 }}>
                          {formatDateTime(bill.createdAt)}
                        </Td>
                        <Td>
                          {bill.customerName || <span style={{ color: "var(--text-muted)" }}>—</span>}
                          {bill.customerPhone && <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{bill.customerPhone}</div>}
                        </Td>
                        <Td align="right" mono>
                          {bill.items?.length || 0}
                        </Td>
                        <Td>
                          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: paymentColor(bill.paymentMethod) }} />
                            {PAYMENT_LABELS[bill.paymentMethod] || bill.paymentMethod}
                          </span>
                        </Td>
                        <Td align="right" mono style={{ fontWeight: 600 }}>
                          {formatCurrency(bill.totalAmount)}
                          {num(bill.dueAmount) > 0 && <div style={{ fontSize: 11, color: "var(--danger)" }}>due {formatCurrency(bill.dueAmount)}</div>}
                        </Td>
                        <Td align="center">
                          <Pill tone={tone}>{label}</Pill>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            <Pagination page={page} pages={pages} onChange={setPage} />
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!selected && !returnOpen && !cancelOpen} onClose={() => setSelected(null)} title={selected?.billNumber} maxWidth={620}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }} className="form-grid">
              {[
                ["Date", formatDateTime(selected.createdAt)],
                ["Payment", PAYMENT_LABELS[selected.paymentMethod] || selected.paymentMethod],
                ["Cashier", selected.cashierName || "—"],
                ["Customer", selected.customerName || "Walk-in"],
                ["Phone", selected.customerPhone || "—"],
                ["Status", (STATUS[selected.status] || ["neutral", selected.status])[1]],
              ].map(([l, v]) => (
                <div key={l} className="card-sunken" style={{ padding: "8px 12px" }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{l}</p>
                  <p style={{ fontSize: 13.5 }}>{v}</p>
                </div>
              ))}
            </div>
            <Table minWidth={480}>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {selected.items?.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      <p style={{ fontWeight: 500 }}>{item.productName}</p>
                      <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {[num(item.taxRate) > 0 && `GST ${num(item.taxRate)}%`, num(item.discount) > 0 && `disc ${formatCurrency(item.discount)}`, num(item.returnedQty) > 0 && `returned ${formatQty(item.returnedQty)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </Td>
                    <Td align="right" mono>
                      {formatQty(item.quantity, item.unit)}
                    </Td>
                    <Td align="right" mono>
                      {formatCurrency(item.unitPrice)}
                    </Td>
                    <Td align="right" mono>
                      {formatCurrency(item.totalPrice)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="card-sunken" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
              {[
                ["Subtotal", selected.subtotal],
                ["Item discount", -num(selected.itemDiscount)],
                ["Bill discount", -num(selected.discountAmount)],
                ["Loyalty discount", -num(selected.loyaltyDiscount)],
                [`${settings.taxLabel || "GST"}${selected.pricesIncludeTax ? " (incl.)" : ""}`, selected.taxAmount],
                ["Round off", selected.roundOff],
              ]
                .filter(([, v]) => num(v) !== 0)
                .map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>{l}</span>
                    <span className="tabular">{formatCurrency(v)}</span>
                  </div>
                ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                <span>Total</span>
                <span className="tabular" style={{ color: "var(--accent-dark)" }}>
                  {formatCurrency(selected.totalAmount)}
                </span>
              </div>
              {(selected.payments || []).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-muted)" }}>
                  <span>
                    {PAYMENT_LABELS[p.method] || p.method}
                    {p.settlement ? " (collected later)" : ""}
                  </span>
                  <span className="tabular">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {num(selected.dueAmount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)", fontWeight: 600 }}>
                  <span>Balance due</span>
                  <span className="tabular">{formatCurrency(selected.dueAmount)}</span>
                </div>
              )}
              {num(selected.returnedAmount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-dark)" }}>
                  <span>Returned</span>
                  <span className="tabular">−{formatCurrency(selected.returnedAmount)}</span>
                </div>
              )}
            </div>
            {selected.returns?.length > 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                {selected.returns.map((r) => (
                  <p key={r.id}>
                    ↩ {r.returnNumber} · {formatDateTime(r.createdAt)} · {formatCurrency(r.totalAmount)} ({r.refundMethod.replace("_", " ")}) {r.reason ? `— ${r.reason}` : ""}
                  </p>
                ))}
              </div>
            )}
            {selected.notes && <p style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "pre-line" }}>{selected.notes}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-ghost" onClick={() => printReceipt(selected, settings) || toast.error("Allow pop-ups to print")}>
                <Printer size={13} /> Print receipt
              </button>
              <button className="btn-ghost" onClick={() => openInvoice(selected.id).catch((e) => toast.error(getErrorMessage(e)))}>
                <FileText size={13} /> PDF
              </button>
              <button className="btn-ghost" onClick={() => openInvoice(selected.id, "a4").catch((e) => toast.error(getErrorMessage(e)))}>
                <FileText size={13} /> A4 invoice
              </button>
              {["completed", "partially_returned"].includes(selected.status) && canCancel && (
                <button className="btn-ghost" onClick={() => setReturnOpen(true)}>
                  <RotateCcw size={13} /> Return items
                </button>
              )}
              {selected.status === "completed" && canCancel && (
                <button className="btn-danger" onClick={() => setCancelOpen(true)}>
                  <XCircle size={13} /> Cancel bill
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel bill" maxWidth={400}>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 12 }}>
          Cancel <b>{selected?.billNumber}</b>? Stock will be restored and customer dues/points reversed.
        </p>
        <FormField label="Reason">
          <input className="input-field" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Wrong billing" autoFocus />
        </FormField>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setCancelOpen(false)}>
            Back
          </button>
          <button className="btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={handleCancel} disabled={busy}>
            {busy ? <Spinner size={13} color="var(--danger)" /> : <XCircle size={13} />} Cancel bill
          </button>
        </div>
      </Modal>

      <ReturnModal
        bill={returnOpen ? selected : null}
        onClose={() => setReturnOpen(false)}
        onDone={(updated) => {
          setReturnOpen(false);
          setSelected(updated);
          load(page, filters);
        }}
      />
    </Page>
  );
}

function ReturnModal({ bill, onClose, onDone }) {
  const [qty, setQty] = useState({});
  const [restock, setRestock] = useState({});
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQty({});
    setRestock({});
    setReason("");
    setRefundMethod(bill && num(bill.dueAmount) > 0 ? "adjust_due" : "cash");
  }, [bill]);

  if (!bill) return null;
  const items = bill.items || [];
  const refund = items.reduce((a, it) => a + (num(it.totalPrice) / num(it.quantity, 1)) * num(qty[it.id]), 0);

  const submit = async () => {
    const list = items.filter((it) => num(qty[it.id]) > 0).map((it) => ({ billItemId: it.id, quantity: num(qty[it.id]), restock: restock[it.id] !== false }));
    if (!list.length) return toast.error("Enter quantity to return");
    setBusy(true);
    try {
      const r = await billAPI.returnItems(bill.id, { items: list, refundMethod, reason });
      toast.success(r.data.message);
      onDone(r.data.data.bill);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Return — ${bill.billNumber}`} maxWidth={600}>
      <Table minWidth={480}>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th align="right">Can return</Th>
            <Th align="right">Return qty</Th>
            <Th align="center">Back to stock</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const avail = Math.round((num(it.quantity) - num(it.returnedQty)) * 1000) / 1000;
            return (
              <tr key={it.id}>
                <Td>{it.productName}</Td>
                <Td align="right" mono>
                  {formatQty(avail, it.unit)}
                </Td>
                <Td align="right">
                  <input
                    type="number"
                    min="0"
                    max={avail}
                    step="any"
                    disabled={avail <= 0}
                    className="input-field"
                    style={{ width: 90, padding: "5px 8px" }}
                    value={qty[it.id] || ""}
                    onChange={(e) => setQty({ ...qty, [it.id]: Math.min(avail, Math.max(0, num(e.target.value))) || "" })}
                  />
                </Td>
                <Td align="center">
                  <input type="checkbox" checked={restock[it.id] !== false} onChange={(e) => setRestock({ ...restock, [it.id]: e.target.checked })} style={{ accentColor: "var(--accent)" }} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }} className="form-grid">
        <FormField label="Refund as">
          <select className="input-field" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            {bill.customerId && <option value="adjust_due">Reduce customer due</option>}
            {bill.customerId && <option value="store_credit">Store credit (advance)</option>}
          </select>
        </FormField>
        <FormField label="Reason">
          <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged / expired / changed mind" />
        </FormField>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 10 }}>
        <p style={{ fontSize: 15, fontWeight: 600 }}>
          Refund: <span style={{ color: "var(--accent-dark)" }}>{formatCurrency(refund)}</span>
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>
            Back
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy || refund <= 0}>
            {busy ? <Spinner size={13} color="var(--bg)" /> : <RotateCcw size={13} />} Save return
          </button>
        </div>
      </div>
    </Modal>
  );
}
