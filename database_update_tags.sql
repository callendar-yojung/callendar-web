-- 태그 및 태스크 색상 기능 추가

-- 1. 태그 테이블 (팀/개인 구분)
CREATE TABLE IF NOT EXISTS tags (
  tag_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',  -- 태그 색상 (hex)
  owner_type ENUM('team', 'personal') NOT NULL,
  owner_id BIGINT NOT NULL,  -- team_id 또는 member_id
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NOT NULL,  -- member_id
  FOREIGN KEY (created_by) REFERENCES members(member_id),
  UNIQUE KEY unique_tag_name (owner_type, owner_id, name)  -- 같은 팀/개인 내에서 태그명 중복 방지
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_tags_owner ON tags(owner_type, owner_id);
CREATE INDEX idx_tags_created_by ON tags(created_by);

-- 2. 태스크-태그 연결 테이블
CREATE TABLE IF NOT EXISTS task_tags (
  task_tag_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_tag (task_id, tag_id)  -- 같은 태스크에 동일 태그 중복 방지
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_task_tags_task ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

-- 3. 태스크 테이블에 색상 컬럼 추가
ALTER TABLE tasks
ADD COLUMN color VARCHAR(20) DEFAULT '#3B82F6' AFTER status;

-- 기본 태그 데이터 삽입 (예시)
-- 실제로는 사용자가 직접 생성하게 됩니다

