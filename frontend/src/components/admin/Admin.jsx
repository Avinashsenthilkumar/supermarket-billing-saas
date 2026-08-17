// src/components/admin/Admin.jsx — super-admin: manage all shops
import React, { useEffect, useState } from "react";
import { adminAPI } from "../../services/api";
import { getErrorMessage } from "../../utils/helpers";
import toast from "react-hot-toast";
import { Spinner } from "../shared/UI";
import { Store, Users, Package, Receipt, Plus, X, Eye, EyeOff } from "lucide-react";

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

function Stat({ icon: Icon, label, value }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <div
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: "var(--accent-light)", color: "var(--accent-dark)",
          display: "grid", placeItems: "center",
        }}
      >
        <Icon size={17} />
      </div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, marginTop: 14, color: "var(--text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ shopName: "", ownerEmail: "", username: "", password: "", phone: "" });

  const load = async () => {
    try {
      const [s, sh] = await Promise.all([adminAPI.getStats(), adminAPI.getShops()]);
      setStats(s.data.data);
      setShops(sh.data.data.shops);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.shopName || !form.ownerEmail || !form.password)
      return toast.error("Shop name, owner email and password are required");
    setSaving(true);
    try {
      await adminAPI.createShop(form);
      toast.success("Shop created");
      setShowCreate(false);
      setForm({ shopName: "", ownerEmail: "", username: "", password: "", phone: "" });
      setLoading(true);
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id) => {
    try {
      const r = await adminAPI.toggleShop(id);
      toast.success(r.data.message);
      setShops((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: r.data.data.isActive } : s)));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading)
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <Spinner size={22} />
      </div>
    );

  const field = (label, key, type = "text", ph = "") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input-field"
        placeholder={ph}
        style={{ borderRadius: 10, padding: "10px 13px" }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 27, color: "var(--text-primary)" }}>Admin</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Manage every shop on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: "var(--espresso)", color: "#f5efe2",
            fontWeight: 600, fontSize: 13.5, cursor: "pointer",
          }}
        >
          <Plus size={16} /> Create shop
        </button>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "18px 0 22px" }} />

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <Stat icon={Store} label="Total shops" value={stats?.totalShops ?? 0} />
        <Stat icon={Users} label="Total users" value={stats?.totalUsers ?? 0} />
        <Stat icon={Package} label="Total products" value={stats?.totalProducts ?? 0} />
        <Stat icon={Receipt} label="Total bills" value={stats?.totalBills ?? 0} />
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ ...card, padding: "12px 18px", fontSize: 13, color: "var(--text-secondary)" }}>
          Active: <b style={{ color: "var(--success)" }}>{stats?.activeShops ?? 0}</b>
        </div>
        <div style={{ ...card, padding: "12px 18px", fontSize: 13, color: "var(--text-secondary)" }}>
          Inactive: <b style={{ color: "var(--danger)" }}>{stats?.inactiveShops ?? 0}</b>
        </div>
        <div style={{ ...card, padding: "12px 18px", fontSize: 13, color: "var(--text-secondary)" }}>
          Platform revenue: <b style={{ color: "var(--text-primary)" }}>₹{(stats?.totalRevenue ?? 0).toFixed(2)}</b>
        </div>
      </div>

      {/* shops table */}
      <div style={{ ...card, marginTop: 22, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
          All shops ({shops.length})
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 11.5 }}>
                <th style={{ padding: "12px 18px", fontWeight: 600 }}>Shop</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Owner email</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Plan</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Users</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Products</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Bills</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "12px 18px", fontWeight: 600, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 18px", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                  <td style={{ padding: "12px 12px", color: "var(--text-secondary)" }}>{s.ownerEmail}</td>
                  <td style={{ padding: "12px 12px", textTransform: "capitalize", color: "var(--text-secondary)" }}>{s.plan}</td>
                  <td style={{ padding: "12px 12px", color: "var(--text-secondary)" }}>{s.users}</td>
                  <td style={{ padding: "12px 12px", color: "var(--text-secondary)" }}>{s.products}</td>
                  <td style={{ padding: "12px 12px", color: "var(--text-secondary)" }}>{s.bills}</td>
                  <td style={{ padding: "12px 12px" }}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                        background: s.isActive ? "var(--success-light)" : "var(--danger-light)",
                        color: s.isActive ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 18px", textAlign: "right" }}>
                    {s.id !== 1 && (
                      <button
                        onClick={() => toggle(s.id)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8,
                          border: "1px solid var(--border-strong)", background: "var(--bg-card)",
                          color: "var(--text-secondary)", cursor: "pointer",
                        }}
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* create modal */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(36,31,22,0.5)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}
          onClick={() => setShowCreate(false)}
        >
          <div style={{ ...card, width: "100%", maxWidth: 420, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 20, color: "var(--text-primary)" }}>Create a shop</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {field("Shop name", "shopName", "text", "e.g. Krish Mart")}
              {field("Owner email", "ownerEmail", "email", "owner@shop.com")}
              {field("Owner name", "username", "text", "owner")}
              {field("Phone (optional)", "phone", "text", "+91 …")}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field"
                    placeholder="••••••••"
                    style={{ borderRadius: 10, padding: "10px 40px 10px 13px", width: "100%" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{ marginTop: 4, padding: "12px", borderRadius: 10, border: "none", background: "var(--espresso)", color: "#f5efe2", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
              >
                {saving ? <Spinner size={14} color="#f5efe2" /> : null}
                {saving ? "Creating…" : "Create shop"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
