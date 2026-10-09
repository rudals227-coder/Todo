# Spec Kit 사용법 정리

## 1. Spec Kit이란

- GitHub이 만든 오픈소스 툴킷으로, **명세 주도 개발(Spec-Driven Development, SDD)** 을 돕는다.
- 핵심 아이디어: 코드부터 시키지 않고, **무엇을 만들지 문서(명세)부터 정리한 뒤** AI에게 구현시킨다.
- Claude Code, GitHub Copilot, Gemini CLI 등 여러 AI 코딩 도구와 함께 쓸 수 있다.
- 이 분야에서 가장 널리 알려진 도구 중 하나다. (스타 수 등 최신 수치는 `github.com/github/spec-kit`에서 확인)

## 2. 왜 쓰나

바이브 코딩의 문제를 단계별 문서로 보완한다.

- 대화가 길어지면 처음 요구사항이 흐려지고 AI가 엉뚱한 방향으로 간다.
- 매번 코드 스타일과 구조가 달라진다.
- 왜 그렇게 만들었는지 기록이 남지 않는다.

각 단계마다 사람이 문서를 **읽고, 고치고, 승인한 뒤** 다음 단계로 넘어간다.

## 3. 설치와 초기화

### 설치 확인

```bash
specify check        # 필요한 도구와 사용 가능한 integration 확인
specify version      # 버전 확인
```

설치 방법은 공식 README를 기준으로 한다. (uv 사용 방식이 안내돼 있음)

### 프로젝트에 적용

```bash
# 새 폴더로 시작
specify init my-project --integration claude

# 이미 있는 프로젝트 폴더에 적용 (현재 폴더에 설치)
specify init --here --integration claude
```

| 옵션 | 의미 |
|---|---|
| `--here` | 새 폴더를 만들지 않고 현재 폴더에 설치 |
| `--integration claude` | AI 에이전트로 Claude Code 사용 |
| `--script sh` | 보조 스크립트 종류 (sh / ps / py) |
| `--force` | 덮어쓰기 확인 없이 진행 (처음엔 쓰지 않기) |

- 설치 중 스크립트 종류를 물으면 **WSL(bash)에서는 `sh`** 를 선택한다.
- 폴더가 비어 있지 않으면 "덮어쓸 수 있다"는 경고가 나온다. **먼저 git 커밋을 해 두고** `y`로 진행한다.

### 설치 후 확인

```bash
git status           # 새로 생긴 파일 확인
git diff CLAUDE.md   # 기존 파일이 바뀌지 않았는지 확인
```

설치되면 생기는 것:

- `.specify/` : 템플릿, 보조 스크립트, constitution(`.specify/memory/constitution.md`)
- `.claude/skills/` : Spec Kit 스킬들 (specify, clarify, plan, tasks, analyze, checklist, implement, converge, constitution, taskstoissues)

## 4. 명령어와 작업 순서

> 이번 버전은 명령어가 **하이픈 형태** (`/speckit-specify`)다.
> 책이나 예전 문서의 `/speckit.specify`(점 형태)와 다를 수 있으니 화면에 나온 형태를 따른다.

| 순서 | 명령어 | 역할 |
|---|---|---|
| 1 | `/speckit-constitution` | 프로젝트 불변 원칙 정하기 |
| 2 | `/speckit-specify` | 무엇을 만들지 명세 작성 |
| 선택 | `/speckit-clarify` | 모호한 부분을 질문으로 정리 (plan 전에) |
| 3 | `/speckit-plan` | 기술 스택과 구조 등 구현 계획 수립 |
| 선택 | `/speckit-checklist` | 요구사항 품질 체크리스트 (plan 후) |
| 4 | `/speckit-tasks` | 작은 작업 단위로 분해 |
| 선택 | `/speckit-analyze` | spec/plan/tasks 간 일관성 점검 (implement 전) |
| 5 | `/speckit-implement` | 작업 순서대로 구현 실행 |
| 보조 | `/speckit-converge` | 코드 상태를 평가해 남은 작업을 tasks에 추가 |
| 보조 | `/speckit-taskstoissues` | tasks를 GitHub 이슈로 변환 |

### 한 사이클 요약

```
명세 확인(specify) → 계획 수립(plan) → 작업 분해(tasks) → 구현 실행(implement)
```

기능 하나를 만들 때마다 이 사이클을 반복한다.

## 5. constitution (프로젝트 원칙)

