// src/components/shared/Layout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { AlertTriangle, ArrowLeft } from "lucide-react";

function Banner() {
  const { shop, subscriptionExpired, isSuperAdmin, isImpersonating, returnToAdmin } = useAuth();
  const { platform } = useSettings();
  const bar = (tone, content) => (
    <div
      className="no-print"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 20px",
        fontSize: 13,
        background: tone === "danger" ? "var(--danger-light)" : "rgba(var(--accent-rgb),0.12)",
        color: tone === "danger" ? "var(--danger)" : "var(--accent-dark)",
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
      }}
    >
      {content}
    </div>
  );
  if (isImpersonating)
    return bar(
      "warn",
      <>
        <AlertTriangle size={14} /> You are viewing <b>{shop?.name}</b> as platform admin.
        <button onClick={returnToAdmin} className="btn-ghost" style={{ padding: "4px 10px", marginLeft: "auto" }}>
          <ArrowLeft size={13} /> Back to admin
        </button>
      </>,
    );
  if (isSuperAdmin || !shop) return null;
  if (subscriptionExpired || shop.subscriptionActive === false)
    return bar(
      "danger",
      <>
        <AlertTriangle size={14} /> Your {shop.planLabel || shop.plan} plan has expired. You can view data, but billing & edits are locked.
        {platform.supportPhone || platform.supportEmail ? ` Contact ${platform.supportPhone || platform.supportEmail} to renew.` : " Contact the administrator to renew."}
      </>,
    );
  if (shop.daysLeft !== null && shop.daysLeft !== undefined && shop.daysLeft <= 5)
    return bar(
      "warn",
      <>
        <AlertTriangle size={14} /> Your {shop.planLabel || shop.plan} plan ends in {Math.max(0, shop.daysLeft)} day(s).
        <Link to="/settings" style={{ color: "inherit", fontWeight: 600 }}>
          View plan
        </Link>
      </>,
    );
  return null;
}

const Layout = () => (
  <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
    <Sidebar />
    <main className="flex-1 min-w-0 overflow-y-auto">
      <Banner />
      <Outlet />
    </main>
  </div>
);

export default Layout;
