---
name: canvas-editor
description: Emberpix 캔버스 렌더링·포인터 입력·undo 히스토리 작업 시 필수 참조
---

# 캔버스 에디터 핵심 패턴

## 렌더링
- 캔버스 내부 해상도 = size × cell (cell = floor(640/size)), CSS는 width 100% + image-rendering: pixelated.
- 그리기 순서: 체커보드 → 픽셀 → 그리드. 매 프레임 전체 다시 그린다
  (부분 갱신 최적화는 64×64에서 병목 확인 후).
- 리렌더 트리거는 version 카운터 하나로만.

## 입력
- pointerdown에서 setPointerCapture, 셀 좌표는 getBoundingClientRect 비율 계산.
- 스트로크 = down에서 undo push 1회 → move에서 paint → up에서 종료.
- 채우기/스포이드는 down 단발 처리, 스트로크 아님.
- 대칭 그리기: paint 시 (size-1-x, y)에 동일 값.

## 히스토리
- undo/redo는 픽셀 배열 스냅샷 스택. 새 스트로크 시작 시 redo 스택 비움.
- 캔버스 크기 변경 시 히스토리 초기화.

## 함정
- 터치 스크롤 간섭 → canvas에 touch-action: none 필수.
- flood fill은 재귀 금지, 스택 방식.
- 프레임 기능 추가 시 스냅샷 대상이 "현재 프레임"인지 "전체 프레임"인지 먼저 결정하고 시작.
