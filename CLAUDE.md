# Kelindor (KD) 프로젝트 가이드

## 프로젝트 개요
Kelindor는 팀 협업, 프로젝트 관리, 태스크 관리를 위한 올인원 워크스페이스 플랫폼입니다.

## 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js (next-auth@beta)
- **i18n**: next-intl
- **Database**: MySQL (mysql2)
- **Linting**: Biome

## 프로젝트 구조
```
src/
├── app/
│   ├── [locale]/           # 다국어 라우트
│   │   ├── layout.tsx      # 루트 레이아웃 (html, body, providers)
│   │   ├── page.tsx        # 랜딩 페이지
│   │   ├── login/          # 로그인 페이지
│   │   └── dashboard/      # 대시보드
│   │       ├── layout.tsx  # 사이드바 레이아웃
│   │       └── page.tsx    # 대시보드 메인
│   └── api/                # API 라우트 (locale 밖)
│       └── auth/
├── components/
│   ├── landing/            # 랜딩 페이지 컴포넌트
│   ├── dashboard/          # 대시보드 컴포넌트
│   └── SessionProvider.tsx
├── lib/
│   ├── db.ts              # MySQL 연결
│   └── member.ts          # 회원 서비스
├── i18n/
│   ├── config.ts          # 언어 설정 (ko, en)
│   ├── request.ts         # 서버 요청 설정
│   └── routing.ts         # 라우팅 네비게이션
├── auth.ts                # NextAuth 설정
└── middleware.ts          # i18n 미들웨어
messages/
├── ko.json                # 한국어 번역
└── en.json                # 영어 번역
```

## 다국어 (i18n) 지원

### 지원 언어
- 한국어 (ko) - 기본
- 영어 (en)

### 사용법
```tsx
// 클라이언트 컴포넌트
"use client";
import { useTranslations } from "next-intl";

export default function Component() {
  const t = useTranslations("namespace");
  return <h1>{t("key")}</h1>;
}
```

```tsx
// 링크 사용 (locale 자동 처리)
import { Link } from "@/i18n/routing";

<Link href="/dashboard">Dashboard</Link>
```

### 번역 추가 시
1. `messages/ko.json`에 한국어 추가
2. `messages/en.json`에 영어 추가
3. 같은 키 구조 유지

## 데이터베이스 스키마

### 회원 (members)
```sql
CREATE TABLE members (
  member_id      bigint PRIMARY KEY AUTO_INCREMENT,
  provider       varchar(50),      -- 소셜 로그인 제공자 (kakao, google 등)
  provider_id    varchar(200),     -- 제공자 고유 ID
  created_at     datetime,
  lasted_at      datetime,         -- 마지막 로그인
  email          varchar(200),
  phone_number   varchar(100),
  nickname       varchar(200)      -- 자동 생성
);
```

### 워크스페이스 (workspaces)
```sql
CREATE TABLE workspaces (
  workspace_id   bigint PRIMARY KEY AUTO_INCREMENT,
  type           ENUM('personal', 'team'),  -- 개인 또는 팀 워크스페이스
  owner_id       bigint,                     -- type에 따라 member_id 또는 team_id
  created_at     datetime,
  name           varchar(100),
  created_by     bigint                      -- member_id
);
```

### 팀 (teams)
```sql
CREATE TABLE teams (
  team_id        bigint PRIMARY KEY AUTO_INCREMENT,
  name           varchar(100),
  created_at     datetime,
  created_by     bigint,            -- member_id
  description    varchar(255)
);
```

### 팀 멤버 (team_members)
```sql
CREATE TABLE team_members (
  team_member_id  bigint PRIMARY KEY AUTO_INCREMENT,
  team_id         bigint NOT NULL,
  member_id       bigint NOT NULL,
  team_role_id    bigint NOT NULL
);
```

### 팀 역할 (team_roles)
```sql
CREATE TABLE team_roles (
  team_role_id  bigint PRIMARY KEY AUTO_INCREMENT,
  team_id       bigint NOT NULL,
  name          varchar(50),      -- Manager, Lead, Member 등
  created_at    datetime,
  created_by    bigint
);
```

### 권한 (permissions)
```sql
CREATE TABLE permissions (
  permission_id  bigint PRIMARY KEY AUTO_INCREMENT,
  code           varchar(50),     -- READ, WRITE, DELETE 등
  description    varchar(255)
);
```

### 팀 역할 권한 (team_role_permissions)
```sql
CREATE TABLE team_role_permissions (
  team_role_permission_id  bigint PRIMARY KEY AUTO_INCREMENT,
  permission_id            bigint NOT NULL,
  team_role_id             bigint NOT NULL
);
```

