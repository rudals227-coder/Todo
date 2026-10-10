---
name: changelog
description: git 커밋 이력을 기능 명세(specs/NNN-*)·FR ID와 연결해 CHANGELOG.md를 한국어로 갱신한다.
argument-hint: "[기준 커밋/태그 (생략 시 CHANGELOG.md의 마지막 기록 이후)]"
disable-model-invocation: true
allowed-tools:
  - Bash(git log *)
  - Bash(git diff *)
  - Bash(git tag *)
  - Read
  - Edit
  - Write
---

## 입력

기준 범위: $ARGUMENTS

## 현재 컨텍스트

- 최근 커밋: !`git log --oneline -30`
- 태그: !`git tag --sort=-creatordate`

## 작업 절차

1. 범위 결정: 인자가 있으면 `<인자>..HEAD`, 없으면 CHANGELOG.md의 마지막 기록 커밋 이후. CHANGELOG.md가 없으면 전체 이력.
2. `git log --format='%h %ad %s' --date=short <범위>`로 커밋을 수집한다.
3. 커밋을 Keep a Changelog 분류(추가/변경/수정/제거/문서/기타)로 나눈다.
   - 커밋 메시지·변경 파일에서 FR-NNN, specs/NNN-* 가 확인되면 항목에 함께 표기한다.
   - 확인되지 않으면 추측해서 붙이지 않는다.
4. CHANGELOG.md의 `## [Unreleased]` 아래에 추가한다 (기존 항목은 수정·삭제하지 않음).
5. 변경 내용을 사용자에게 보여주고 멈춘다.

## 규칙

- `notes/` 디렉토리는 읽거나 검색하지 않는다 (CLAUDE.md).
- git commit/push, 태그 생성은 하지 않는다. 커밋은 사용자가 확인한 뒤 별도로 요청한다.
- 문장은 한국어, 용어는 CLAUDE.md §3 용어(Backlog, plannedStartDate 등)를 따른다.
