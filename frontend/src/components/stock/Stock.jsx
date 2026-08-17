// src/components/stock/Stock.jsx
import React, { useState, useEffect, useCallback } from "react";
import { productAPI, reportAPI } from "../../services/api";
import { formatCurrency, getErrorMessage, debounce } from "../../utils/helpers";
import {
  Spinner,
  Modal,
  FormField,
  EmptyState,
  ConfirmDialog,
  SearchInput,
  SectionHeader,
} from "../shared/UI";
import BarcodeScanner from "../shared/BarcodeScanner";
import toast from "react-hot-toast";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Scan,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Printer,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
const EMPTY = {
  name: "",
  barcode: "",
  serialNumber: "",
  mrp: "",
  price: "",
  quantity: "",
  category: "",
  netQty: "",
  description: "",
  expiryDate: "",
};

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const stockBadge = (qty) => {
  if (qty === 0)
    return {
      label: "Out of stock",
      bg: "var(--danger-light)",
      color: "var(--danger)",
    };
  if (qty < 10)
    return {
      label: "Low stock",
      bg: "rgba(193,127,58,0.10)",
      color: "var(--accent-dark)",
    };
  return {
    label: "In stock",
    bg: "var(--success-light)",
    color: "var(--success)",
  };
};

const expiryStatus = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return {
      label: "Expired",
      bg: "var(--danger-light)",
      color: "var(--danger)",
      days: diffDays,
    };
  if (diffDays <= 30)
    return {
      label: `${diffDays}d left`,
      bg: "rgba(193,127,58,0.10)",
      color: "var(--accent-dark)",
      days: diffDays,
    };
  return {
    label: exp.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    bg: "var(--success-light)",
    color: "var(--success)",
    days: diffDays,
  };
};

