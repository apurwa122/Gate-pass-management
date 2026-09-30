PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('requester','approver','security','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
  email TEXT, organization TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS gate_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id INTEGER NOT NULL REFERENCES visitors(id),
  requested_by INTEGER NOT NULL REFERENCES users(id), purpose TEXT NOT NULL,
  visit_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending'
    CHECK(status IN ('Pending','Approved','Rejected','Used','Expired')),
  qr_reference TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, pass_id INTEGER NOT NULL REFERENCES gate_passes(id),
  approver_id INTEGER NOT NULL REFERENCES users(id), decision TEXT NOT NULL CHECK(decision IN ('Approved','Rejected')),
  remarks TEXT, approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS entry_exit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT, pass_id INTEGER NOT NULL REFERENCES gate_passes(id),
  entry_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, exit_time TEXT,
  verified_by INTEGER NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_passes_status ON gate_passes(status);
CREATE INDEX IF NOT EXISTS idx_passes_visitor ON gate_passes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_records_open ON entry_exit_records(exit_time);
