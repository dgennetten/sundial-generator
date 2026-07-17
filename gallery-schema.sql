-- Sundial Photo Gallery schema
-- Run once against the `sundials` database:
--   mysql -h mysql.precisionsundial.com -u dgennetten -p sundials < gallery-schema.sql

-- Anyone who has completed an OTP sign-in. Rows are created on first successful verify.
CREATE TABLE IF NOT EXISTS gallery_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  is_blocked    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_gallery_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Short-lived one-time sign-in codes. Cleaned up opportunistically on verify.
CREATE TABLE IF NOT EXISTS gallery_otp_codes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  code       CHAR(6)      NOT NULL,
  attempts   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  request_ip VARCHAR(45)  DEFAULT NULL,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gallery_otp_lookup (email, code, used),
  KEY idx_gallery_otp_expiry (expires_at),
  KEY idx_gallery_otp_throttle_email (email, created_at),
  KEY idx_gallery_otp_throttle_ip (request_ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bearer tokens issued after a successful OTP verify.
CREATE TABLE IF NOT EXISTS gallery_sessions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token      CHAR(64)     NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_gallery_sessions_token (token),
  KEY idx_gallery_sessions_user (user_id),
  CONSTRAINT fk_gallery_sessions_user FOREIGN KEY (user_id)
    REFERENCES gallery_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploaded photos. Nothing is visible publicly until status = 'approved'.
CREATE TABLE IF NOT EXISTS gallery_photos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  uploader_email   VARCHAR(255) NOT NULL,
  caption          VARCHAR(500) DEFAULT NULL,
  image_path       VARCHAR(255) NOT NULL,
  width            SMALLINT UNSIGNED DEFAULT NULL,
  height           SMALLINT UNSIGNED DEFAULT NULL,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  moderation_token CHAR(64)     NOT NULL,
  display_order    INT          NOT NULL DEFAULT 0,
  uploader_ip      VARCHAR(45)  DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  moderated_at     DATETIME     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_gallery_photos_modtoken (moderation_token),
  KEY idx_gallery_photos_public (status, display_order, id),
  KEY idx_gallery_photos_user (user_id),
  CONSTRAINT fk_gallery_photos_user FOREIGN KEY (user_id)
    REFERENCES gallery_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
