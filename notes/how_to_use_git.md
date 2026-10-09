# Git/GitHub 기본 명령어 정리

## 1. 처음 설정 (한 번만)

```bash
git config --global user.name "이름"
git config --global user.email "이메일@example.com"
git config --list    # 설정 확인
```

## 2. 저장소 시작하기

| 명령어 | 설명 |
|---|---|
| `git init` | 현재 폴더를 새 git 저장소로 만듦 |
| `git clone <주소>` | 원격 저장소를 통째로 내려받음 |
| `git clone <주소> 폴더명` | 지정한 폴더 이름으로 받음 |

## 3. 기본 작업 흐름

```
파일 수정 → git add → git commit → git push
```

| 명령어 | 설명 |
|---|---|
| `git status` | 지금 바뀐 파일 상태 확인 |
| `git add 파일명` | 특정 파일을 커밋 대기 목록에 담기 |
| `git add -A` | 추가·수정·삭제 전부 담기 |
| `git commit -m "메시지"` | 담은 변경을 하나의 기록으로 저장 |
| `git push` | 내 커밋을 GitHub로 올리기 |
| `git pull` | GitHub의 최신 내용을 받아서 합치기 |

## 4. 기록 확인

| 명령어 | 설명 |
|---|---|
| `git log` | 커밋 기록 보기 |
| `git log --oneline` | 한 줄씩 요약해서 보기 |
| `git log --oneline --reverse` | 오래된 것부터 보기 |
| `git show <해시>` | 특정 커밋의 변경 내용 보기 |
| `git diff` | 아직 담지 않은 변경 내용 보기 |
| `git diff --staged` | 담아 둔 변경 내용 보기 |

## 5. 브랜치

| 명령어 | 설명 |
|---|---|
| `git branch` | 로컬 브랜치 목록 |
| `git branch -r` | 원격 브랜치 목록 |
| `git branch -a` | 로컬 + 원격 전부 |
| `git branch 이름` | 새 브랜치 만들기 |
| `git checkout 이름` / `git switch 이름` | 브랜치 이동 |
| `git checkout -b 이름` / `git switch -c 이름` | 만들면서 바로 이동 |
| `git merge 이름` | 지정한 브랜치를 현재 브랜치에 합치기 |
| `git branch -d 이름` | 브랜치 삭제 |

## 6. 원격 저장소 (GitHub 연결)

| 명령어 | 설명 |
|---|---|
| `git remote -v` | 연결된 원격 저장소 주소 확인 |
| `git remote add origin <주소>` | 원격 저장소 연결 |
| `git fetch` | 원격 정보만 가져오기 (파일은 안 바뀜) |
| `git fetch --all` | 모든 원격에서 가져오기 |
| `git push -u origin 브랜치명` | 처음 올릴 때 (이후엔 `git push`만) |

`fetch`는 정보만 가져오고, `pull`은 `fetch` + 합치기까지 한 번에 한다.

## 7. 실수했을 때 되돌리기

| 명령어 | 설명 |
|---|---|
| `git restore 파일명` | 수정한 파일을 마지막 커밋 상태로 되돌림 (수정 내용 사라짐) |
| `git restore --staged 파일명` | `add`한 것을 담기 취소 (파일 내용은 유지) |
| `git commit --amend -m "새 메시지"` | 방금 한 커밋의 메시지