function ProductModal({ isOpen, onClose, product, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const isEdit = !!product;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(
      product
        ? {
            name: product.name || "",
            barcode: product.barcode || "",
            serialNumber: product.serialNumber || "",
            mrp: product.mrp ? String(product.mrp) : "",
            price: product.price || "",
            quantity:
              product.quantity !== undefined && product.quantity !== null
                ? String(product.quantity)
                : "0",
            category: product.category || "",
            description:
              product.description && !product.description.startsWith("Net Qty:")
                ? product.description
                : "",
            netQty:
              product.description && product.description.startsWith("Net Qty:")
                ? product.description.replace("Net Qty:", "").trim()
                : "",
            expiryDate: product.expiryDate
              ? product.expiryDate.slice(0, 10)
              : "",
          }
        : EMPTY,
    );
  }, [product, isOpen]);

  const handleSubmit = async () => {
    if (!form.name || !form.price)
      return toast.error("Name and price required");
    setLoading(true);
    try {
      const { netQty, ...rest } = form;
      const payload = {
        ...rest,
        mrp: form.mrp ? parseFloat(form.mrp) : null,
        price: parseFloat(form.price),
        quantity: form.quantity !== "" ? parseInt(form.quantity) : 0,
        serialNumber: form.serialNumber || null,
        barcode: form.barcode || null,
        description: netQty ? `Net Qty: ${netQty}` : form.description,
        expiryDate: form.expiryDate || null,
      };
      isEdit
        ? await productAPI.update(product.id, payload)
        : await productAPI.create(payload);
      toast.success(isEdit ? "Product updated" : "Product created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "New Product"}
      maxWidth={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <FormField label="Product Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input-field"
              placeholder="e.g. Basmati Rice 1kg"
            />
          </FormField>
          <FormField label="Category">
            <input
              type="text"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="input-field"
              placeholder="e.g. Grains"
            />
          </FormField>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <FormField label="Barcode">
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
              className="input-field"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
              placeholder="Scan or type"
            />
          </FormField>
          <FormField label="Serial Number">
            <input
              type="text"
              value={form.serialNumber}
              onChange={(e) => set("serialNumber", e.target.value)}
              className="input-field"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
              placeholder="Optional"
            />
          </FormField>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <FormField label="MRP (₹)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.mrp}
              onChange={(e) => set("mrp", e.target.value)}
              className="input-field"
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Price (₹)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className="input-field"
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Quantity">
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              className="input-field"
              placeholder="0"
            />
          </FormField>
        </div>
        <FormField label="Expiry Date">
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => set("expiryDate", e.target.value)}
            className="input-field"
          />
        </FormField>
        <FormField label="Net Quantity">
          <input
            type="text"
            value={form.netQty}
            onChange={(e) => set("netQty", e.target.value)}
            className="input-field"
            placeholder="e.g. 1kg, 500ml, 12pcs"
          />
        </FormField>
        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input-field"
            rows={2}
            placeholder="Optional notes"
            style={{ resize: "none" }}
          />
        </FormField>
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? (
              <Spinner size={13} color="#f5f0e8" />
            ) : (
              <Check size={13} />
            )}
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ScanForm({ scanned, isNew, onSubmit, onReset, loading }) {
  const [qty, setQty] = React.useState("");
  const [expiry, setExpiry] = React.useState(
    scanned?.expiryDate ? scanned.expiryDate.slice(0, 10) : "",
  );
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [category, setCategory] = React.useState("");

  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: isNew ? "rgba(193,127,58,0.08)" : "var(--success-light)",
          border: `1px solid ${isNew ? "rgba(193,127,58,0.2)" : "rgba(58,122,90,0.2)"}`,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isNew ? "var(--accent-dark)" : "var(--success)",
            marginBottom: 4,
          }}
        >
          {isNew
            ? "🆕 New product — fill details below"
            : `✅ Found: ${scanned?.name}`}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {scanned?.barcode}
        </p>
        {!isNew && (
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 6,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            {scanned?.category && <span>📦 {scanned.category}</span>}
            {scanned?.price && (
              <span>💰 ₹{parseFloat(scanned.price).toFixed(2)}</span>
            )}
            <span>
              🗃 Stock: <strong>{scanned?.quantity}</strong>
            </span>
          </div>
        )}
      </div>

      {isNew && (
        <>
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Product name"
              autoFocus
            />
          </FormField>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <FormField label="Price (₹)" required>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-field"
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Category">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
                placeholder="e.g. Grains"
              />
            </FormField>
          </div>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField label={isNew ? "Initial Quantity" : "Quantity to Add"}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter qty"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
            className="input-field"
            autoFocus={!isNew}
          />
        </FormField>
        <FormField label="Expiry Date">
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input-field"
          />
        </FormField>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onReset}
          className="btn-ghost"
          style={{ flex: 1, justifyContent: "center" }}
        >
          <X size={13} />
          Re-scan
        </button>
        <button
          onClick={() => onSubmit({ qty, expiry, name, price, category })}
          disabled={loading}
          className="btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
        >
          {loading ? (
            <Spinner size={13} color="#f5f0e8" />
          ) : (
            <Check size={13} />
          )}
          {isNew ? "Create Product" : "Add Stock"}
        </button>
      </div>
    </div>
  );
}

