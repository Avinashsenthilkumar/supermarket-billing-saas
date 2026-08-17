// src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/shared/Layout";
import { PageLoader } from "./components/shared/UI";
const Customers = lazy(() => import("./components/customers/Customers"));
const Login = lazy(() => import("./components/auth/Login"));
const Signup = lazy(() => import("./components/auth/Signup"));
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Billing = lazy(() => import("./components/billing/Billing"));
const Stock = lazy(() => import("./components/stock/Stock"));
const BarcodeGenerator = lazy(
  () => import("./components/stock/BarcodeGenerator"),
);
const Transactions = lazy(() => import("./components/billing/Transactions"));
const Reports = lazy(() => import("./components/dashboard/Reports"));
const Admin = lazy(() => import("./components/admin/Admin"));
const CustomerDetails = lazy(
  () => import("./components/customers/CustomerDetails"),
);
const Fallback = () => (
  <div
    style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <PageLoader />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#faf9f7",
              color: "#1a1714",
              border: "1px solid #e0dbd3",
              borderRadius: 10,
              fontSize: 13.5,
              fontFamily: "Outfit, sans-serif",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              padding: "10px 16px",
            },
            success: {
              iconTheme: { primary: "#3a7a5a", secondary: "#faf9f7" },
            },
            error: { iconTheme: { primary: "#b84040", secondary: "#faf9f7" } },
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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="billing" element={<Billing />} />
              <Route path="stock" element={<Stock />} />
              <Route path="barcode" element={<BarcodeGenerator />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="reports" element={<Reports />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:phone" element={<CustomerDetails />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
