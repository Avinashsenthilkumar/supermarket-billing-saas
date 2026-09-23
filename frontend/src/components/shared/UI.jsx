// src/components/shared/UI.jsx
import React from "react";
import ReactDOM from "react-dom";
import { Loader2, Search } from "lucide-react";

export const Spinner = ({ size = 18, color = "var(--accent)", style = {} }) => (
  <Loader2
    size={size}
    style={{ color, animation: "spin 0.8s linear infinite", flexShrink: 0, ...style }}
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
        background: "var(--overlay)",
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
  accentColor = "var(--accent)",
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
          background: accentColor.startsWith("#") ? `${accentColor}15` : "var(--bg-sunken)",
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
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} className="stock-header-actions">
        {actions}
      </div>
    )}
  </div>
);

// ── Additional building blocks ───────────────────────────────────────────────
export const Page = ({ children, maxWidth = 1280 }) => (
  <div style={{ padding: "28px 36px", maxWidth }} className="fade-in page-content">
    {children}
  </div>
);

export const Tabs = ({ tabs, value, onChange, style = {} }) => (
  <div
    role="tablist"
    style={{
      display: "flex",
      gap: 4,
      padding: 4,
      background: "var(--bg-sunken)",
      border: "1px solid var(--border)",
      borderRadius: 11,
      overflowX: "auto",
      marginBottom: 20,
      ...style,
    }}
  >
    {tabs.map((t) => {
      const active = t.value === value;
      const Icon = t.icon;
      return (
        <button
          key={t.value}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(t.value)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            background: active ? "var(--bg-card)" : "transparent",
            color: active ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow: active ? "var(--shadow)" : "none",
          }}
        >
          {Icon && <Icon size={14} style={{ color: active ? "var(--accent)" : "inherit" }} />}
          {t.label}
        </button>
      );
    })}
  </div>
);

export const Pagination = ({ page, pages, onChange }) =>
  pages > 1 ? (
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
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="btn-ghost" style={{ padding: "6px 12px" }}>
          ‹ Prev
        </button>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="btn-ghost" style={{ padding: "6px 12px" }}>
          Next ›
        </button>
      </div>
    </div>
  ) : null;

const TONES = {
  success: ["var(--success-light)", "var(--success)"],
  danger: ["var(--danger-light)", "var(--danger)"],
  warning: ["rgba(var(--accent-rgb),0.12)", "var(--accent-dark)"],
  info: ["var(--info-light)", "var(--info)"],
  neutral: ["var(--bg-sunken)", "var(--text-secondary)"],
};
export const Pill = ({ tone = "neutral", children, style = {} }) => (
  <span className="badge" style={{ background: TONES[tone][0], color: TONES[tone][1], whiteSpace: "nowrap", ...style }}>
    {children}
  </span>
);

export const Th = ({ children, align = "left", style = {} }) => (
  <th
    style={{
      textAlign: align,
      padding: "11px 16px",
      color: "var(--text-muted)",
      fontWeight: 500,
      fontSize: 11.5,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      borderBottom: "1px solid var(--border)",
      ...style,
    }}
  >
    {children}
  </th>
);

export const Td = ({ children, align = "left", mono = false, muted = false, style = {}, ...rest }) => (
  <td
    style={{
      textAlign: align,
      padding: "12px 16px",
      color: muted ? "var(--text-muted)" : "var(--text-primary)",
      fontFamily: mono ? "JetBrains Mono, monospace" : undefined,
      fontSize: mono ? 12.5 : 13.5,
      borderBottom: "1px solid var(--border)",
      verticalAlign: "middle",
      ...style,
    }}
    {...rest}
  >
    {children}
  </td>
);

export const Table = ({ children, minWidth = 640 }) => (
  <div className="table-scroll-wrapper" style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", minWidth }}>{children}</table>
  </div>
);

export const Field = ({ label, children, hint, required, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
    <FormField label={label} hint={hint} required={required}>
      {children}
    </FormField>
  </div>
);

export const Grid = ({ cols = 2, gap = 12, children, style = {} }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, ...style }} className="form-grid">
    {children}
  </div>
);

export const Toggle = ({ checked, onChange, label, description }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "6px 0" }}>
    <span
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{
        flexShrink: 0,
        width: 38,
        height: 22,
        borderRadius: 99,
        background: checked ? "var(--accent)" : "var(--border-strong)",
        position: "relative",
        transition: "background 0.15s",
        marginTop: 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </span>
    <span>
      <span style={{ display: "block", fontSize: 13.5, color: "var(--text-primary)", fontWeight: 500 }}>{label}</span>
      {description && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{description}</span>}
    </span>
  </label>
);

export const MiniStat = ({ label, value, tone }) => (
  <div className="card" style={{ padding: "14px 16px" }}>
    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</p>
    <p
      className="tabular"
      style={{
        fontSize: 19,
        fontWeight: 600,
        marginTop: 3,
        color: tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : tone === "accent" ? "var(--accent-dark)" : "var(--text-primary)",
      }}
    >
      {value}
    </p>
  </div>
);
