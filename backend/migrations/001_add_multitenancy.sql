-- ============================================================================
-- Multi-tenancy migration for the Supermarket Billing App
-- Run this ONCE on your existing Railway MySQL database BEFORE deploying the
-- new code. It creates the `shops` table, attaches all existing data to a
-- single default shop (id = 1), then enforces the shop_id columns.
--
-- HOW TO RUN:
--   Railway → your MySQL service → "Data" / "Query" tab → paste & run.
--   (Or connect with any MySQL client using the Railway connection string.)
--
-- Safe to run on a fresh DB too (IF NOT EXISTS guards are used where possible).
-- ============================================================================

-- 1) Create the shops (tenant) table -----------------------------------------
CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  owner_email VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NULL,
  address TEXT NULL,
  gst_number VARCHAR(20) NULL,
  plan ENUM('free','basic','pro') NOT NULL DEFAULT 'free',
  subscription_ends DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2) Create the default shop that owns all pre-existing data ------------------
INSERT INTO shops (id, name, owner_email, plan, subscription_ends, is_active)
SELECT 1, 'My Shop', 'admin@supermarket.com', 'pro',
       DATE_ADD(NOW(), INTERVAL 365 DAY), 1
WHERE NOT EXISTS (SELECT 1 FROM shops WHERE id = 1);

-- 3) Add shop_id columns (nullable first so existing rows survive) ------------
ALTER TABLE users    ADD COLUMN shop_id INT NULL;
ALTER TABLE products ADD COLUMN shop_id INT NULL;
ALTER TABLE bills    ADD COLUMN shop_id INT NULL;

-- 4) Back-fill every existing row to the default shop ------------------------
UPDATE users    SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE products SET shop_id = 1 WHERE shop_id IS NULL;
UPDATE bills    SET shop_id = 1 WHERE shop_id IS NULL;

-- 5) Enforce NOT NULL now that data is populated -----------------------------
ALTER TABLE users    MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE products MODIFY COLUMN shop_id INT NOT NULL;
ALTER TABLE bills    MODIFY COLUMN shop_id INT NOT NULL;

-- 6) Update role enum on users (admin -> owner/staff) ------------------------
ALTER TABLE users MODIFY COLUMN role ENUM('owner','staff') NOT NULL DEFAULT 'owner';
UPDATE users SET role = 'owner' WHERE role NOT IN ('owner','staff');

-- 7) Drop OLD global-unique indexes, add per-shop composite uniques ----------
--    Index names below are MySQL's usual auto-names. If any DROP errors with
--    "check that column/key exists", that index simply isn't there — skip it.

-- products.barcode / serial_number were globally unique; make them per-shop
ALTER TABLE products DROP INDEX barcode;
ALTER TABLE products DROP INDEX serial_number;
ALTER TABLE products ADD UNIQUE KEY uniq_shop_barcode (shop_id, barcode);
ALTER TABLE products ADD UNIQUE KEY uniq_shop_serial (shop_id, serial_number);

-- bills.bill_number was globally unique; make it per-shop
ALTER TABLE bills DROP INDEX bill_number;
ALTER TABLE bills ADD UNIQUE KEY uniq_shop_billno (shop_id, bill_number);

-- users.username was globally unique; make it per-shop (email stays global)
ALTER TABLE users DROP INDEX username;
ALTER TABLE users ADD UNIQUE KEY uniq_shop_username (shop_id, username);

-- 8) Foreign keys (optional but recommended) ---------------------------------
ALTER TABLE users    ADD CONSTRAINT fk_users_shop    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE products ADD CONSTRAINT fk_products_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE bills    ADD CONSTRAINT fk_bills_shop    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Done. Your old data now belongs to shop #1, and new signups create new shops.
