-- ============================================================
-- MOBILE FILTER DATABASE (CLEAN + OPTIMIZED)
-- ============================================================

DROP DATABASE IF EXISTS mobile_filter_db;
CREATE DATABASE mobile_filter_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mobile_filter_db;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- ============================================================
-- PROCESSORS
-- ============================================================
CREATE TABLE processors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  manufacturer VARCHAR(50),
  core_count INT,
  process_node_nm INT
);

-- ============================================================
-- PLATFORMS (OS ONLY)
-- ============================================================
CREATE TABLE platforms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  os VARCHAR(50) UNIQUE
);

-- ============================================================
-- DISPLAY TECH
-- ============================================================
CREATE TABLE display_tech (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) UNIQUE
);

-- ============================================================
-- PHONES (MAIN TABLE)
-- ============================================================
CREATE TABLE phones (
  id INT AUTO_INCREMENT PRIMARY KEY,

  brand_id INT NOT NULL,
  processor_id INT NOT NULL,
  platform_id INT,
  display_tech_id INT,

  model VARCHAR(150) NOT NULL,

  -- Core specs
  screen_size DECIMAL(4,2),
  refresh_rate INT,
  battery_capacity INT,
  fast_charge INT,
  wireless_charge BOOLEAN DEFAULT 0,

  -- Ratings
  spec_score INT,
  user_rating DECIMAL(3,1),

  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (processor_id) REFERENCES processors(id),
  FOREIGN KEY (platform_id) REFERENCES platforms(id),
  FOREIGN KEY (display_tech_id) REFERENCES display_tech(id)
);

-- ============================================================
-- PHONE VARIANTS (RAM + STORAGE + PRICE)
-- ============================================================
CREATE TABLE phone_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_id INT NOT NULL,
  ram INT NOT NULL,
  storage INT NOT NULL,
  price INT,

  FOREIGN KEY (phone_id) REFERENCES phones(id) ON DELETE CASCADE
);

-- ============================================================
-- PHONE CAMERAS (MULTI-LENS SUPPORT)
-- ============================================================
CREATE TABLE phone_cameras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_id INT NOT NULL,
  placement ENUM('rear','front'),
  lens_type ENUM('primary','ultrawide','telephoto','macro','depth','selfie'),
  megapixels DECIMAL(5,2),
  ois BOOLEAN DEFAULT 0,

  FOREIGN KEY (phone_id) REFERENCES phones(id) ON DELETE CASCADE
);

-- ============================================================
-- USER WISHLIST
-- ============================================================
CREATE TABLE user_wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  phone_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (phone_id) REFERENCES phones(id) ON DELETE CASCADE
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  token VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES (IMPORTANT FOR PERFORMANCE)
-- ============================================================

CREATE INDEX idx_phone_brand ON phones(brand_id);
CREATE INDEX idx_phone_processor ON phones(processor_id);
CREATE INDEX idx_variant_price ON phone_variants(price);
CREATE INDEX idx_variant_ram ON phone_variants(ram);

-- ============================================================
-- VIEW: MASTER PHONE DATA
-- ============================================================
CREATE VIEW v_phone_master AS
SELECT 
  p.id,
  b.name AS brand,
  p.model,
  pv.price,
  pv.ram,
  pv.storage,
  pr.name AS processor,
  p.screen_size,
  p.refresh_rate,
  p.battery_capacity,
  p.fast_charge,
  dt.type AS display_type,
  pl.os
FROM phones p
JOIN brands b ON p.brand_id = b.id
JOIN processors pr ON p.processor_id = pr.id
LEFT JOIN phone_variants pv ON p.id = pv.phone_id
LEFT JOIN display_tech dt ON p.display_tech_id = dt.id
LEFT JOIN platforms pl ON p.platform_id = pl.id;

-- ============================================================
-- VIEW: CAMERA SUMMARY
-- ============================================================
CREATE VIEW v_camera_summary AS
SELECT 
  phone_id,
  MAX(CASE WHEN placement='rear' THEN megapixels END) AS rear_mp,
  MAX(CASE WHEN placement='front' THEN megapixels END) AS front_mp
FROM phone_cameras
GROUP BY phone_id;