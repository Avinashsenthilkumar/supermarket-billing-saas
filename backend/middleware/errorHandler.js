// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = err.errors.map((e) => e.message).join(", ");
  } else if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    const field = err.errors?.[0]?.path || "value";
    message = `${field.replace(/^uq_\w+?_/, "")} already exists`;
  } else if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message = "This record is linked to other data and cannot be changed";
  } else if (err.name === "SequelizeDatabaseError" && statusCode === 500) {
    message = process.env.NODE_ENV === "production" ? "Database error" : err.message;
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Upload is too large";
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON body";
  }

  if (statusCode >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.code && typeof err.code === "string" && !err.code.startsWith("ER_") ? { code: err.code } : {}),
    ...(process.env.NODE_ENV === "development" && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