- 위치: `.specify/memory/constitution.md`
- 설치 직후에는 `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]` 같은 **빈칸 템플릿**이다.
- 이후 plan, tasks, implement가 이 원칙을 기준으로 계획과 코드를 만든다. **가장 먼저 채운다.**
- 아무것도 적지 않고 실행하면 Claude가 `CLAUDE.md`, `docs/`를 읽고 초안을 만들어 준다. **초안을 읽고 내 프로젝트에 맞게 고치는 것이 중요하다.**

예시 (원칙을 직접 지정):

```
/speckit-constitution TDD를 필수로 하고 RED→GREEN→Refactor 단계를 섞지 않는다. docs/를 공식 스펙으로 삼는다.
```

## 6. 작은 단위 커밋과 함께 쓰기

단계가 끝날 때마다 커밋을 남긴다.

```bash
git add -A
git commit -m "chore: Spec Kit 초기 설정"
git commit -m "docs: constitution 작성"
git commit -m "docs: 기능 명세 작성"
git commit -m "docs: 구현 계획 수립"
git commit -m "docs: 작업 목록 생성"
git commit -m "feat: 작업 1 구현"
```

- 문제가 생기면 이전 커밋으로 되돌릴 수 있다.
- 책의 예제 저장소 브랜치(`chapter5.1-SDD`)는 `git log --oneline --reverse`로 오래된 커밋부터 읽으며 따라간다.

## 7. 웹이 아닌 프로젝트에 쓸 때 (분석 도구, 자동화 도구)

잘 맞는 경우:

- 반복해서 쓸 도구 (주간 보고서 생성기, 파일 정리 자동화 등)
- 입력과 출력이 명확한 작업
- 다른 사람이 쓰거나 나중에 고칠 도구
- 기능이 점점 늘어나는 도구

과한 경우:

- 탐색적 데이터 분석 (요구사항이 정해져 있지 않음 → 노트북으로 먼저 탐색)
- 한 번 쓰고 버릴 짧은 스크립트

달라지는 점:

- **constitution 예시**: 원본 데이터는 수정하지 않는다 / 같은 입력이면 같은 결과(재현성) / 단계마다 로그를 남긴다 / 잘못된 입력은 조용히 넘기지 않고 오류로 알린다 / 실행 방법을 README에 적는다
- **spec에는 화면 대신** 입력(파일 형식, 컬럼, 경로), 출력(형식, 저장 위치), 이상 상황(빈 파일, 컬럼 누락), 실행 방식(명령어 옵션)을 쓴다.
- **테스트는 작은 샘플 파일**로 "이 입력이면 이 출력"을 확인한다.
- **파일 삭제, 덮어쓰기, 외부 전송** 같은 위험한 동작은 "삭제는 확인 후에만"처럼 규칙으로 명시한다.

## 8. 사용 규모 가이드

| 작업 규모 | 추천 |
|---|---|
| 몇 줄짜리 일회성 스크립트 | Claude Code에 바로 지시 |
| 반복 사용할 소형 도구 | 간단히 명세만 쓰고 바로 구현 |
| 기능이 여러 개인 도구, 여럿이 쓰는 도구 | 전체 사이클 |

## 9. 주의할 점

- **작은 작업에는 과하다.** 버튼 색 변경 같은 수정에 전체 사이클은 비효율적이다.
- **문서 검토를 건너뛰면 의미가 없다.** 각 단계의 결과를 읽고 고친 뒤 넘어간다.
- **명세와 코드가 어긋날 수 있다.** 구현 중 바뀐 내용은 문서에 반영하고, `analyze`, `converge`로 점검한다.
- **버전이 빨리 바뀐다.** 옵션 이름(`--ai` → `--integration`), 명령어 형태(`.` → `-`)가 책과 다를 수 있다. 막히면 `specify init --help`와 화면 안내를 기준으로 한다.
- **`.claude/`에는 인증 정보가 저장될 수 있다.** 개인 설정 파일(`.claude/settings.local.json`)은 `.gitignore`에 추가한다.

## 10. 자주 쓰는 확인 명령

```bash
specify init --help     # 사용 가능한 옵션 확인
specify check           # 도구 및 integration 확인
git status              # 변경 상태 확인
git log --oneline       # 커밋 기록 확인
```

## 11. 시작 체크리스트

1. [ ] 현재 상태를 git으로 커밋해 둔다.
2. [ ] `specify init --here --integration claude` 실행 (스크립트 종류는 `sh`)
3. [ ] `git status`, `git diff`로 기존 파일이 바뀌지 않았는지 확인
4. [ ] Claude Code를 새로 시작하고 `/`로 `speckit-` 스킬이 보이는지 확인
5. [ ] `/speckit-constitution`으로 원칙을 채우고 검토 후 커밋
6. [ ] `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` 순서로 진행
7. [ ] 단계마다 결과를 읽고 고친 뒤 커밋