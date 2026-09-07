-- Global app settings (Admin panel prefs shared by all clients).
-- Safe to run multiple times; API also auto-creates this table on first request.

CREATE TABLE IF NOT EXISTS sundial_settings (
  setting_key   VARCHAR(64)  NOT NULL,
  setting_value TEXT         NOT NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
