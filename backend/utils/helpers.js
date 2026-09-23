// utils/helpers.js — shared helpers for controllers

// Wrap async route handlers so thrown errors reach the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    if (code) this.code = code;
  }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const int = (v, fallback = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v, max = 255) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s.slice(0, max);
};
const bool = (v) => v === true || v === "true" || v === 1 || v === "1";

const pad = (n, width = 6) => String(n).padStart(width, "0");

// Pagination params (?page & ?limit) with sane bounds
const paging = (query, defLimit = 20, maxLimit = 500) => {
  const page = Math.max(1, int(query.page, 1));
  const limit = Math.min(maxLimit, Math.max(1, int(query.limit, defLimit)));
  return { page, limit, offset: (page - 1) * limit };
};

module.exports = { asyncHandler, HttpError, round2, round3, num, int, str, bool, pad, paging };
