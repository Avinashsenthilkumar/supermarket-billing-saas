// src/components/auth/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/helpers";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "../shared/UI";

export default function Signup() {
  const [form, setForm] = useState({
    shopName: "",
    username: "",
    email: "",
    password: "",
    phone: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shopName || !form.email || !form.password)
      return toast.error("Shop name, email and password are required");
    if (form.password.length < 6)
      return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await register(form);
      toast.success("Welcome! Your shop is ready.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input-field"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
      }}
    >
      <div className="fade-in" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "'Fraunces','Playfair Display',serif",
              fontSize: 28,
              fontWeight: 300,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 6,
            }}
          >
            Create your shop
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
            Start your 14-day free trial — no card required
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {field("Shop name", "shopName", "text", "e.g. Sri Krishna Stores")}
          {field("Your name", "username", "text", "owner")}
          {field("Email address", "email", "email", "you@example.com")}
          {field("Phone (optional)", "phone", "text", "+91 …")}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                placeholder="••••••••"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  padding: 2,
                }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "11px 18px",
              marginTop: 4,
              fontSize: 14,
            }}
          >
            {loading ? <Spinner size={14} color="#f5f0e8" /> : null}
            {loading ? "Creating…" : "Create shop"}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent, #bf9c5a)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
