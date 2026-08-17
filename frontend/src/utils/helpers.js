// src/utils/helpers.js

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const formatNumber = (n) =>
  new Intl.NumberFormat('en-IN').format(n || 0);

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';

export const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

export const getStockBadge = (qty) => {
  if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-500/15 text-red-400' };
  if (qty < 10) return { label: 'Low Stock', cls: 'bg-amber-500/15 text-amber-400' };
  return { label: 'In Stock', cls: 'bg-emerald-500/15 text-emerald-400' };
};

export const getPaymentBadge = (method) => {
  const map = {
    cash: 'bg-emerald-500/15 text-emerald-400',
    card: 'bg-blue-500/15 text-blue-400',
    upi: 'bg-purple-500/15 text-purple-400',
    other: 'bg-slate-500/15 text-slate-400',
  };
  return map[method] || map.other;
};
