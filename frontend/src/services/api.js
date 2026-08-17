// src/services/api.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// ── Products ─────────────────────────────────────────────────────────────────
export const productAPI = {
  getSales: (params) => api.get("/reports/sales", { params }),

  getTopProducts: (params) => api.get("/reports/top-products", { params }),

  getDashboard: () => api.get("/reports/dashboard"),
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  getCategories: () => api.get("/products/categories"),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  scan: (data) => api.post("/products/scan", data),
  bulkImport: (products) => api.post("/products/bulk-import", { products }),
};

// ── Bills ─────────────────────────────────────────────────────────────────────
export const billAPI = {
  getAll: (params) => api.get("/bills", { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post("/bills", data),
  cancel: (id) => api.patch(`/bills/${id}/cancel`),
  getInvoiceUrl: (id) => `${BASE_URL}/bills/${id}/invoice`,
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportAPI = {
  getDashboard: () => api.get("/reports/dashboard"),
  getSales: (params) => api.get("/reports/sales", { params }),
  getTopProducts: (params) => api.get("/reports/top-products", { params }),
  getStockReport: (params) => api.get("/reports/stock", { params }),
};
export const customerAPI = {
  getAll: () => api.get("/customers"),
  getByPhone: (phone) => api.get(`/customers/${phone}`),
};
export const invoiceAPI = {
  download: (id) =>
    api.get(`/bills/${id}/invoice`, {
      responseType: "blob",
    }),
};
export default api;

export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getShops: () => api.get("/admin/shops"),
  createShop: (data) => api.post("/admin/shops", data),
  toggleShop: (id) => api.patch(`/admin/shops/${id}/toggle`),
};
