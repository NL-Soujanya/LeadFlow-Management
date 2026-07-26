-- ============================================================
-- LeadFlow — MySQL Database Schema
-- ============================================================
-- Run this in your MySQL server to create the database and tables.
--
-- Create the database first:
--   CREATE DATABASE leadflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE leadflow;
-- ============================================================

CREATE DATABASE IF NOT EXISTS leadflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE leadflow;

-- ============================================================
-- users — authentication table (replaces Supabase auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role ENUM('admin','member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- profiles — mirrors users for team directory queries
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(255),
  role ENUM('admin','member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- leads — the lead records with status pipeline
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  company VARCHAR(255),
  message TEXT,
  source VARCHAR(100) NOT NULL DEFAULT 'website',
  status ENUM('new','contacted','qualified','proposal','won','lost') NOT NULL DEFAULT 'new',
  assigned_to CHAR(36) DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leads_status (status),
  INDEX idx_leads_assigned_to (assigned_to),
  INDEX idx_leads_created_at (created_at DESC)
) ENGINE=InnoDB;

-- ============================================================
-- lead_notes — timestamped notes attached to a lead
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  lead_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_lead_notes_lead_id (lead_id)
) ENGINE=InnoDB;

-- ============================================================
-- lead_activities — append-only activity trail per lead
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id CHAR(36) NOT NULL PRIMARY KEY,
  lead_id CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  type VARCHAR(50) NOT NULL,
  description VARCHAR(500) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_lead_activities_lead_id (lead_id),
  INDEX idx_lead_activities_type (type)
) ENGINE=InnoDB;

-- ============================================================
-- Auto-sync profile when a user is created
-- ============================================================
DELimiter //
CREATE TRIGGER IF NOT EXISTS trg_user_create_profile
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO profiles (id, full_name, role) VALUES (NEW.id, NEW.full_name, NEW.role);
END//
DELimiter ;

-- ============================================================
-- DONE — tables created.
-- The seed script (server/src/seed.ts) will create the demo
-- admin and member users for you automatically.
-- ============================================================