### 태스크 (tasks)
```sql
CREATE TABLE tasks (
  id            bigint PRIMARY KEY AUTO_INCREMENT,
  start_time    datetime,
  end_time      datetime,
  content       TEXT,
  created_at    datetime,
  updated_at    datetime,
  created_by    bigint,           -- member_id
  updated_by    bigint,           -- member_id
  workspace_id  bigint NOT NULL   -- 워크스페이스 소속
);
```

### 태그 (tags)
```sql
CREATE TABLE tags (
  tag_id        bigint PRIMARY KEY AUTO_INCREMENT,
  name          varchar(50),
  created_at    datetime,
  color         varchar(30),      -- 태그 색상 (예: "#ff0000")
  workspace_id  bigint NOT NULL   -- 워크스페이스 소속
);
```

## 환경 변수 (.env.local)
```env
# NextAuth
AUTH_SECRET=           # openssl rand -base64 32

# Kakao OAuth
AUTH_KAKAO_ID=         # 카카오 REST API 키
AUTH_KAKAO_SECRET=     # 카카오 Client Secret

# MySQL Database
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=

# AWS S3 (프로필 이미지 등)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

## 인증 시스템

### 인증 방식
- **웹 브라우저**: NextAuth.js (쿠키 기반 세션)
- **데스크탑/모바일 앱**: JWT (Bearer 토큰)

### JWT 토큰 구조
- **Access Token**: 1시간 유효
- **Refresh Token**: 7일 유효
- 알고리즘: HS256
- 시크릿: `AUTH_SECRET` 환경변수

### 웹 인증 흐름
1. 사용자가 `/login`에서 카카오 로그인 클릭
2. NextAuth가 카카오 OAuth 처리
3. `findOrCreateMember()` 실행:
   - DB에서 provider + provider_id로 회원 조회
   - 없으면 새 회원 생성 (닉네임 자동 생성 + **개인 워크스페이스 자동 생성**)
   - 있으면 lasted_at 업데이트
4. 세션에 memberId, nickname, provider 저장

### 외부 앱 인증 흐름 (데스크탑/모바일)
1. 앱에서 카카오 SDK로 로그인하여 `access_token` 획득
2. 서버 API에 카카오 `access_token` 전달
3. 서버가 카카오 API로 사용자 정보 검증
4. DB에서 회원 조회/생성
5. JWT 토큰 페어 발급 (accessToken, refreshToken)
6. 앱에서 토큰 저장 후 API 호출 시 사용

### API 인증 헬퍼
모든 API는 `getAuthUser(request)` 함수로 인증을 처리합니다.
- Authorization 헤더의 Bearer 토큰 (JWT) 우선 확인
- 없으면 NextAuth 세션 확인 (웹 폴백)

```typescript
import { getAuthUser } from "@/lib/auth-helper";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // user.memberId, user.nickname, user.provider 사용
}
```

## 워크스페이스 시스템

### 개념
- **개인 워크스페이스**: 회원가입 시 자동으로 생성되는 개인 전용 공간
- **팀 워크스페이스**: 팀 생성 시 자동으로 생성되는 협업 공간

### 자동 생성 시점
- 회원가입: 개인 워크스페이스 1개 자동 생성 (`{nickname}의 워크스페이스`)
- 팀 생성: 팀 워크스페이스 1개 자동 생성 (팀 이름과 동일)

### WorkspaceSwitcher 기능
- 개인/팀 워크스페이스 전환
- 팀 워크스페이스 생성 (모달)
- 선택된 워크스페이스 표시
- 빈 상태 처리 (팀이 없을 때)
- 다크모드 지원

## 개발 가이드라인

### 컴포넌트 작성
- 서버 컴포넌트 기본, 필요시 "use client"
- 다국어 텍스트는 반드시 번역 파일 사용
- Tailwind CSS 클래스 사용
- 다크모드 지원 (dark: prefix)

### 새 페이지 추가
1. `src/app/[locale]/` 하위에 폴더 생성
2. 번역 키 추가 (ko.json, en.json)
3. 네비게이션 필요시 Sidebar 또는 Navbar 수정

### API 라우트 추가
- `src/app/api/` 하위에 생성 (locale 밖)
- DB 작업은 `src/lib/` 에 서비스 함수 작성

### 새 소셜 로그인 추가
1. `src/auth.ts` providers 배열에 추가
2. `.env.local`에 키 추가
3. `src/app/[locale]/login/page.tsx`에 버튼 추가

## 현재 구현 상태

### 완료
- [x] 카카오 로그인
- [x] 다국어 지원 (한/영)
- [x] SEO 메타데이터
- [x] 랜딩 페이지
- [x] 대시보드 UI
- [x] 태스크 CRUD (추가/수정/삭제)
- [x] 태스크 목록 조회 (DB 연동)
- [x] 태스크 모달 (보기/수정/생성 모드)
- [x] 캘린더 날짜별 태스크 개수 표시 (DB 연동)
- [x] 팀 CRUD (생성/조회/수정/삭제)
- [x] 워크스페이스 CRUD (생성/조회/수정/삭제)
- [x] 워크스페이스 스위처 (개인/팀 그룹화)
- [x] JWT 인증 (외부 앱용) + NextAuth 세션 (웹용)
- [x] 외부 카카오 로그인 API (데스크탑/모바일)

### TODO
- [ ] 태스크 상태 변경 (TODO, IN_PROGRESS, DONE)
- [ ] 팀원 초대
- [ ] 권한 관리
- [ ] 프로필 설정
- [ ] 알림 기능
- [ ] 캘린더 상세 페이지
- [ ] 구글/네이버 로그인 추가

## API 엔드포인트

### Workspaces
- `GET /api/me/workspaces` - 내 워크스페이스 목록 조회 (개인 + 소속 팀)
  - Returns: `{ workspaces: Workspace[] }`
- `GET /api/workspaces/[id]` - 워크스페이스 상세 조회
  - Returns: `{ workspace: Workspace }`
- `GET /api/workspaces/member/[id]` - 특정 회원의 워크스페이스 목록 조회
  - Params: `id` - member_id
  - Returns: `{ workspaces: Workspace[] }`
  - Note: 본인만 조회 가능 (또는 같은 팀 멤버)
- `GET /api/workspaces/team/[id]` - 특정 팀의 워크스페이스 목록 조회
  - Params: `id` - team_id
  - Returns: `{ workspaces: Workspace[] }`
  - Note: 팀 멤버만 조회 가능
- `PATCH /api/workspaces/[id]` - 워크스페이스 이름 수정
  - Body: `{ name: string }`
  - Returns: `{ success: true, message: string }`
- `POST /api/workspaces` - 새 워크스페이스 생성
  - Body: `{ name: string, type: "personal" | "team", owner_id: number }`
  - Returns: `{ workspace: Workspace, message: string }`
- `DELETE /api/workspaces/[id]` - 워크스페이스 삭제
  - Returns: `{ success: true, message: string }`

### Teams
- `GET /api/me/teams` - 내 팀 목록 조회
  - Returns: `{ teams: Team[] }`
- `POST /api/me/teams` - 새 팀 생성
  - Body: `{ name: string, description?: string }`
  - Returns: `{ success: true, teamId: number, message: string }`
- `GET /api/teams/[id]` - 팀 상세 조회
  - Returns: `{ team: Team }`
- `PATCH /api/teams/[id]` - 팀 정보 수정
  - Body: `{ name: string, description?: string }`
  - Returns: `{ success: true, message: string }`
- `DELETE /api/teams/[id]` - 팀 삭제
  - Returns: `{ success: true, message: string }`

### Tasks (워크스페이스 기반)
- `GET /api/tasks?workspace_id={id}` - 워크스페이스의 태스크 목록 조회
  - Query: `workspace_id` (required)
  - Returns: `{ tasks: Task[] }`
- `POST /api/tasks` - 새 태스크 생성
  - Body: `{ title, start_time, end_time, content?, status?, workspace_id }`
  - Returns: `{ success: true, taskId: number }`
- `PATCH /api/tasks` - 태스크 수정
  - Body: `{ task_id, title?, start_time?, end_time?, content?, status? }`
  - Returns: `{ success: true }`
- `DELETE /api/tasks?task_id={id}` - 태스크 삭제
  - Query: `task_id` (required)
  - Returns: `{ success: true }`

### External Auth (데스크탑/모바일 앱용)
- `POST /api/auth/external/kakao` - 카카오 토큰으로 로그인
  - Body: `{ access_token: string }` (카카오 SDK에서 받은 access_token)
  - Returns: `{ success: true, user: { memberId, nickname, email, provider }, accessToken, refreshToken, expiresIn }`
  - Note: 카카오 API로 토큰 검증 후 JWT 발급
- `POST /api/auth/external/refresh` - 토큰 갱신
  - Body: `{ refresh_token: string }`
  - Returns: `{ success: true, accessToken, refreshToken, expiresIn }`
  - Note: refresh_token 유효시 새 토큰 페어 발급
- `GET /api/auth/external/me` - 현재 사용자 정보 조회
  - Headers: `Authorization: Bearer {accessToken}`
  - Returns: `{ user: { memberId, nickname, email, provider } }`

### Calendar
- `GET /api/calendar?workspace_id={id}&year={year}&month={month}` - 월별 태스크 개수 조회
  - Query: `workspace_id`, `year`, `month` (required)
  - Returns: `{ taskCounts: { [date: string]: number } }`
