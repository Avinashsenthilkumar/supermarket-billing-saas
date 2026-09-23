// src/services/api.js
import axios from "axios";

export const BASE_URL = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("shop");
      if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    }
    if (status === 402) window.dispatchEvent(new CustomEvent("subscription-expired"));
    return Promise.reject(err);
  },
);

// ── Platform (public) ────────────────────────────────────────────────────────
export const platformAPI = {
  getPublic: () => api.get("/platform/public"),
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// ── Shop settings ────────────────────────────────────────────────────────────
export const settingsAPI = {
  get: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),
  resetAppearance: () => api.post("/settings/reset-appearance"),
};

// ── Products ─────────────────────────────────────────────────────────────────
export const productAPI = {
  getAll: (params) => api.get("/products", { params }),
  getSummary: () => api.get("/products/summary"),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${encodeURIComponent(barcode)}`),
  getCategories: () => api.get("/products/categories"),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  restore: (id) => api.patch(`/products/${id}/restore`),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  getMovements: (id, params) => api.get(`/products/${id}/movements`, { params }),
  scan: (data) => api.post("/products/scan", data),
  bulkImport: (products) => api.post("/products/bulk-import", { products }),
  // legacy aliases kept for older components
  getSales: (params) => api.get("/reports/sales", { params }),
  getTopProducts: (params) => api.get("/reports/top-products", { params }),
  getDashboard: () => api.get("/reports/dashboard"),
};

// ── Bills ────────────────────────────────────────────────────────────────────
export const billAPI = {
  getAll: (params) => api.get("/bills", { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post("/bills", data),
  preview: (data) => api.post("/bills/preview", data),
  cancel: (id, reason) => api.patch(`/bills/${id}/cancel`, { reason }),
  returnItems: (id, data) => api.post(`/bills/${id}/return`, data),
  getReturns: (params) => api.get("/bills/returns", { params }),
  getHeld: () => api.get("/bills/held"),
  hold: (data) => api.post("/bills/held", data),
  deleteHeld: (id) => api.delete(`/bills/held/${id}`),
  getInvoiceUrl: (id) => `${BASE_URL}/bills/${id}/invoice`,
};

// Open the PDF invoice in a new tab (works with custom REACT_APP_API_URL)
export const openInvoice = async (billId, format) => {
  const win = window.open("", "_blank");
  try {
    const res = await api.get(`/bills/${billId}/invoice`, { params: format ? { format } : {}, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    if (win) win.location.href = url;
    else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
};

export const invoiceAPI = {
  download: (id) => api.get(`/bills/${id}/invoice`, { responseType: "blob" }),
};

// ── Customers ────────────────────────────────────────────────────────────────
export const customerAPI = {
  getAll: (params) => api.get("/customers", { params }),
  lookup: (phone) => api.get("/customers/lookup", { params: { phone } }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  receivePayment: (id, data) => api.post(`/customers/${id}/payments`, data),
  adjustPoints: (id, data) => api.post(`/customers/${id}/points`, data),
};

// ── Suppliers / purchases / expenses / staff ────────────────────────────────
export const supplierAPI = {
  getAll: (params) => api.get("/suppliers", { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  pay: (id, data) => api.post(`/suppliers/${id}/payments`, data),
};

export const purchaseAPI = {
  getAll: (params) => api.get("/purchases", { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post("/purchases", data),
  cancel: (id) => api.patch(`/purchases/${id}/cancel`),
};

export const expenseAPI = {
  getAll: (params) => api.get("/expenses", { params }),
  create: (data) => api.post("/expenses", data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const staffAPI = {
  getAll: () => api.get("/staff"),
  create: (data) => api.post("/staff", data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const reportAPI = {
  getDashboard: () => api.get("/reports/dashboard"),
  getSales: (params) => api.get("/reports/sales", { params }),
  getTopProducts: (params) => api.get("/reports/top-products", { params }),
  getCategories: (params) => api.get("/reports/categories", { params }),
  getGst: (params) => api.get("/reports/gst", { params }),
  getProfit: (params) => api.get("/reports/profit", { params }),
  getStaff: (params) => api.get("/reports/staff", { params }),
  getDayEnd: (params) => api.get("/reports/day-end", { params }),
  getStockReport: (params) => api.get("/reports/stock", { params }),
  getExpiry: (params) => api.get("/reports/expiry", { params }),
};

// ── Platform admin ───────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getShops: (params) => api.get("/admin/shops", { params }),
  getShop: (id) => api.get(`/admin/shops/${id}`),
  createShop: (data) => api.post("/admin/shops", data),
  updateShop: (id, data) => api.put(`/admin/shops/${id}`, data),
  deleteShop: (id, confirm) => api.delete(`/admin/shops/${id}`, { data: { confirm } }),
  toggleShop: (id) => api.patch(`/admin/shops/${id}/toggle`),
  resetPassword: (id, data) => api.post(`/admin/shops/${id}/reset-password`, data),
  loginAs: (id) => api.post(`/admin/shops/${id}/login-as`),
  repairDb: (id) => api.post(`/admin/shops/${id}/repair-db`),
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (data) => api.put("/admin/settings", data),
};

export default api;
