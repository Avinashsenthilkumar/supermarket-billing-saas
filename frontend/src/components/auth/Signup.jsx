// src/components/auth/Signup.jsx — new business signup (gets its own private database)
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { getErrorMessage } from "../../utils/helpers";
import toast from "react-hot-toast";
import { Eye, EyeOff, Check } from "lucide-react";
import { Spinner } from "../shared/UI";

const BUSINESS_TYPES = [
  ["supermarket", "Supermarket"],
  ["grocery", "Grocery / Kirana"],
  ["departmental", "Departmental store"],
  ["pharmacy", "Pharmacy"],
  ["bakery", "Bakery / Sweets"],
  ["other", "Other retail"],
];

export default function Signup() {
  const [form, setForm] = useState({ shopName: "", businessType: "supermarket", username: "", email: "", phone: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { platform } = useSettings();
  const navigate = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.email.trim() || !form.password) return toast.error("Business name, email and password are required");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      await register({ ...payload, email: payload.email.trim() });
      toast.success("Welcome! Your store is ready.");
      navigate("/settings", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const input = (label, key, type = "text", placeholder = "", extra = {}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
      <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} className="input-field" placeholder={placeholder} style={{ borderRadius: 11, padding: "11px 13px" }} {...extra} />
    </div>
  );

  if (platform.allowSignup === false) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
        <div className="card" style={{ padding: 32, maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Signups are closed</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Contact {platform.supportPhone || platform.supportEmail || "the administrator"} to get an account.
          </p>
          <Link to="/login" className="btn-primary" style={{ marginTop: 18, textDecoration: "none" }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          background: "var(--bg-card)",
          borderRadius: 28,
          boxShadow: "0 30px 80px rgba(60,48,25,0.14)",
          display: "flex",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="hidden lg:flex"
          style={{
            width: "40%",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 40,
            background: "linear-gradient(160deg, var(--accent-light) 0%, var(--bg-sunken) 100%)",
          }}
        >
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: 20, color: "var(--text-primary)" }}>{platform.platformName || "SuperMart POS"}</p>
          <div>
            <h2 style={{ fontSize: 30, color: "var(--text-primary)", marginBottom: 18 }}>Everything your store runs on, in one place.</h2>
            {["Fast barcode billing with GST", "Stock, purchases & supplier dues", "Customer credit & loyalty points", "Your data in its own private database"].map((t) => (
              <p key={t} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "var(--text-secondary)", marginBottom: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Check size={12} color="var(--accent-contrast)" />
                </span>
                {t}
              </p>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{platform.trialDays || 14}-day free trial · No card required</p>
        </div>

        <div style={{ flex: 1, padding: "40px 44px" }}>
          <div className="fade-in" style={{ maxWidth: 460, margin: "0 auto" }}>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 500, color: "var(--text-primary)" }}>Create your store</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6, marginBottom: 26 }}>Takes less than a minute.</p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {input("Business name", "shopName", "text", "e.g. Sri Krishna Supermarket", { autoFocus: true })}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>Business type</label>
                <select value={form.businessType} onChange={(e) => set("businessType", e.target.value)} className="input-field" style={{ borderRadius: 11, padding: "11px 13px" }}>
                  {BUSINESS_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {input("Your name", "username", "text", "Owner name")}
                {input("Phone", "phone", "tel", "+91 …")}
              </div>
              {input("Email (login)", "email", "email", "you@store.com", { autoComplete: "email" })}
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      className="input-field"
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      style={{ borderRadius: 11, padding: "11px 40px 11px 13px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label="Show password"
                      style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {input("Confirm password", "confirm", showPass ? "text" : "password", "Repeat password", { autoComplete: "new-password" })}
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "13px 18px", marginTop: 6, fontSize: 14.5, borderRadius: 12 }}>
                {loading ? <Spinner size={14} color="var(--bg)" /> : null}
                {loading ? "Setting up your store…" : "Create store"}
              </button>
            </form>
            <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "var(--accent-dark)", fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
