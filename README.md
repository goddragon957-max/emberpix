# Emberpix

브라우저 픽셀아트 에디터. Emberfall 에셋 제작용이자, 아이들이 폰으로 노는 그림 앱.

- **그림 그리기** — 펜/지우개/채우기/스포이드, 도형, 선택, 애니메이션 프레임, 팔레트
- **보석십자수** — 도안 위를 톡톡 눌러 보석 채우기. 사진에서 도안 자동 생성
- 내보내기 — 투명 PNG, 스프라이트시트(+JSON 메타), 애니메이션 GIF, 클립보드
- PWA — 홈 화면에 담아 전체화면·오프라인으로

## 실행

```bash
npm install && npm run dev
```

→ http://localhost:5199 (포트가 점유 중이면 `npm run dev -- --port 5210`)

프로덕션 빌드 확인(서비스워커는 여기서만 동작):

```bash
npm run build && npm run preview
```

## 문서

| 문서 | 내용 |
|---|---|
| [AGENTS.md](AGENTS.md) | 룰 정본 |
| [ROADMAP.md](ROADMAP.md) | 방향과 판단 기준 |
| [마일스톤.md](마일스톤.md) | 마일스톤 이력·예정 작업 |
| [실행계획서-v4.md](실행계획서-v4.md) | 다음 작업(M17~M19) 실행 순서·완료 기준 |
| [스프라이트시트-메타.md](스프라이트시트-메타.md) | 시트 JSON 메타 스키마 |

## 구조

```
src/
  App.jsx        UI·입력 조립만
  core/          알고리즘 (파일당 하나의 책임)
    grid history renderer exporter storage format project selection
    reference templates patterns view shapes quantize palettes gems
    gif modes confetti
tools/
  make-icons.mjs PWA 아이콘 생성 (Node 내장 zlib로 PNG 직접 인코딩)
```

외부 UI 라이브러리·npm 의존성을 쓰지 않는다. GIF 인코더, 컨페티, 아이콘 생성기 모두 직접 구현했다.
