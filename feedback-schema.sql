-- Delayed feedback follow-up emails
-- Run once against the sundials database (idempotent; PHP also creates this table):
--   mysql -h mysql.precisionsundial.com -u dgennetten -p sundials < feedback-schema.sql
--
-- Dreamhost cron (hourly):
--   php /home/dgennetten/precisionsundial.com/feedback-followup-cron.php

CREATE TABLE IF NOT EXISTS feedback_followups (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email             VARCHAR(255) NOT NULL,
  token             CHAR(64)     NOT NULL,
  unsubscribe_token CHAR(64)     NOT NULL,
  send_after        DATETIME     NOT NULL,
  sent_at           DATETIME     NULL DEFAULT NULL,
  responded_at      DATETIME     NULL DEFAULT NULL,
  unsubscribed_at   DATETIME     NULL DEFAULT NULL,
  rating            VARCHAR(20)  DEFAULT NULL,
  comment           TEXT         DEFAULT NULL,
  location_name     VARCHAR(255) DEFAULT NULL,
  export_format     VARCHAR(20)  DEFAULT NULL,
  latitude          DECIMAL(10, 7) NULL DEFAULT NULL,
  longitude         DECIMAL(10, 7) NULL DEFAULT NULL,
  request_ip        VARCHAR(45)  DEFAULT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_followup_token (token),
  UNIQUE KEY uniq_followup_unsub (unsubscribe_token),
  KEY idx_followup_pending (sent_at, unsubscribed_at, send_after),
  KEY idx_followup_email (email, sent_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