function ScanModal({ isOpen, onClose, onScanned }) {
  const [scanned, setScanned] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = React.useState("");

  useEffect(() => {
    if (isOpen) {
      setScanned(null);
      setIsNew(false);
      setScanning(true);
      setManualCode("");
    }
  }, [isOpen]);

  const handleScan = async (barcode) => {
    setScanning(false);
    try {
      const res = await productAPI.getByBarcode(barcode);
      setScanned({ ...res.data.data.product, barcode });
      setIsNew(false);
    } catch {
      setScanned({ barcode });
      setIsNew(true);
    }
  };

  const handleSubmit = async ({ qty, expiry, name, price, category }) => {
    if (!scanned) return;
    const q = parseInt(qty);
    if (!q || q < 1) return toast.error("Enter a valid quantity");
    setLoading(true);
    try {
      const payload = {
        barcode: scanned.barcode,
        quantity: q,
        expiryDate: expiry || null,
      };
      if (isNew) {
        if (!name || !price) return toast.error("Name and price required");
        Object.assign(payload, { name, price: parseFloat(price), category });
      }
      const res = await productAPI.scan(payload);
      toast.success(
        res.data.data.action === "created"
          ? "Product created"
          : "Stock updated",
      );
      onScanned?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) {
      setManualCode("");
      handleScan(code);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan to Update Stock"
      maxWidth={700}
    >
      {!scanned ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BarcodeScanner
            active={scanning && isOpen}
            onScan={handleScan}
            onError={(e) => toast.error(e)}
            height={380}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              — or use a USB/Bluetooth barcode scanner —
            </p>
            <form
              onSubmit={handleManualSubmit}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                type="text"
                className="input-field"
                placeholder="Scan with USB scanner or type barcode..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setManualCode("");
                }}
                style={{
                  flex: 1,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 13,
                }}
                autoFocus
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ whiteSpace: "nowrap", gap: 6 }}
              >
                <Scan size={13} /> Search
              </button>
            </form>
          </div>
        </div>
      ) : (
        <ScanForm
          key={scanned.barcode}
          scanned={scanned}
          isNew={isNew}
          onSubmit={handleSubmit}
          onReset={() => {
            setScanned(null);
            setIsNew(false);
            setScanning(true);
          }}
          loading={loading}
        />
      )}
    </Modal>
  );
}

