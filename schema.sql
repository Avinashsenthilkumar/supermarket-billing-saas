-- ============================================================
-- SuperMart Billing System — Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS supermarket_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE supermarket_db;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin') DEFAULT 'admin',
  isActive    BOOLEAN DEFAULT TRUE,
  createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  barcode       VARCHAR(100) UNIQUE,
  serial_number VARCHAR(100) UNIQUE,
  price         DECIMAL(10,2) NOT NULL,
  quantity      INT DEFAULT 0,
  category      VARCHAR(80),
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_barcode (barcode),
  INDEX idx_serial (serial_number),
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ── Bills ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  bill_number     VARCHAR(20) NOT NULL UNIQUE,
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate        DECIMAL(5,2)  DEFAULT 0,
  tax_amount      DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount    DECIMAL(10,2) NOT NULL,
  payment_method  ENUM('cash','card','upi','other') DEFAULT 'cash',
  customer_name   VARCHAR(100),
  customer_phone  VARCHAR(15),
  notes           TEXT,
  status          ENUM('completed','cancelled','refunded') DEFAULT 'completed',
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB;

-- ── Bill Items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  bill_id         INT NOT NULL,
  product_id      INT NOT NULL,
  product_name    VARCHAR(150) NOT NULL,
  product_barcode VARCHAR(100),
  unit_price      DECIMAL(10,2) NOT NULL,
  quantity        INT NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id)    REFERENCES bills(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_bill (bill_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB;

-- ── Sample Admin (password: admin123) ────────────────────────
-- (Seeded automatically by server.js on first run)
