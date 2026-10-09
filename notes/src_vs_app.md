# app/ 폴더와 src/ 폴더 구분

## 1. 한 줄 요약

- **`app/`**: Next.js가 **정해진 규칙으로 직접 읽는** 폴더. 웹 주소(페이지, API)와 연결되는 **입구**.
- **`src/`**: Next.js가 **신경 쓰지 않는** 폴더. 내가 정한 규칙으로 정리한 **실제 로직(내용물)**. `app/`의 파일이 import해서 사용한다.

> 프론트엔드/백엔드 구분이 아니다. 두 폴더 모두 프론트와 백엔드가 섞여 있다.

## 2. app/ 폴더

### 특징

- Next.js App Router가 폴더와 파일 이름을 보고 **웹 주소를 자동으로 만든다.**
- 파일 이름이 **정해진 규칙**이어야 인식된다. (`page.tsx`, `layout.tsx`, `route.ts` 등)
- **폴더 구조 = 웹 주소 구조**
- 입구 역할이므로 파일은 가볍게 두고, 실제 처리는 `src/`로 넘긴다.

### 주요 파일 규칙

| 파일 | 역할 |
|---|---|
| `page.tsx` | 해당 주소로 접속하면 보이는 화면 (프론트) |
| `layout.tsx` | 같은 폴더와 하위 폴더의 페이지를 감싸는 공통 틀 |
| `route.ts` | API 주소를 처리하는 파일 (백엔드) |
| `globals.css` | 전체 공통 스타일 (Tailwind 불러오기 등) |

### 폴더 이름 규칙

| 표기 | 의미 |
|---|---|
| `폴더명/` | 주소의 한 구간이 된다. (`app/api/tickets/` → `/api/tickets`) |
| `(폴더명)/` | 괄호는 주소에 나타나지 않는다. 파일을 묶어 정리하는 용도 (Route Group) |

### 이 프로젝트의 예

```
app/
├── layout.tsx              전체 공통 틀 (<html>, 탭 제목)
├── globals.css             Tailwind + 기본 스타일
├── (board)/
│   ├── layout.tsx          보드 영역의 상단 "Tika" 헤더
│   └── page.tsx            → localhost:3000/ 화면
└── api/tickets/route.ts    → localhost:3000/api/tickets
```

화면은 `layout.tsx`들이 겹쳐서 만들어진다.

```
app/layout.tsx                 (html, body)
 └ app/(board)/layout.tsx        (Tika 헤더)
    └ app/(board)/page.tsx         (본문)
```

## 3. src/ 폴더

### 특징

- Next.js가 폴더 이름에 **의미를 두지 않는다.** 정리 방식은 프로젝트가 정한다.
- `next dev`가 직접 찾아 실행하지 않고, `app/`의 페이지/API 파일이 **import로 불러와서** 쓴다.
- 이 프로젝트는 TRD.md에 따라 세 갈래로 나눈다.

### 구성

| 폴더 | 담는 것 | 실행되는 곳 |
|---|---|---|
| `src/server` | DB 접근, 비즈니스 로직 (예: `src/server/db`) | 서버 |
| `src/client` | 화면 컴포넌트, 훅 | 브라우저 |
| `src/shared` | 서버와 클라이언트가 같이 쓰는 코드 (예: Zod 스키마) | 양쪽 |

### 서버/클라이언트를 나누는 이유

- DB 접속 정보 같은 서버 전용 코드가 브라우저로 새어 나가면 안 된다.
- 로직을 따로 떼어 두면 테스트하기 쉽고 구조가 깔끔하다.
- CLAUDE.md의 "서버, 클라이언트, 공용 코드 사이의 import 방향 규칙"이 이 구조를 지키기 위한 규칙이다.

## 4. 두 폴더의 관계

`app/`이 얇은 입구, `src/`가 실제 작업실이다.

```
[백엔드 흐름]
브라우저 요청: GET /api/tickets
      ↓
app/api/tickets/route.ts     요청을 받는 입구 (짧게)
      ↓ import
src/server/...               DB 조회 등 실제 처리
      ↓
src/shared/...               입력 검증 스키마(Zod)

[프론트엔드 흐름]
app/(board)/page.tsx   →   src/client/ (컴포넌트)
```

## 5. 프론트엔드/백엔드 기준 정리

| 폴더 | 프론트엔드 | 백엔드 |
|---|---|---|
| `app/` | 페이지(`page.tsx`), 레이아웃(`layout.tsx`) | API(`route.ts`) |
| `src/` | `src/client` | `src/server` |
| (공용) | `src/shared` | `src/shared` |

Next.js는 **풀스택 프레임워크**라서 한 프로젝트 안에 프론트와 백엔드가 같이 있다. 별도 서버 없이 `app/api/` 아래에 파일을 두면 API 서버 역할을 한다.

## 6. 비교표

| | `app/` | `src/` |
|---|---|---|
| 누가 읽나 | Next.js가 직접 | 내 코드가 import해서 |
| 파일 이름 | 정해진 규칙 (`page.tsx` 등) | 자유 |
| 역할 | 주소 연결, 화면/API 입구 | 실제 로직 보관 |
| 폴더 구조의 의미 | 웹 주소가 됨 | 내가 정한 정리 방식 |
| 프론트/백엔드 | 둘 다 있음 | 둘 다 있음 (`client` / `server`로 구분) |

## 7. 참고: src/app/ 방식도 있다

Next.js는 `app` 폴더를 `src` 안에 넣는 구조(`src/app/`)도 공식 지원한다. `create-next-app --src-dir`로 만들면 그렇게 된다.

| 구조 | 모양 |
|---|---|
| 책 프롬프트 기본형 | `src/app/`, `src/components/` ... (전부 src 안) |
| 이 프로젝트 (TRD 기준) | `app/`은 루트, 로직은 `src/server·client·shared` |

- 둘 다 정상 동작한다. 이 프로젝트는 TRD.md의 구조를 따랐다.
- `app/`과 `src/app/`이 **동시에 있으면 `src/app`은 무시**되므로 하나만 쓴다.