function BulkImportModal({ isOpen, onClose, onImported }) {
  const [step, setStep] = useState("upload");
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = React.useRef();

  const reset = () => {
    setStep("upload");
    setRows([]);
    setResult(null);
  };

  const parseFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    if (ext === "csv") {
      reader.onload = (e) => {
        const lines = e.target.result.split("\n").filter(Boolean);
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/"/g, ""));
        const parsed = lines
          .slice(1)
          .map((line) => {
            const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
            return headers.reduce((obj, h, i) => {
              const key = h.toLowerCase().replace(/[^a-z]/g, "");
              obj[key] = vals[i] || "";
              return obj;
            }, {});
          })
          .filter((r) => r.name && r.name.trim());
        setRows(
          parsed.map((r) => ({
            name: r.name || "",
            price: r.price || "",
            mrp: r.mrp || "",
            quantity: r.quantity || r.qty || "0",
            category: r.category || "",
            barcode: r.barcode || "",
            expiryDate: r.expirydate || r.expiry || "",
            description: r.description || r.desc || "",
          })),
        );
        setStep("preview");
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const normalize = (obj) => {
            const out = {};
            Object.keys(obj).forEach((k) => {
              out[
                k
                  .toString()
                  .toLowerCase()
                  .replace(/[^a-z]/g, "")
              ] = obj[k];
            });
            return out;
          };
          setRows(
            data
              .map((r) => {
                const n = normalize(r);
                return {
                  name: String(n.name || ""),
                  price: String(n.price || ""),
                  mrp: String(n.mrp || ""),
                  quantity: String(n.quantity || n.qty || "0"),
                  category: String(n.category || ""),
                  barcode: String(n.barcode || ""),
                  expiryDate: String(n.expirydate || n.expiry || ""),
                  description: String(n.description || n.desc || ""),
                };
              })
              .filter((r) => r.name && r.name.trim()),
          );
          setStep("preview");
        } catch {
          toast.error("Failed to read Excel file");
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Only .csv, .xlsx, .xls files supported");
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await productAPI.bulkImport(rows);
      setResult(res.data.data);
      setStep("result");
      onImported?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "name,price,mrp,quantity,category,barcode,expiryDate,description\nBarcode Rice 1kg,120,150,50,Grains,8901234567890,2026-12-31,Premium quality\nSunflower Oil 1L,180,200,30,Oils,8901234567891,2026-06-30,";
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "supermart-import-template.csv";
    a.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Bulk Import Products"
      maxWidth={780}
    >
      {step === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              parseFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 14,
              padding: "40px 20px",
              textAlign: "center",
              background: dragOver
                ? "rgba(193,127,58,0.06)"
                : "var(--bg-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => parseFile(e.target.files[0])}
            />
            <FileSpreadsheet
              size={40}
              style={{ color: "var(--accent)", margin: "0 auto 12px" }}
            />
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Drop your spreadsheet here
            </p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Supports <strong>.csv</strong>, <strong>.xlsx</strong>,{" "}
              <strong>.xls</strong> — Click to browse
            </p>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Required columns in your sheet
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { col: "name", req: true },
                { col: "price", req: true },
                { col: "mrp", req: false },
                { col: "quantity", req: false },
                { col: "category", req: false },
                { col: "barcode", req: false },
                { col: "expiryDate", req: false },
                { col: "description", req: false },
              ].map(({ col, req }) => (
                <span
                  key={col}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "monospace",
                    background: req
                      ? "rgba(193,127,58,0.12)"
                      : "var(--bg-primary)",
                    color: req ? "var(--accent-dark)" : "var(--text-muted)",
                    border: `1px solid ${req ? "rgba(193,127,58,0.25)" : "var(--border)"}`,
                  }}
                >
                  {col}
                  {req ? " *" : ""}
                </span>
              ))}
            </div>
            <p
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}
            >
              * Required &nbsp;|&nbsp; expiryDate format: YYYY-MM-DD
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="btn-ghost"
            style={{ alignSelf: "flex-start", gap: 7 }}
          >
            <Upload size={13} /> Download Template CSV
          </button>
        </div>
      )}

      {step === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                {rows.length}
              </strong>{" "}
              products ready to import
            </p>
            <button
              onClick={reset}
              className="btn-ghost"
              style={{ fontSize: 12 }}
            >
              <X size={12} /> Change file
            </button>
          </div>
          <div
            style={{
              maxHeight: 340,
              overflowY: "auto",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-secondary)",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {[
                    "#",
                    "Name",
                    "Price",
                    "MRP",
                    "Qty",
                    "Category",
                    "Barcode",
                    "Expiry",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background:
                        i % 2 === 0 ? "transparent" : "var(--bg-secondary)",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontWeight: 500,
                        color: r.name ? "var(--text-primary)" : "var(--danger)",
                      }}
                    >
                      {r.name || "⚠ missing"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: r.price
                          ? "var(--text-primary)"
                          : "var(--danger)",
                      }}
                    >
                      ₹{r.price || "⚠"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {r.mrp ? `₹${r.mrp}` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>{r.quantity || "0"}</td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {r.category || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        color: "var(--text-muted)",
                        fontSize: 11,
                      }}
                    >
                      {r.barcode || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {r.expiryDate || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={reset}
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center" }}
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2, justifyContent: "center" }}
            >
              {loading ? (
                <Spinner size={13} color="#f5f0e8" />
              ) : (
                <Upload size={13} />
              )}{" "}
              Import {rows.length} Products
            </button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
            padding: "10px 0",
          }}
        >
          <CheckCircle2 size={52} style={{ color: "var(--success)" }} />
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Import Complete!
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              width: "100%",
            }}
          >
            {[
              {
                label: "Created",
                value: result.created,
                color: "var(--success)",
                bg: "var(--success-light)",
              },
              {
                label: "Updated",
                value: result.updated,
                color: "var(--accent-dark)",
                bg: "rgba(193,127,58,0.08)",
              },
              {
                label: "Failed",
                value: result.failed,
                color: "var(--danger)",
                bg: "var(--danger-light)",
              },
            ].map(({ label, value, color, bg }) => (
              <div
                key={label}
                style={{
                  background: bg,
                  borderRadius: 10,
                  padding: "14px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 26, fontWeight: 800, color }}>{value}</p>
                <p style={{ fontSize: 12, color, marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div
              style={{
                width: "100%",
                background: "var(--danger-light)",
                borderRadius: 10,
                padding: "12px 14px",
                maxHeight: 140,
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--danger)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <AlertCircle size={13} /> Errors
              </p>
              {result.errors.map((e, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                    marginBottom: 3,
                  }}
                >
                  {e}
                </p>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="btn-primary"
            style={{ alignSelf: "stretch", justifyContent: "center" }}
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
function ReportModal({ isOpen, onClose, onDownload }) {
  const [type, setType] = useState("thisMonth");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const options = [
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
    { key: "custom", label: "Custom" },
  ];

  const handleDownload = async () => {
    if (type === "custom") {
      if (!startDate || !endDate) {
        toast.error("Select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("Start date must be before end date");
        return;
      }
    }
    setLoading(true);
    try {
      await onDownload({ type, startDate, endDate });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Download Stock Report"
      maxWidth={500}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Report Period">
          <div style={{ display: "flex", gap: 8 }}>
            {options.map((o) => (
              <button
                key={o.key}
                onClick={() => setType(o.key)}
                className={type === o.key ? "btn-primary" : "btn-ghost"}
                style={{ flex: 1, justifyContent: "center", fontSize: 13 }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </FormField>

        {type === "custom" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <FormField label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </FormField>
            <FormField label="End Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </FormField>
          </div>
        )}

        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Generates a PDF with opening stock, quantity sold, and current stock
          for the selected period.
        </p>

        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleDownload}
            disabled={loading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? (
              <Spinner size={13} color="#f5f0e8" />
            ) : (
              <Download size={14} />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default function Stock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [printSelections, setPrintSelections] = useState({}); // { productId: copies }

  const load = useCallback(
    async (q = search, p = page) => {
      setLoading(true);
      try {
        const res = await productAPI.getAll({ search: q, page: p, limit: 20 });
        setProducts(res.data.data.products);
        setTotal(res.data.data.total);
        setPages(res.data.data.pages);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [search, page],
  );

  useEffect(() => {
    load();
  }, []);

  const debouncedLoad = useCallback(
    debounce((q) => {
      setPage(1);
      load(q, 1);
    }, 380),
    [],
  );
  const handleSearch = (q) => {
    setSearch(q);
    debouncedLoad(q);
  };

  const printLabel = (p, copies = 1) => {
    const uid = () => Math.random().toString(36).slice(2);
    const labelCard = (name, barcode, mrp, price) => `
      <div class="label-card">
        <div class="product-name">${name}</div>
        <svg id="bc-${uid()}" data-barcode="${barcode || name}" class="barcode-svg"></svg>
        <div class="price-row">
          ${mrp && parseFloat(mrp) > 0 ? `<span style="font-weight:800;font-size:13px;color:#888;">MRP <span class="mrp">&#8377;${parseFloat(mrp).toFixed(0)}</span></span>` : `<span></span>`}
          <span class="price">&#8377;${parseFloat(price).toFixed(0)}</span>
        </div>
      </div>`;
    const allLabels = Array.from({ length: copies }, () =>
      labelCard(p.name, p.barcode, p.mrp, p.price),
    ).join("");
    const win = window.open("", "_blank");
    win.document
      .write(`<!DOCTYPE html><html><head><title>Labels - ${p.name}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Helvetica,Arial,sans-serif;background:#fff;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;padding:8mm;}
        .label-card{border:1px solid #ccc;border-radius:4px;padding:6px 8px;display:flex;flex-direction:column;align-items:stretch;gap:2px;break-inside:avoid;width:100%;box-sizing:border-box;}
        .store-name{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;}
        .product-name{font-size:9px;font-weight:600;text-align:center;word-break:break-word;}
        .barcode-svg{width:100%;height:auto;max-height:45px;}
        .price-row{display:flex;justify-content:space-between;align-items:center;width:100%;}
        .mrp{font-weight:800;font-size:13px;color:#888;position:relative;display:inline-block;}
        .mrp::after{content:"";position:absolute;top:50%;left:-5%;width:110%;border-top:1.5px solid #000;transform:rotate(-20deg);transform-origin:center;}
        .price{font-weight:800;font-size:13px;color:#bf9c5a;}
        @media print{body{margin:0;}}
      </style>
    </head><body>
      <div class="grid">${allLabels}</div>
      <script>
        window.onload = function() {
          document.querySelectorAll('.barcode-svg').forEach(function(el) {
            try { JsBarcode(el, el.getAttribute('data-barcode'), {format:"CODE128",width:1.2,height:36,displayValue:true,fontSize:9,textMargin:2,margin:2}); } catch(e){}
          });
          setTimeout(function(){ window.print(); }, 600);
        };
      <\/script>
    </body></html>`);
    win.document.close();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productAPI.delete(deleteTarget.id);
      toast.success("Product removed");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const btnStyle = {
    width: 30,
    height: 30,
    borderRadius: 7,
    background: "none",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--text-muted)",
    transition: "all 0.12s ease",
  };
  const downloadReport = async ({ type, startDate, endDate }) => {
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    let from, to;
    const today = new Date();

    if (type === "thisMonth") {
      from = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      to = fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    } else if (type === "lastMonth") {
      from = fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      to = fmt(new Date(today.getFullYear(), today.getMonth(), 0));
    } else {
      from = startDate;
      to = endDate;
    }

    try {
      const res = await reportAPI.getStockReport({
        startDate: from,
        endDate: to,
      });

      const report = res.data.data;

      const doc = new jsPDF("landscape");

      doc.setFontSize(18);
      doc.text("KK Shoes & Bags", 14, 18);

      doc.setFontSize(13);
      doc.text("Monthly Stock Report", 14, 28);

      doc.setFontSize(10);
      doc.text(`Period : ${from} to ${to}`, 14, 36);

      autoTable(doc, {
        startY: 44,
        head: [
          [
            "Product",
            "Barcode",
            "Category",
            "Opening",
            "Sold",
            "Current",
            "Price",
          ],
        ],
        body: report.map((p) => [
          p.name,
          p.barcode || "-",
          p.category || "-",
          p.openingStock,
          p.soldQty,
          p.currentStock,
          `Rs. ${Number(p.price).toFixed(2)}`,
        ]),
        styles: {
          fontSize: 8,
        },
        headStyles: {
          fillColor: [40, 40, 40],
        },
      });

      doc.save(`Stock_Report_${from}_to_${to}.pdf`);

      setShowReportModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate stock report");
    }
  };
  const handleMultiPrint = () => {
    const selected = Object.entries(printSelections)
      .filter(([_, copies]) => parseInt(copies) > 0)
      .map(([productId, copies]) => {
        const p = products.find((p) => String(p.id) === String(productId));
        if (!p) return null;
        return {
          name: p.name,
          barcode: p.barcode,
          mrp: p.mrp,
          price: p.price,
          copies: parseInt(copies),
        };
      })
      .filter(Boolean);
    if (!selected.length) {
      toast.error("Select at least one product with copies");
      return;
    }

    const labelCard = (name, barcode, mrp, price) => `
      <div class="label-card">
        <div class="product-name">${name}</div>
        <svg data-barcode="${barcode || name}" class="barcode-svg"></svg>
        <div class="price-row">
          ${mrp && parseFloat(mrp) > 0 ? `<span style="font-weight:800;font-size:13px;color:#888;">MRP <span class="mrp">&#8377;${parseFloat(mrp).toFixed(0)}</span></span>` : `<span></span>`}
          <span class="price">&#8377;${parseFloat(price).toFixed(0)}</span>
        </div>
      </div>`;

    const allLabels = selected
      .flatMap(({ name, barcode, mrp, price, copies }) =>
        Array.from({ length: copies }, () =>
          labelCard(name, barcode, mrp, price),
        ),
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Labels</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Helvetica,Arial,sans-serif;background:#fff;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;padding:8mm;}
        .label-card{border:1px solid #ccc;border-radius:4px;padding:6px 8px;display:flex;flex-direction:column;align-items:stretch;gap:2px;break-inside:avoid;width:100%;box-sizing:border-box;}
        .product-name{font-size:9px;font-weight:600;text-align:center;word-break:break-word;}
        .barcode-svg{width:100%;height:auto;max-height:45px;}
        .price-row{display:flex;justify-content:space-between;align-items:center;width:100%;}
        .mrp{font-weight:800;font-size:13px;color:#888;position:relative;display:inline-block;}
        .mrp::after{content:"";position:absolute;top:50%;left:-5%;width:110%;border-top:1.5px solid #000;transform:rotate(-20deg);transform-origin:center;}
        .price{font-weight:800;font-size:13px;color:#bf9c5a;}
        @media print{body{margin:0;}}
      </style>
    </head><body>
      <div class="grid">${allLabels}</div>
      <script>
        window.onload = function() {
          document.querySelectorAll('.barcode-svg').forEach(function(el) {
            try { JsBarcode(el, el.getAttribute('data-barcode'), {format:"CODE128",width:1.2,height:36,displayValue:true,fontSize:9,textMargin:2,margin:2}); } catch(e){}
          });
          setTimeout(function(){ window.print(); }, 600);
        };
      <\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1280 }} className="fade-in">
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onDownload={downloadReport}
      />
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImported={load}
      />
      <SectionHeader
        title="Stock"
        subtitle={`${total} products`}
        actions={
          <>
            {printMode ? (
              <>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {
                    Object.values(printSelections).filter(
                      (v) => parseInt(v) > 0,
                    ).length
                  }{" "}
                  selected
                </span>
                <button
                  onClick={() => {
                    setPrintMode(false);
                    setPrintSelections({});
                  }}
                  className="btn-ghost"
                  style={{ gap: 7 }}
                >
                  <X size={13} /> Cancel
                </button>
                <button
                  onClick={handleMultiPrint}
                  className="btn-primary"
                  style={{ gap: 7 }}
                >
                  <Printer size={13} /> Print Labels
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setScanModal(true)}
                  className="btn-ghost"
                >
                  <Scan size={14} /> Scan
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="btn-ghost"
                  style={{ gap: 7 }}
                >
                  <Upload size={13} /> Import Sheet
                </button>
                <button
                  onClick={() => setPrintMode(true)}
                  className="btn-ghost"
                  style={{ gap: 7 }}
                >
                  <Printer size={13} /> Print Labels
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(true);
                  }}
                  className="btn-ghost"
                  style={{ gap: 7 }}
                >
                  <Download size={13} /> Download Report
                </button>
                <button
                  onClick={() => {
                    setEditProduct(null);
                    setProductModal(true);
                  }}
                  className="btn-primary"
                >
                  <Plus size={14} /> Add Product
                </button>
              </>
            )}
          </>
        }
      />

      <SearchInput
        value={search}
        onChange={handleSearch}
        placeholder="Search by name, barcode or category…"
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 48 }}
          >
            <Spinner size={22} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Add your first product to get started"
          />
        ) : (
          <>
            <div className="table-scroll-wrapper" style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13.5,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {printMode && (
                      <th style={{ padding: "11px 18px", width: 100 }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          COPIES
                        </span>
                      </th>
                    )}
                    {[
                      "Product",
                      "Barcode",
                      "Category",
                      "Net Qty",
                      "MRP",
                      "Price",
                      "Stock",
                      "Expiry",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign:
                            h === "Price" || h === "Stock" || h === "MRP"
                              ? "right"
                              : h === "Status" || h === "" || h === "Net Qty"
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
                  {products.map((p, i) => {
                    const badge = stockBadge(p.quantity);
                    return (
                      <tr
                        key={p.id}
                        className="table-row-hover"
                        style={{
                          borderBottom:
                            i < products.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                          transition: "background 0.12s ease",
                          background:
                            printMode && printSelections[p.id] > 0
                              ? "rgba(193,127,58,0.05)"
                              : undefined,
                        }}
                      >
                        {printMode && (
                          <td
                            style={{
                              padding: "13px 18px",
                              textAlign: "center",
                              width: 100,
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              placeholder="copies"
                              value={printSelections[p.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPrintSelections((prev) => ({
                                  ...prev,
                                  [p.id]: val,
                                }));
                              }}
                              style={{
                                width: 64,
                                padding: "4px 6px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                fontSize: 12,
                                textAlign: "center",
                                background: "var(--bg-primary)",
                                color: "var(--text-primary)",
                              }}
                            />
                          </td>
                        )}
                        <td style={{ padding: "13px 18px" }}>
                          <p
                            style={{
                              fontWeight: 500,
                              color: "var(--text-primary)",
                            }}
                          >
                            {p.name}
                          </p>
                          {p.serialNumber && (
                            <p
                              style={{
                                fontSize: 11.5,
                                color: "var(--text-muted)",
                                fontFamily: "JetBrains Mono, monospace",
                                marginTop: 1,
                              }}
                            >
                              {p.serialNumber}
                            </p>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            color: "var(--text-muted)",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12.5,
                          }}
                        >
                          {p.barcode || "—"}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {p.category || "—"}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            textAlign: "center",
                            color: "var(--text-muted)",
                            fontSize: 12.5,
                          }}
                        >
                          {p.description &&
                          p.description.startsWith("Net Qty:") ? (
                            <span
                              style={{
                                background: "var(--bg-secondary)",
                                padding: "2px 8px",
                                borderRadius: 5,
                                fontSize: 11.5,
                                fontWeight: 500,
                              }}
                            >
                              {p.description.replace("Net Qty:", "").trim()}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            textAlign: "right",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12.5,
                          }}
                        >
                          {p.mrp && parseFloat(p.mrp) > 0 ? (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: 12,
                              }}
                            >
                              <span style={{ textDecoration: "line-through" }}>
                                ₹{parseFloat(p.mrp).toFixed(2)}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {formatCurrency(p.price)}
                        </td>
                        <td
                          style={{
                            padding: "13px 18px",
                            textAlign: "right",
                            fontFamily: "JetBrains Mono, monospace",
                            color:
                              p.quantity < 10
                                ? "var(--accent)"
                                : "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {p.quantity}
                        </td>
                        <td
                          style={{ padding: "13px 18px", textAlign: "center" }}
                        >
                          {(() => {
                            const exp = expiryStatus(p.expiryDate);
                            if (!exp)
                              return (
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: 12,
                                  }}
                                >
                                  —
                                </span>
                              );
                            return (
                              <span
                                className="badge"
                                style={{
                                  background: exp.bg,
                                  color: exp.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {exp.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td
                          style={{ padding: "13px 18px", textAlign: "center" }}
                        >
                          <span
                            className="badge"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        {!printMode && (
                          <td
                            style={{
                              padding: "13px 18px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                justifyContent: "center",
                              }}
                            >
                              <button
                                onClick={() => {
                                  setEditProduct(p);
                                  setProductModal(true);
                                }}
                                style={btnStyle}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "var(--bg-sunken)";
                                  e.currentTarget.style.color =
                                    "var(--text-primary)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                  e.currentTarget.style.color =
                                    "var(--text-muted)";
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(p)}
                                style={btnStyle}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    "var(--danger-light)";
                                  e.currentTarget.style.color = "var(--danger)";
                                  e.currentTarget.style.borderColor =
                                    "rgba(184,64,64,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                  e.currentTarget.style.color =
                                    "var(--text-muted)";
                                  e.currentTarget.style.borderColor =
                                    "var(--border)";
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
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
                    onClick={() => {
                      setPage(page - 1);
                      load(search, page - 1);
                    }}
                    disabled={page === 1}
                    className="btn-ghost"
                    style={{ padding: "6px 10px" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setPage(page + 1);
                      load(search, page + 1);
                    }}
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

      <ProductModal
        isOpen={productModal}
        onClose={() => setProductModal(false)}
        product={editProduct}
        onSaved={load}
      />
      <ScanModal
        isOpen={scanModal}
        onClose={() => setScanModal(false)}
        onScanned={load}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Product"
        message={`Remove "${deleteTarget?.name}" from inventory? Historical bill records are preserved.`}
        loading={deleting}
      />
    </div>
  );
}
