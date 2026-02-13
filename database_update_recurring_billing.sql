-- =============================================================
-- 정기결제(Recurring Billing) 지원을 위한 DB 스키마 변경
-- =============================================================

-- 1) subscriptions 테이블에 정기결제 관련 컬럼 추가
ALTER TABLE subscriptions
  ADD COLUMN next_payment_date DATETIME NULL AFTER ended_at,
  ADD COLUMN billing_key_member_id BIGINT NULL AFTER next_payment_date,
  ADD COLUMN retry_count INT NOT NULL DEFAULT 0 AFTER billing_key_member_id;

CREATE INDEX idx_subscriptions_next_payment ON subscriptions(status, next_payment_date);

-- 2) 결제 이력 테이블 생성
CREATE TABLE IF NOT EXISTS payment_history (
  payment_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  subscription_id  BIGINT NOT NULL,
  owner_id         BIGINT NOT NULL,
  owner_type       ENUM('team', 'personal') NOT NULL,
  member_id        BIGINT NOT NULL,
  plan_id          BIGINT NOT NULL,
  amount           INT NOT NULL,
  order_id         VARCHAR(100) NOT NULL,
  tid              VARCHAR(100) NULL,
  bid              VARCHAR(50) NOT NULL,
  status           ENUM('SUCCESS', 'FAILED', 'REFUNDED') NOT NULL,
  result_code      VARCHAR(10) NULL,
  result_msg       VARCHAR(500) NULL,
  payment_type     ENUM('FIRST', 'RECURRING', 'RETRY') NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_subscription (subscription_id),
  INDEX idx_payment_owner (owner_id, owner_type),
  INDEX idx_payment_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
