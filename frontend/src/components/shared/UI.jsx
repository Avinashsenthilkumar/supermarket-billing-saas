// src/components/shared/UI.jsx
import React from "react";
import ReactDOM from "react-dom";
import { Loader2, Search } from "lucide-react";

export const Spinner = ({ size = 18, color = "var(--accent)" }) => (
  <Loader2
    size={size}
    style={{ color, animation: "spin 0.8s linear infinite" }}
  />
);

export const PageLoader = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: 240,
      gap: 12,
    }}
  >
    <Spinner size={24} />
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "56px 24px",
      textAlign: "center",
      gap: 10,
    }}
  >
    {Icon && (
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--bg-sunken)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Icon size={22} style={{ color: "var(--text-muted)" }} />
      </div>
    )}
    <p
      style={{
        fontFamily: "'Fraunces','Playfair Display',serif",
        fontSize: 17,
        color: "var(--text-primary)",
        fontWeight: 400,
      }}
    >
      {title}
    </p>
    {description && (
      <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 280 }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 480 }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "rgba(26,23,20,0.55)",
        backdropFilter: "blur(6px)",
        animation: "fadeIn 0.15s ease",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card fade-in"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              fontFamily: "'Fraunces','Playfair Display',serif",
              fontSize: 18,
              fontWeight: 400,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export const Badge = ({ children, style = {} }) => (
  <span className="badge" style={style}>
    {children}
  </span>
);

export const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accentColor = "#bf9c5a",
}) => (
  <div className="stat-card fade-in">
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${accentColor}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={17} style={{ color: accentColor }} />
      </div>
    </div>
    <p
      style={{
        fontFamily: "'Fraunces','Playfair Display',serif",
        fontSize: 26,
        fontWeight: 300,
        color: "var(--text-primary)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {value}
    </p>
    <p
      style={{
        fontSize: 12.5,
        color: "var(--text-secondary)",
        marginTop: 5,
        fontWeight: 500,
      }}
    >
      {label}
    </p>
    {sub && (
      <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
        {sub}
      </p>
    )}
  </div>
);

export const FormField = ({ label, error, required, children, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && (
      <label
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--text-secondary)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--accent)", marginLeft: 3 }}>*</span>
        )}
      </label>
    )}
    {children}
    {hint && (
      <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{hint}</p>
    )}
    {error && <p style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</p>}
  </div>
);

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={380}>
    <p
      style={{
        fontSize: 13.5,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        marginBottom: 20,
      }}
    >
      {message}
    </p>
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button onClick={onClose} className="btn-ghost">
        Cancel
      </button>
      <button onClick={onConfirm} disabled={loading} className="btn-danger">
        {loading ? <Spinner size={13} color="var(--danger)" /> : null}Confirm
      </button>
    </div>
  </Modal>
);

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search…",
  style = {},
}) => (
  <div style={{ position: "relative", ...style }}>
    <Search
      size={14}
      style={{
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)",
        pointerEvents: "none",
      }}
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-field"
      style={{ paddingLeft: 36 }}
    />
  </div>
);

export const SectionHeader = ({ title, subtitle, actions }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingBottom: 20,
      borderBottom: "1px solid var(--border)",
      marginBottom: 24,
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
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {actions}
      </div>
    )}
  </div>
);
