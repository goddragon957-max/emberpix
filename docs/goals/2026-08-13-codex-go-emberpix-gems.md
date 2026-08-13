# Emberpix GO 목표 — 보석 십자수 품질 슬라이스

## 사용자 지시

> 좋아 go 모드로 업그레이드 해줘

## Repo

- Canonical repo: `/home/sy/.openclaw/workspace/emberpix`
- GitHub: `https://github.com/goddragon957-max/emberpix`
- Branch: `master`
- Session: Discord thread `1537335196620296293` / Emberpix 보석 십자수 작업방

## GO 의미

이 목표는 한 번의 대화에서 끝나는 설명이 아니라, 작은 단위의 실제 변경 → 실행 검증 → 커밋 가능한 상태까지 계속 진행하는 첫 GO 사이클이다. 이번 사이클은 끝내고, 다음 사이클은 검증 결과를 보고 이어간다. 외부 발송·배포·결제·개인정보 수집은 하지 않는다.

## 현재 기준선

- M1~M20 완료, M21은 운영 주체·문의처·도메인·피드백 채널 결정 전의 공개 베타 준비 단계.
- 보석십자수 기능은 이미 M8/M12에 구현되어 있다: 내장 도안, 사진→컬러 도안, 색 범례, 색 필터, 진행률, 완성 축하.
- `AGENTS.md`의 제약을 지킨다: 한국어 보고/커밋, 마일스톤 순서 준수, 외부 UI 라이브러리와 추가 npm 의존성 금지, canvas/Pointer Events/모바일 터치 보존.
- 시작 시점은 깨끗한 `master`였고 기준 HEAD는 `43e16f4`였다.

## 목표

보석십자수 모드에서 다음으로 가장 가치 있는 **검증 가능한 내부 품질 슬라이스 하나**를 찾아 구현한다. 반드시 현재 코드와 기존 M21 경계를 먼저 읽고 결정한다.

허용되는 범위:

1. 기존 보석십자수 로직의 실제 버그/회귀 수정.
2. 사진 도안 생성·범례·진행률·색 필터·완성 판정의 순수 로직 테스트와 필요한 작은 수정.
3. 이미 존재하는 기능의 모바일/접근성/오조작 방지 UX 보강. 실제 동작하는 UI만 추가한다.
4. 테스트 실행과 빌드 재현성을 위한 최소 개발 스크립트 보강. 제품 의존성은 추가하지 않는다.

금지되는 범위:

- 운영 주체명, 이메일, 개인정보처리방침, 약관, 도메인, 피드백 채널을 추측해서 공개 화면에 넣기.
- 계정·광고·분석 SDK·결제·클라우드 저장·아동 개인정보 수집 추가.
- M21 실제 베타 완료를 주장하거나 마일스톤을 건너뛰기.
- 가짜 버튼/카운터/피드백 흐름 또는 정적 스크린샷으로 기능을 대신하기.
- unrelated 파일, orchestration scratch, `node_modules`를 커밋하기.

## 읽을 파일

- `AGENTS.md`, `ROADMAP.md`, `마일스톤.md`, `실행계획서-v6.md`
- `src/App.jsx`
- `src/core/gems.js`, `src/core/quantize.js`, `src/core/reference.js`, `src/core/patterns.js`
- 관련 CSS/테스트/`package.json`

## 검증 게이트

1. 의존성이 없으면 `npm install --no-package-lock`로 설치하되 package manifest와 lock을 임의로 바꾸지 않는다.
2. `node --test src/core/*.test.js`
3. `npm run build`
4. `git diff --check`
5. UI/입력 변경 시 로컬 서버를 띄워 브라우저에서 보석 모드 진입, 도안 선택, 셀 터치/클릭, 색 필터, 진행률/완성 상태를 실제로 확인하고 콘솔 오류를 확인한다.
6. 변경 전후 `git status --short`, `git diff --stat`, `git diff`를 확인한다.

## 완료 조건

- 한 가지 cohesive한 보석십자수 품질 슬라이스가 실제 코드에 반영됨.
- 관련 테스트/빌드/차이 검사 통과.
- 변경 파일이 의도한 파일로 제한됨.
- 한국어 커밋 메시지로 로컬 커밋하거나, 커밋이 부적절하면 이유와 정확한 남은 명령을 보고.
- `master` 원격 push는 이 GO 사이클에서 자동 실행하지 않는다. 외부 반영은 별도 확인 대상이다.

## 보고 형식

최종 줄에 다음 중 하나를 포함한다:

- `DONE: <변경 요약> | TEST: ... | BUILD: ... | COMMIT: ...`
- `BLOCKED: <정확한 blocker> | PRESERVED: <남긴 diff/파일> | NEXT: <한 가지 다음 행동>`
