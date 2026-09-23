// src/components/shared-style payment modal used for customer dues and supplier payments
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatCurrency, getErrorMessage, num } from "../../utils/helpers";
import { Modal, Field, Grid, Spinner } from "../shared/UI";

export default function PaymentModal({ isOpen, onClose, title, balance, methods = ["cash", "upi", "card", "cheque", "other"], onSubmit }) {
  const [form, setForm] = useState({ amount: "", method: "cash", reference: "", notes: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isOpen) setForm({ amount: balance > 0 ? String(balance) : "", method: "cash", reference: "", notes: "" });
  }, [isOpen, balance]);

  const submit = async () => {
    if (!(num(form.amount) > 0)) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      await onSubmit({ ...form, amount: num(form.amount) });
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={420}>
      {balance !== undefined && (
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 14 }}>
          Outstanding: <b style={{ color: balance > 0 ? "var(--danger)" : "var(--success)" }}>{formatCurrency(balance)}</b>
        </p>
      )}
      <Grid cols={2}>
        <Field label="Amount" required>
          <input className="input-field" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
        </Field>
        <Field label="Method">
          <select className="input-field" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference / UTR">
          <input className="input-field" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
        <Field label="Note">
          <input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </Grid>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={submit} disabled={busy}>
          {busy && <Spinner size={13} color="var(--bg)" />} Save payment
        </button>
      </div>
    </Modal>
  );
}
