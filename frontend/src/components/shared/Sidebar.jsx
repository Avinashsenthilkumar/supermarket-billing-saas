// src/components/shared/Sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Package,
  FileText,
  LogOut,
  ShoppingCart,
  TrendingUp,
  Users,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  Shield,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/billing", icon: ShoppingCart, label: "Billing" },
  { to: "/stock", icon: Package, label: "Stock" },
  { to: "/barcode", icon: ScanLine, label: "Barcodes" },
  { to: "/transactions", icon: FileText, label: "History" },
  { to: "/reports", icon: TrendingUp, label: "Reports" },

  { to: "/customers", icon: Users, label: "Customers" },
];

const S = {
  sidebar: {
    background: "#241f16",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  logo: (col) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: col ? "22px 12px" : "22px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    justifyContent: col ? "center" : "flex-start",
  }),
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "#bf9c5a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    padding: "14px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 1,
    overflowY: "auto",
  },
  navLink: (active, col) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: col ? "10px 14px" : "10px 14px",
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: active ? 500 : 400,
    color: active ? "#f5f0e8" : "rgba(255,255,255,0.38)",
    background: active ? "rgba(193,127,58,0.12)" : "transparent",
    textDecoration: "none",
    transition: "all 0.15s ease",
    justifyContent: col ? "center" : "flex-start",
    position: "relative",
  }),
  footer: {
    padding: "10px 8px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "rgba(193,127,58,0.18)",
    border: "1px solid rgba(193,127,58,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        ...S.navLink(isActive, collapsed),
        ...(hovered && !S.navLink(false).color
          ? {
              color: "rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.05)",
            }
          : {}),
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 3,
                height: 16,
                background: "#bf9c5a",
                borderRadius: "0 2px 2px 0",
              }}
            />
          )}
          <Icon
            size={15}
            style={{ flexShrink: 0, color: isActive ? "#bf9c5a" : "inherit" }}
          />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}

function SidebarBody({ collapsed, onClose }) {
  const { user, shop, logout, isSuperAdmin } = useAuth();
  const shopName = shop?.name || "My Shop";
  const shopTagline = "Point of Sale";
  const navigate = useNavigate();
  const [logoutHover, setLogoutHover] = useState(false);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <div style={S.sidebar}>
      <div style={S.logo(collapsed)}>
        <div style={S.logoIcon}>
          <ShoppingCart size={14} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <p
              style={{
                fontFamily: "'Fraunces','Playfair Display',serif",
                fontWeight: 400,
                fontSize: 16,
                color: "#f5f0e8",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {shopName}
            </p>
            <p
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.28)",
                marginTop: 3,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {shopTagline}
            </p>
          </div>
        )}
      </div>

      <nav style={S.nav}>
        {NAV.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={collapsed}
            onClick={onClose}
          />
        ))}
        {isSuperAdmin && (
          <NavItem
            to="/admin"
            icon={Shield}
            label="Admin"
            collapsed={collapsed}
            onClick={onClose}
          />
        )}
      </nav>

      <div style={S.footer}>
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              marginBottom: 4,
            }}
          >
            <div style={S.avatar}>
              <span
                style={{ color: "#bf9c5a", fontSize: 10.5, fontWeight: 600 }}
              >
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  color: "#f5f0e8",
                  fontSize: 12.5,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.username}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 14px",
            borderRadius: 8,
            background: logoutHover ? "rgba(220,80,80,0.1)" : "transparent",
            border: "none",
            color: logoutHover ? "#f87171" : "rgba(255,255,255,0.3)",
            cursor: "pointer",
            fontSize: 13.5,
            transition: "all 0.15s ease",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
        >
          <LogOut size={14} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden"
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 50,
          padding: 8,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}
      >
        <Menu size={17} />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,22,15,0.55)",
              backdropFilter: "blur(5px)",
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 210,
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                zIndex: 1,
                color: "rgba(255,255,255,0.4)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={17} />
            </button>
            <SidebarBody
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <aside
        className="hidden md:block"
        style={{
          width: collapsed ? 58 : 205,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          transition: "width 0.24s ease",
        }}
      >
        <SidebarBody collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: "absolute",
            right: -10,
            top: 68,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-muted)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            transition: "all 0.15s ease",
          }}
        >
          {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
        </button>
      </aside>
    </>
  );
}
