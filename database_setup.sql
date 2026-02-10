-- Kelindor 데이터베이스 테이블 생성 스크립트

-- 1. 회원 테이블
CREATE TABLE IF NOT EXISTS members (
  member_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  provider       VARCHAR(50),      -- 소셜 로그인 제공자 (kakao, google 등)
  provider_id    VARCHAR(200),     -- 제공자 고유 ID
  created_at     DATETIME,
  lasted_at      DATETIME,         -- 마지막 로그인
  email          VARCHAR(200),
  phone_number   VARCHAR(100),
  nickname       VARCHAR(200),     -- 자동 생성
  UNIQUE KEY unique_provider (provider, provider_id)  -- 중복 가입 방지
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_provider ON members(provider, provider_id);

-- 2. 팀 테이블
CREATE TABLE IF NOT EXISTS teams (
  team_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100),
  created_at   DATETIME,
  created_by   BIGINT,            -- member_id
  description  VARCHAR(255),
  FOREIGN KEY (created_by) REFERENCES members(member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 팀 역할 테이블
CREATE TABLE IF NOT EXISTS team_roles (
  team_role_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id       BIGINT NOT NULL,
  name          VARCHAR(50),      -- Manager, Lead, Member 등
  created_at    DATETIME,
  created_by    BIGINT,
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (created_by) REFERENCES members(member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 팀 멤버 테이블
CREATE TABLE IF NOT EXISTS team_members (
  team_member_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id         BIGINT NOT NULL,
  member_id       BIGINT NOT NULL,
  team_role_id    BIGINT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id),
  FOREIGN KEY (team_role_id) REFERENCES team_roles(team_role_id),
  UNIQUE KEY unique_team_member (team_id, member_id)  -- 같은 팀에 중복 가입 방지
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- 5. 권한 테이블
CREATE TABLE IF NOT EXISTS permissions (
  permission_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
  code           VARCHAR(50),     -- READ, WRITE, DELETE 등
  description    VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 팀 역할 권한 테이블
CREATE TABLE IF NOT EXISTS team_role_permissions (
  team_role_permission_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
  permission_id            BIGINT NOT NULL,
  team_role_id             BIGINT NOT NULL,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id),
  FOREIGN KEY (team_role_id) REFERENCES team_roles(team_role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 워크스페이스 테이블
CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
  type          VARCHAR(20) NOT NULL,  -- 'personal' 또는 'team'
  owner_id      BIGINT NOT NULL,       -- member_id (personal) 또는 team_id (team)
  name          VARCHAR(100) NOT NULL,
  created_at    DATETIME NOT NULL,
  created_by    BIGINT NOT NULL,       -- member_id
  FOREIGN KEY (created_by) REFERENCES members(member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- 8. 태스크 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  title       VARCHAR(100) NOT NULL,
  start_time  DATETIME NOT NULL,
  end_time    DATETIME,                  -- NULL 허용 (진행 중인 태스크)
  content     TEXT,
  status      VARCHAR(50) DEFAULT 'TODO',  -- TODO, IN_PROGRESS, DONE 등
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  created_by  BIGINT NOT NULL,           -- member_id
  updated_by  BIGINT NOT NULL,           -- member_id
  workspace_id BIGINT NOT NULL,          -- 워크스페이스 소속
  FOREIGN KEY (created_by) REFERENCES members(member_id),
  FOREIGN KEY (updated_by) REFERENCES members(member_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_start_time ON tasks(start_time);

-- 9. 플랜 테이블
CREATE TABLE IF NOT EXISTS plans (
  plan_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price INT NOT NULL,
  max_members INT NOT NULL,
  max_storage_mb INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 구독 테이블 (팀 또는 개인 단위)
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT NOT NULL,
  owner_type ENUM('team','personal') NOT NULL,
  plan_id BIGINT NOT NULL,
  status ENUM('ACTIVE','CANCELED','EXPIRED') NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner_id, owner_type);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- 11. 파일 테이블
CREATE TABLE IF NOT EXISTS files (
  file_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_mb INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_files_team ON files(team_id);

-- 12. 팀 저장소 사용량 테이블 (캐시)
CREATE TABLE IF NOT EXISTS team_storage_usage (
  team_id BIGINT PRIMARY KEY,
  used_storage_mb INT NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 플랜 데이터 삽입
INSERT INTO plans (name, price, max_members, max_storage_mb, created_at) VALUES
  ('Basic', 0, 5, 1000, NOW()),
  ('Team', 8000, 50, 10000, NOW()),
  ('Enterprise', 20000, 999, 100000, NOW())
ON DUPLICATE KEY UPDATE name=name;

-- 13. 관리자 테이블
CREATE TABLE IF NOT EXISTS admins (
  admin_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- 해시된 비밀번호
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  role VARCHAR(50) DEFAULT 'ADMIN',  -- SUPER_ADMIN, ADMIN
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스 추가
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_email ON admins(email);

-- 기본 관리자 계정 생성
INSERT INTO admins (username, password, name, email, role, created_at) VALUES
  ('admin', '--', '시스템 관리자', 'admin@task.com', 'SUPER_ADMIN', NOW())
ON DUPLICATE KEY UPDATE username=username;
