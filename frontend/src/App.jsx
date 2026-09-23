// src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/shared/Layout";
import { PageLoader } from "./components/shared/UI";

const Login = lazy(() => import("./components/auth/Login"));
const Signup = lazy(() => import("./components/auth/Signup"));
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Reports = lazy(() => import("./components/dashboard/Reports"));
const DayEnd = lazy(() => import("./components/dashboard/DayEnd"));
const Billing = lazy(() => import("./components/billing/Billing"));
const Transactions = lazy(() => import("./components/billing/Transactions"));
const Stock = lazy(() => import("./components/stock/Stock"));
const BarcodeGenerator = lazy(() => import("./components/stock/BarcodeGenerator"));
const Purchases = lazy(() => import("./components/inventory/Purchases"));
const Suppliers = lazy(() => import("./components/inventory/Suppliers"));
const Customers = lazy(() => import("./components/customers/Customers"));
const CustomerDetails = lazy(() => import("./components/customers/CustomerDetails"));
const Expenses = lazy(() => import("./components/business/Expenses"));
const Staff = lazy(() => import("./components/business/Staff"));
const Settings = lazy(() => import("./components/settings/Settings"));
const Admin = lazy(() => import("./components/admin/Admin"));

const Fallback = () => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <PageLoader />
  </div>
);

function Home() {
  const { can } = useAuth();
  return <Navigate to={can("owner", "manager") ? "/dashboard" : "/billing"} replace />;
}

const OWNER_MANAGER = ["owner", "manager"];

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 13.5,
                fontFamily: "Outfit, sans-serif",
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                padding: "10px 16px",
              },
              success: { iconTheme: { primary: "#5f8f6f", secondary: "#fff" } },
              error: { iconTheme: { primary: "#c0564a", secondary: "#fff" } },
            }}
          />
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="billing" element={<Billing />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetails />} />
                <Route path="day-end" element={<DayEnd />} />
                <Route path="stock" element={<ProtectedRoute roles={OWNER_MANAGER}><Stock /></ProtectedRoute>} />
                <Route path="barcode" element={<ProtectedRoute roles={OWNER_MANAGER}><BarcodeGenerator /></ProtectedRoute>} />
                <Route path="purchases" element={<ProtectedRoute roles={OWNER_MANAGER}><Purchases /></ProtectedRoute>} />
                <Route path="suppliers" element={<ProtectedRoute roles={OWNER_MANAGER}><Suppliers /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute roles={OWNER_MANAGER}><Reports /></ProtectedRoute>} />
                <Route path="expenses" element={<ProtectedRoute roles={OWNER_MANAGER}><Expenses /></ProtectedRoute>} />
                <Route path="staff" element={<ProtectedRoute roles={["owner"]}><Staff /></ProtectedRoute>} />
                <Route path="settings" element={<Settings />} />
                <Route path="admin" element={<ProtectedRoute superAdmin><Admin /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
