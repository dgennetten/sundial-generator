-- MySQL schema for sundial_prints
-- Run once against the sundials database:
--   mysql -u dgennetten -p -h mysql.precisionsundial.com sundials < mysql_sundial_prints_table.sql

CREATE TABLE IF NOT EXISTS sundial_prints (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  location    TEXT,
  latitude    DECIMAL(10, 7) NOT NULL,
  longitude   DECIMAL(10, 7) NOT NULL,
  inclination DECIMAL(5, 2)  NOT NULL,
  declination DECIMAL(5, 2)  NOT NULL DEFAULT 0,
  gnomon_type VARCHAR(100)   NOT NULL,
  notes_type  VARCHAR(100)   NOT NULL,
  date_range  VARCHAR(100)   NOT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
