-- subscriptions 테이블 구조 변경
-- team_id를 owner_id와 owner_type으로 변경

ALTER TABLE subscriptions
  DROP FOREIGN KEY subscriptions_ibfk_1;

ALTER TABLE subscriptions
  CHANGE COLUMN team_id owner_id BIGINT NOT NULL,
  ADD COLUMN owner_type ENUM('team', 'personal') NOT NULL DEFAULT 'team' AFTER owner_id;

-- 인덱스 재생성
DROP INDEX idx_subscriptions_team ON subscriptions;
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner_id, owner_type);

