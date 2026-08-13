import React, { useState, useRef, useEffect } from "react";
import { makeGrid, floodFill } from "./core/grid.js";
import { createHistory } from "./core/history.js";
import { render, renderTilePreview } from "./core/renderer.js";
import {
  exportSheet, exportSheetWithMeta, exportGif, copyFrameToClipboard,
} from "./core/exporter.js";
import { saveState, loadState } from "./core/storage.js";
import { saveProjectFile, parseProject } from "./core/project.js";
import {
  createLibraryId, deleteLibraryItem, listLibraryItems, loadLibraryItem, saveLibraryItem,
} from "./core/library.js";
import { normalizeRect, inRect, extractRect, clearRect, stampPixels, flipX } from "./core/selection.js";
import { linePoints, rectPoints, ellipsePoints, expandBrush, replaceColor } from "./core/shapes.js";
import { imageFromFile, sampleReference } from "./core/reference.js";
import { TEMPLATES, templateToReference } from "./core/templates.js";
import { BUILTIN_PATTERNS } from "./core/patterns.js";
import {
  PATTERN_COLORS, imageToPattern, patternLegend, patternProgress, nextUnfinishedColor,
} from "./core/gems.js";
import { applyGemCell, canApplyGemCell } from "./core/gem-input.js";
import { MODES, MODE_LIST, MODE_DRAW, MODE_GEM, modeFromSaved, allowsTool } from "./core/modes.js";
import { runConfetti } from "./core/confetti.js";
import {
  MIN_SCALE, MAX_SCALE, FIT_VIEW, clampView, zoomBy, pinchView, pointerSpan, cssTransform,
} from "./core/view.js";
import {
  SWEETIE16, MAX_PALETTES, MAX_COLORS, normalizePaletteState, allPalettes, activeColors,
  activePaletteIndex, isEditable, setActivePalette, addPalette, duplicateActivePalette,
  removePalette, renamePalette, addColorToActive, removeColorFromActive, pushRecentColor,
} from "./core/palettes.js";
import { extractPalette } from "./core/quantize.js";
import {
  createPatternId, deletePatternItem, listPatternItems, savePatternItem,
} from "./core/pattern-library.js";
import { describePointer, pressureBrushSize } from "./core/pointer-input.js";

// ---------- constants ----------
const SIZES = [16, 32, 64];
const DEFAULT_SIZE = 32;
const DEFAULT_COLOR = SWEETIE16[3];
const AUTOSAVE_MS = 500;
// 이미지에서 뽑을 대표색 개수 후보.
const EXTRACT_COUNTS = [8, 12, 16, 24, 32];

const UI = {
  bg: "#141519",
  panel: "#1e2027",
  panelHi: "#262933",
  border: "#33363f",
  text: "#e8e6e1",
  dim: "#8a8d99",
  ember: "#ff7a2f",
  emberDeep: "#e35b1e",
};

// ---------- tiny pixel-icon component ----------
function Icon({ name, size = 18, color = "currentColor" }) {
  const paths = {
    pen: "M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    eraser: "M16.24 3.56l4.2 4.2a2 2 0 0 1 0 2.83l-9.9 9.9H5.6l-2.4-2.4a2 2 0 0 1 0-2.82l10.2-10.2a2 2 0 0 1 2.83 0zM6.6 18.5h3.1l2.9-2.9-4.2-4.2-3.4 3.4a.5.5 0 0 0 0 .7l1.6 1.6z",
    fill: "M19 11l-8-8-1.4 1.4 1.3 1.3-5.8 5.8a1.5 1.5 0 0 0 0 2.1l4.3 4.3a1.5 1.5 0 0 0 2.1 0L19 11zM6.9 12l5.1-5.1 5.1 5.1H6.9zM20.5 14s-1.5 2.2-1.5 3.3a1.5 1.5 0 0 0 3 0c0-1.1-1.5-3.3-1.5-3.3z",
    picker: "M20.7 5.6l-2.3-2.3a1.6 1.6 0 0 0-2.3 0l-2 2 4.6 4.6 2-2a1.6 1.6 0 0 0 0-2.3zM3 17.3V21h3.7L16.9 10.8 12.3 6.2 3 15.4v1.9z",
    undo: "M12.5 8H7.8l2.6-2.6L9 4 4 9l5 5 1.4-1.4L7.8 10h4.7a4.5 4.5 0 1 1 0 9H7v2h5.5a6.5 6.5 0 1 0 0-13z",
    redo: "M11.5 8h4.7l-2.6-2.6L15 4l5 5-5 5-1.4-1.4 2.6-2.6h-4.7a4.5 4.5 0 1 0 0 9H17v2h-5.5a6.5 6.5 0 1 1 0-13z",
    grid: "M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z",
    mirror: "M11 2h2v20h-2V2zM3 6l5 6-5 6V6zm18 0v12l-5-6 5-6z",
    trash: "M9 3h6l1 2h4v2H4V5h4l1-2zM6 8h12l-1 13H7L6 8zm4 3v7h1.5v-7H10zm3 0v7h1.5v-7H13z",
    download: "M12 3v10.2l3.6-3.6L17 11l-5 5-5-5 1.4-1.4L11 13.2V3h1zM4 19h16v2H4v-2z",
    upload: "M12 21V10.8l3.6 3.6L17 13l-5-5-5 5 1.4 1.4 2.6-2.6V21h1zM4 3h16v2H4V3z",
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z",
    copy: "M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z",
    play: "M8 5v14l11-7L8 5z",
    stop: "M6 6h12v12H6z",
    onion: "M12 3l8.5 5-8.5 5-8.5-5L12 3zm7 8.2l1.5 .8-8.5 5-8.5-5 1.5-.8L12 15l7-3.8z",
    image: "M3 4h18v16H3V4zm2 2v12h14V6H5zm2 10l3-4 2 2.5 1.5-2L17 16H7zm3-7a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z",
    select: "M4 4h4v2H6v2H4V4zm6 0h4v2h-4V4zm6 0h4v4h-2V6h-2V4zM4 10h2v4H4v-4zm14 0h2v4h-2v-4zM4 16h2v2h2v2H4v-4zm14 0h2v4h-4v-2h2v-2zm-8 2h4v2h-4v-2z",
    gem: "M8 3h8l4 6-8 12L4 9l4-6zm.9 2L6.3 8.5h3.2L10.7 5H8.9zm6.2 0h-1.8l1.2 3.5h3.2L15.1 5zM8.5 8.5L12 17l3.5-8.5h-7z",
    line: "M4 18.6L18.6 4 20 5.4 5.4 20z",
    rect: "M3 5h18v14H3V5zm2 2v10h14V7H5z",
    circle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14z",
    swap: "M7 7h8V4l5 4-5 4V9H7v4H5V7h2zm10 10H9v3l-5-4 5-4v3h8v-4h2v6h-2z",
    back: "M15.4 4.6L14 3.2 5.2 12l8.8 8.8 1.4-1.4L8 12l7.4-7.4z",
    more: "M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <path d={paths[name]} />
    </svg>
  );
}

// ---------- frame thumbnail ----------
function FrameThumb({ pixels, size, rev }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const cell = cv.width / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = pixels[y * size + x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }, [rev, size, pixels]);
  return <canvas ref={ref} width={44} height={44} style={{ width: 44, height: 44, display: "block", imageRendering: "pixelated" }} />;
}

// ---------- template thumbnail (도안 미리보기) ----------
function TemplateThumb({ tpl }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const n = tpl.rows.length;
    const cell = cv.width / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = tpl.rows[y][x] === "#" ? "#2d2d2d" : "#f4f4f4";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }, [tpl]);
  return <canvas ref={ref} width={48} height={48} style={{ width: 48, height: 48, display: "block", imageRendering: "pixelated", borderRadius: 2 }} />;
}

// ---------- pattern thumbnail (보석십자수 도안: 색상 배열 미리보기) ----------
function PatternThumb({ make, size = 32 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const pat = make(size);
    const cell = cv.width / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = pat[y * size + x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }, [make, size]);
  return <canvas ref={ref} width={48} height={48} style={{ width: 48, height: 48, display: "block", imageRendering: "pixelated", borderRadius: 2 }} />;
}

// 작품 보관함 카드용 작은 PNG. 현재 프레임을 64px로 축소해 localStorage에 함께 둔다.
function makeLibraryThumb(pixels, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = UI.panel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cell = canvas.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pixel = pixels[y * size + x];
      if (!pixel) continue;
      ctx.fillStyle = pixel;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  return canvas.toDataURL("image/png");
}

// 사용자 사진에서 만든 보석 도안용 미리보기.
// 원본 사진은 저장하지 않고, 생성된 도안과 작은 PNG만 보관한다.
function makePatternThumb(pattern, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = UI.panel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cell = canvas.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = pattern[y * size + x];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  return canvas.toDataURL("image/png");
}

function savedAtLabel(updatedAt) {
  return new Date(updatedAt).toLocaleDateString("ko-KR", {
    month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// ---------- main ----------
export default function App() {
  // 자동 저장본 복구 (없거나 손상 시 null → 기본값).
  const [boot] = useState(() => loadState());

  const [size, setSize] = useState(() => boot?.size ?? DEFAULT_SIZE);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(() => boot?.color ?? DEFAULT_COLOR);
  const [showGrid, setShowGrid] = useState(true);
  const [mirrorX, setMirrorX] = useState(false);
  const [exportScale, setExportScale] = useState(8);
  const [version, setVersion] = useState(0);

  // 애니메이션 프레임
  const [currentFrame, setCurrentFrame] = useState(() => boot?.currentFrame ?? 0);
  const [onionSkin, setOnionSkin] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(8);

  // 타일 모드 (3×3 반복 미리보기)
  const [tilePreview, setTilePreview] = useState(false);
  const tileCanvasRef = useRef(null);

  // 색칠공부 (참조 이미지/도안을 흑백으로 캔버스 아래에 표시)
  const [reference, setReference] = useState(() => boot?.reference ?? null);
  const [showReference, setShowReference] = useState(true);
  const [refOpacity, setRefOpacity] = useState(() => boot?.refOpacity ?? 1);
  // 참조 출처 — 크기 변경 시 재생성용 (세션 한정, 저장 안 함).
  // null | { type: "image", img } | { type: "template", index }
  const [refSource, setRefSource] = useState(null);
  const fileInputRef = useRef(null);

  // 프로젝트 저장/불러오기 (.emberpix)
  const projectInputRef = useRef(null);
  // { text, error } | null — 불러오기 결과 안내 (4초 후 자동 사라짐).
  const [notice, setNotice] = useState(null);
  // 작품 보관함은 자동저장과 별도다. currentLibraryId가 있으면 같은 작품을 안전하게 갱신한다.
  const [libraryItems, setLibraryItems] = useState(() => listLibraryItems());
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [currentLibraryId, setCurrentLibraryId] = useState(null);
  // null | { afterNewMode: string | null } — 저장 뒤 새 작품을 시작해야 할 때 모드를 기억한다.
  const [librarySave, setLibrarySave] = useState(null);
  const [libraryName, setLibraryName] = useState("");
  const [librarySaveError, setLibrarySaveError] = useState(null);
  const [pendingNewMode, setPendingNewMode] = useState(null);
  // null | { type: "clear" } | { type: "resize", size: number }
  // 아이가 서랍의 위험한 버튼을 잘못 눌러도 현재 작업을 바로 바꾸지 않는다.
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState(null);

  // 팔레트 슬롯 상태 { user, active, recent } — 내장 Sweetie 16은 런타임에 0번으로 붙는다.
  const [palettes, setPalettes] = useState(() => normalizePaletteState(boot?.palettes));
  // 팔레트 색 삭제 모드(켜면 스와치 클릭이 삭제). 사용자 팔레트에서만 의미 있다.
  const [paletteEdit, setPaletteEdit] = useState(false);
  const [extractCount, setExtractCount] = useState(16);
  const paletteInputRef = useRef(null);
  // 최근 색 기록은 포인터 클로저에서 호출되므로 최신 색을 ref로 들고 있는다.
  const colorRef = useRef(color);
  useEffect(() => { colorRef.current = color; }, [color]);

  // 그리기 옵션 — 브러시 크기(정사각 n×n), 도형 채움 여부.
  const [brushSize, setBrushSize] = useState(1);
  const [shapeFilled, setShapeFilled] = useState(false);
  // 도형 드래그 진행 상태 { x0, y0, x1, y1 } | null. 확정 전엔 오버레이로만 보인다.
  const shapeRef = useRef(null);

  // 캔버스 뷰(확대/이동). 표시는 CSS transform, 픽셀 데이터는 무관.
  const [view, setView] = useState(FIT_VIEW);
  const wrapRef = useRef(null);
  // 캔버스가 들어갈 영역과, 거기에 딱 맞는 정사각 한 변(px).
  // aspect-ratio + max-height 조합은 가로가 긴 화면에서 폭이 안 줄어 직사각이 되므로
  // (Chrome 확인) 실제 영역을 재서 min(가로, 세로)로 직접 정한다.
  const stageRef = useRef(null);
  const [square, setSquare] = useState(0);
  // 활성 포인터 목록(멀티터치 판별용) + 제스처 스냅샷.
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  // 제스처 중이거나 손가락이 남아있는 동안엔 그리기를 막는다.
  const blockDrawRef = useRef(false);
  const wrapWidth = () => (wrapRef.current ? wrapRef.current.getBoundingClientRect().width : 0);

  // 화면 모드 — null이면 시작 화면(모드 고르기). 고른 뒤에야 편집 화면이 뜬다.
  // 저장본의 모드는 시작 화면에서 "이어서 하기" 표시에만 쓰고, 자동 진입은 하지 않는다.
  const [mode, setMode] = useState(null);
  const modeRef = useRef(null); // 키보드/포인터 클로저용 최신 모드
  useEffect(() => { modeRef.current = mode; }, [mode]);
  // 시작 화면의 "이어서 하기" 표시용 — 마지막으로 쓰던 모드.
  // 세션 중 모드를 나갔다 오면 그때 쓰던 모드가 우선한다.
  const lastModeRef = useRef(modeFromSaved(boot?.mode, !!boot?.pattern));
  // 화면 크기 — 폰(세로 쌓기) / 가로가 넓은 화면(캔버스 옆에 조작부) 분기용.
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  // 가로로 눕힌 화면은 세로가 부족해 조작부를 아래에 두면 캔버스가 확 쪼그라든다.
  // 가로가 세로보다 길고 700px 이상이면 조작부를 옆 기둥으로 옮긴다.
  const wide = vp.w > vp.h && vp.w >= 700;
  const sideWidth = vp.w < 900 ? 300 : 340;

  // 고급 기능은 전부 이 서랍에 모은다 — 평소 화면엔 지금 쓸 것만 남긴다.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 그림 모드에서 도형/선택 같은 확장 도구를 펼칠지.
  const [moreTools, setMoreTools] = useState(false);

  // 보석십자수 — gemMode: 픽셀을 보석알로 렌더 + 도안 보고 톡톡 채우기.
  // pattern: 셀별 목표색(hex|null) 배열 또는 null. 도안이 있으면 페인트-바이-넘버.
  const [gemMode, setGemMode] = useState(() => !!boot?.pattern);
  const [pattern, setPattern] = useState(() => boot?.pattern ?? null);
  const patternRef = useRef(pattern); // 포인터 클로저용 최신 도안
  useEffect(() => { patternRef.current = pattern; }, [pattern]);

  // 색 필터 — 이 색 칸에만 보석을 놓을 수 있다(실제 보석십자수처럼 한 색씩).
  // 화면 상태일 뿐 저장하지 않는다.
  const [patternFilter, setPatternFilter] = useState(null);
  const filterRef = useRef(null);
  useEffect(() => { filterRef.current = patternFilter; }, [patternFilter]);
  // 사진 → 도안 생성 옵션.
  const [patternColors, setPatternColors] = useState(12);
  const patternInputRef = useRef(null);
  const [patternLibraryItems, setPatternLibraryItems] = useState(() => listPatternItems());
  const [patternSave, setPatternSave] = useState(false);
  const [patternName, setPatternName] = useState("");
  const [patternSaveError, setPatternSaveError] = useState(null);
  // 마지막 입력 장치 안내 — 펜이 연결되면 손가락과 구분해 알려준다.
  const [pointerInfo, setPointerInfo] = useState(null);
  const pointerInfoRef = useRef(null);
  const confettiRef = useRef(null);
  const [celebrating, setCelebrating] = useState(false);
  const wasDoneRef = useRef(false);

  // 선택 도구 — 확정된 사각 선택 { x, y, w, h } | null. 픽셀 데이터가 아니므로 undo 대상 아님.
  const [selRect, setSelRect] = useState(null);
  const selRectRef = useRef(null); // 키보드 클로저용 최신값
  // 진행 중 드래그: null | { mode:"select", x0,y0,x1,y1 }
  //              | { mode:"move", float, w, h, fx, fy, grabDX, grabDY }
  const dragRef = useRef(null);

  useEffect(() => {
    selRectRef.current = selRect;
  }, [selRect]);

  // 각 프레임은 { pixels, history } — 히스토리가 프레임에 종속되어 undo가 현재 프레임에만 적용된다.
  const framesRef = useRef(
    (boot?.frames ?? [makeGrid(boot?.size ?? DEFAULT_SIZE)]).map((px) => ({
      pixels: px,
      history: createHistory(),
    }))
  );
  const frameIndexRef = useRef(currentFrame); // 키보드/타이머 클로저용 최신 인덱스
  const dragIndexRef = useRef(null);
  const drawingRef = useRef(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    frameIndexRef.current = currentFrame;
  }, [currentFrame]);

  const bump = () => setVersion((v) => v + 1);
  const frames = framesRef.current;
  const activeFrame = () => framesRef.current[frameIndexRef.current];

  // undo/redo 가용 여부는 렌더 시 파생 → 프레임 전환 시 자동 갱신.
  const activeHistory = frames[currentFrame]?.history;
  const undoLen = activeHistory ? activeHistory.undoLen : 0;
  const redoLen = activeHistory ? activeHistory.redoLen : 0;

  // ----- rendering -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = framesRef.current[currentFrame].pixels;
    const onion =
      onionSkin && !playing && currentFrame > 0
        ? framesRef.current[currentFrame - 1].pixels
        : null;
    // 선택 오버레이: 드래그 중이면 진행 상태, 아니면 확정 선택.
    const drag = dragRef.current;
    let overlay = null;
    if (drag?.mode === "select") {
      overlay = { ...normalizeRect(drag.x0, drag.y0, drag.x1, drag.y1), float: null };
    } else if (drag?.mode === "move") {
      overlay = { x: drag.fx, y: drag.fy, w: drag.w, h: drag.h, float: drag.float };
    } else if (selRect) {
      overlay = { ...selRect, float: null };
    }
    render(canvas, active, size, {
      showGrid,
      onion,
      reference: showReference ? reference : null,
      refAlpha: refOpacity,
      selection: overlay,
      gem: gemMode,
      pattern: gemMode ? pattern : null,
      patternFilter: gemMode ? patternFilter : null,
      preview: shapeRef.current ? { points: shapeCells(shapeRef.current), color } : null,
    });
    // mode: 시작 화면에서 돌아오면 캔버스가 새로 붙으므로 반드시 다시 그린다.
  }, [version, showGrid, size, currentFrame, onionSkin, playing, reference, showReference, refOpacity, selRect, gemMode, pattern, patternFilter, mode]);

  // ----- tile preview (켜져 있으면 현재 프레임을 3×3 반복 렌더) -----
  useEffect(() => {
    if (!tilePreview) return;
    const cv = tileCanvasRef.current;
    if (!cv) return;
    renderTilePreview(cv, framesRef.current[currentFrame].pixels, size);
  }, [tilePreview, version, currentFrame, size]);

  // 캔버스 영역 크기를 실측해 정사각 한 변을 정한다.
  // 캔버스 크기는 영역 크기에 영향을 주지 않으므로 관찰 루프가 생기지 않는다.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      // clientWidth/Height는 패딩을 포함하므로 빼야 실제로 그릴 수 있는 크기가 나온다.
      const cs = getComputedStyle(el);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const s = Math.floor(Math.min(el.clientWidth - padX, el.clientHeight - padY));
      setSquare(s > 0 ? s : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // vp: ResizeObserver 콜백이 늦거나 막히는 상황(백그라운드 탭 등)에도
    //     창 크기 변화만으로 한 번은 반드시 다시 잰다.
  }, [mode, vp, wide]);

  // ----- 완성 축하 -----
  // 마지막 한 알을 놓는 "순간"에만 터뜨린다. 이미 완성된 저장본을 열었을 때는
  // enterMode가 wasDoneRef를 미리 맞춰두므로 조용히 들어간다.
  useEffect(() => {
    const p = patternProgress(pattern, framesRef.current[frameIndexRef.current]?.pixels);
    const done = !!p && p.total > 0 && p.done === p.total;
    if (done && !wasDoneRef.current && mode === MODE_GEM) setCelebrating(true);
    wasDoneRef.current = done;
  }, [version, pattern, mode, currentFrame]);

  // 컨페티 실행 — 방금 완성한 도안의 색을 그대로 뿌린다.
  useEffect(() => {
    if (!celebrating) return;
    const colors = [...new Set((pattern || []).filter(Boolean))].slice(0, 8);
    return runConfetti(confettiRef.current, {
      colors,
      seed: 7,
      onDone: () => setCelebrating(false),
    });
  }, [celebrating]);

  // 휠 확대 (커서 기준). React의 onWheel은 passive라 preventDefault가 안 먹어 네이티브로 붙인다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => zoomBy(v, factor, e.clientX - r.left, e.clientY - r.top, r.width));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // 시작 화면에는 캔버스가 없다 — 모드로 들어와 래퍼가 붙은 뒤 다시 등록해야 한다.
  }, [mode]);

  // 창 크기가 바뀌면 이동량(px 기준)을 다시 제한하고, 레이아웃 분기도 다시 계산한다.
  useEffect(() => {
    const onResize = () => {
      const w = wrapWidth();
      if (w) setView((v) => clampView(v, w));
      setVp({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // ----- playback -----
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrentFrame((f) => (f + 1) % framesRef.current.length);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [playing, fps]);

  // ----- autosave (픽셀/크기/색/프레임 변경 후 디바운스 저장) -----
  useEffect(() => {
    const t = setTimeout(() => {
      saveState({
        size,
        frames: framesRef.current.map((f) => f.pixels),
        currentFrame,
        color,
        reference,
        refOpacity,
        pattern,
        palettes,
        mode: mode ?? lastModeRef.current, // 시작 화면에선 마지막 모드를 유지한다
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [version, size, color, currentFrame, reference, refOpacity, pattern, palettes, mode]);

  // 실제로 색을 쓴 순간에만 최근 목록에 올린다(스와치를 고른 것만으로는 기록 안 함).
  // 이미 맨 앞이면 pushRecentColor가 같은 참조를 반환해 리렌더가 일어나지 않는다.
  const noteColorUsed = () => setPalettes((s) => pushRecentColor(s, colorRef.current));

  // ----- history (현재 프레임 대상) -----
  const pushUndo = () => {
    const fr = activeFrame();
    fr.history.push(fr.pixels);
  };
  const undo = () => {
    const fr = activeFrame();
    const prev = fr.history.undo(fr.pixels);
    if (prev === null) return;
    fr.pixels = prev;
    bump();
  };
  const redo = () => {
    const fr = activeFrame();
    const next = fr.history.redo(fr.pixels);
    if (next === null) return;
    fr.pixels = next;
    bump();
  };

  // ----- painting -----
  const cellFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // 캔버스가 숨겨져 0 크기면 좌표가 Infinity가 된다 — 계산 자체를 포기한다.
    if (!rect.width || !rect.height) return null;
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return [x, y];
  };

  // 드래그 진행용 — 캔버스 밖으로 나가도 가장자리 셀로 클램프.
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const cellFromEventClamped = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = clamp(Math.floor(((e.clientX - rect.left) / rect.width) * size), 0, size - 1);
    const y = clamp(Math.floor(((e.clientY - rect.top) / rect.height) * size), 0, size - 1);
    return [x, y];
  };

  // 뷰포트(래퍼) 좌상단 기준 좌표 — 확대/이동 계산용.
  const viewPoint = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // 두 번째 손가락이 닿으면 진행 중인 조작을 되돌린다 — 확대하려다 점이 찍히는 사고 방지.
  // down에서 pushUndo를 이미 했으므로 undo() 한 번이면 스트로크 이전 상태로 정확히 복원된다.
  const cancelStroke = () => {
    // 도형은 아직 확정 전이라 미리보기만 버리면 된다(undo 불필요).
    if (shapeRef.current) {
      shapeRef.current = null;
      bump();
      return;
    }
    const drag = dragRef.current;
    if (drag) {
      dragRef.current = null;
      if (drag.mode === "move") undo(); // 이동은 down에서 pushUndo 했음
      else bump();
      return;
    }
    if (drawingRef.current) {
      drawingRef.current = false;
      undo();
    }
  };

  const beginGesture = () => {
    cancelStroke();
    blockDrawRef.current = true;
    const [a, b] = [...pointersRef.current.values()];
    const { dist, mid } = pointerSpan(a, b);
    gestureRef.current = { view, dist, mid };
  };

  const updatePointerInfo = (e, announce = false) => {
    const info = describePointer(e);
    const changed = pointerInfoRef.current?.type !== info.type
      || pointerInfoRef.current?.pressure !== info.pressure;
    pointerInfoRef.current = info;
    if (changed) setPointerInfo(info);
    if (announce && info.type === "pen") {
      setNotice({
        text: info.pressure == null ? "모바일 펜 입력을 사용 중이에요." : `모바일 펜 입력 · 압력 ${Math.round(info.pressure * 100)}%`,
        error: false,
      });
    }
  };

  const applyZoom = (factor, anchor) => {
    const w = wrapWidth();
    if (!w) return;
    const a = anchor || { x: w / 2, y: w / 2 };
    setView((v) => zoomBy(v, factor, a.x, a.y, w));
  };
  const resetView = () => setView(FIT_VIEW);

  // 한 칸에 붓질 — 그림 모드에서만 브러시 크기/압력 보정을 적용한다.
  // 보석십자수는 실제 한 번의 탭이 정확히 한 알이어야 하므로
  // 브러시 크기·대칭·펜 압력과 무관하게 앵커 셀 하나만 처리한다.
  const paintCell = (x, y, pointerEvent = null) => {
    const px = activeFrame().pixels;
    if (gemMode && patternRef.current) {
      applyGemCell(px, patternRef.current, size, x, y, filterRef.current);
      return;
    }
    const effectiveBrushSize = pressureBrushSize(brushSize, pointerEvent);
    const cells = expandBrush([[x, y]], effectiveBrushSize);
    for (const [cx, cy] of cells) {
      if (cx < 0 || cy < 0 || cx >= size || cy >= size) continue;
      const i = cy * size + cx;
      if (tool === "eraser") {
        px[i] = null;
        if (mirrorX) px[cy * size + (size - 1 - cx)] = null;
        continue;
      }
      px[i] = color;
      if (mirrorX) px[cy * size + (size - 1 - cx)] = color;
    }
  };

  // ----- 도형 도구 -----
  const isShapeTool = (t) => t === "line" || t === "rect" || t === "ellipse";

  // 진행 중인 드래그의 셀 목록. 채움이 아닐 때만 브러시 두께를 적용한다.
  const shapeCells = (s) => {
    let pts;
    if (tool === "line") pts = linePoints(s.x0, s.y0, s.x1, s.y1);
    else if (tool === "rect") pts = rectPoints(s.x0, s.y0, s.x1, s.y1, shapeFilled);
    else pts = ellipsePoints(s.x0, s.y0, s.x1, s.y1, shapeFilled);
    const thick = tool === "line" || !shapeFilled;
    return thick ? expandBrush(pts, brushSize) : pts;
  };

  const paintPoints = (pts, value) => {
    const px = activeFrame().pixels;
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      px[y * size + x] = value;
      if (mirrorX) px[y * size + (size - 1 - x)] = value;
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    updatePointerInfo(e, true);
    // 멀티터치 추적: 2개 이상이면 그리기 대신 확대/이동 제스처.
    pointersRef.current.set(e.pointerId, viewPoint(e));
    if (pointersRef.current.size >= 2) {
      if (pointersRef.current.size === 2) beginGesture();
      return;
    }
    if (blockDrawRef.current) return;

    const cellPos = cellFromEvent(e);
    if (!cellPos) return;
    const [x, y] = cellPos;

    if (tool === "select") {
      setPlaying(false);
      const sel = selRectRef.current;
      if (sel && inRect(sel, x, y)) {
        // 선택 내부 드래그 = 이동. Alt+드래그 = 복사 이동 (원본 유지).
        pushUndo();
        const fr = activeFrame();
        const float = extractRect(fr.pixels, size, sel);
        if (!e.altKey) fr.pixels = clearRect(fr.pixels, size, sel);
        dragRef.current = {
          mode: "move", float, w: sel.w, h: sel.h,
          fx: sel.x, fy: sel.y, grabDX: x - sel.x, grabDY: y - sel.y,
        };
      } else {
        dragRef.current = { mode: "select", x0: x, y0: y, x1: x, y1: y };
        setSelRect(null);
      }
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 */ }
      bump();
      return;
    }
    if (isShapeTool(tool)) {
      // 확정은 up에서. 여기서는 미리보기만 시작한다(pushUndo도 up에서 1회).
      shapeRef.current = { x0: x, y0: y, x1: x, y1: y };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 */ }
      bump();
      return;
    }
    if (tool === "replace") {
      const from = activeFrame().pixels[y * size + x];
      if (from === null || from === color) return; // 빈 칸/같은 색은 무시
      pushUndo();
      activeFrame().pixels = replaceColor(activeFrame().pixels, from, color);
      noteColorUsed();
      bump();
      return;
    }
    if (tool === "picker") {
      const c = activeFrame().pixels[y * size + x];
      if (c) {
        setColor(c);
        setPalettes((s) => pushRecentColor(s, c));
      }
      return;
    }
    if (tool === "fill") {
      pushUndo();
      noteColorUsed();
      // 밑그림이 보이는 동안엔 도안 선(어두운 셀)이 채우기 경계가 된다.
      const barrier = showReference ? reference : null;
      activeFrame().pixels = floodFill(activeFrame().pixels, size, x, y, color, barrier);
      bump();
      return;
    }
    // 보석 모드에서 배경/필터 불일치/이미 완료된 칸을 누르면
    // 아무 변화도 없으므로 undo 스냅샷과 redo 무효화를 만들지 않는다.
    if (gemMode && patternRef.current && !canApplyGemCell(
      activeFrame().pixels, patternRef.current, size, x, y, filterRef.current
    )) return;
    // pen / eraser stroke
    pushUndo();
    if (tool === "pen") noteColorUsed();
    drawingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 */ }
    paintCell(x, y, e);
    bump();
  };

  const handlePointerMove = (e) => {
    // 펜 압력은 실제 셀 칠하기에만 사용한다. 매 이동마다 React 상태를 갱신하면
    // 고주파 Pointer Move에서 캔버스 입력이 끊길 수 있으므로 상태 배지는 down 때만 갱신한다.
    // 제스처 중이면 뷰만 갱신하고 그리기는 건너뛴다.
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, viewPoint(e));
    }
    if (gestureRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const { dist, mid } = pointerSpan(a, b);
      const w = wrapWidth();
      if (w) setView(pinchView(gestureRef.current, dist, mid, w));
      return;
    }

    // 도형 드래그: 끝점만 갱신하고 오버레이 미리보기를 다시 그린다.
    if (shapeRef.current) {
      const p = cellFromEventClamped(e);
      if (!p) return;
      shapeRef.current.x1 = p[0];
      shapeRef.current.y1 = p[1];
      bump();
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const p = cellFromEventClamped(e);
      if (!p) return;
      const [x, y] = p;
      if (drag.mode === "select") {
        drag.x1 = x;
        drag.y1 = y;
      } else {
        // 플로트가 캔버스에 일부라도 걸치도록 느슨하게 클램프.
        drag.fx = clamp(x - drag.grabDX, -(drag.w - 1), size - 1);
        drag.fy = clamp(y - drag.grabDY, -(drag.h - 1), size - 1);
      }
      bump();
      return;
    }
    if (!drawingRef.current) return;
    const cellPos = cellFromEvent(e);
    if (!cellPos) return;
    paintCell(cellPos[0], cellPos[1], e);
    bump();
  };

  const handlePointerUp = (e) => {
    if (e && e.pointerId !== undefined) pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
    // 손가락이 모두 떨어져야 다시 그릴 수 있다 (제스처 후 한 손가락만 남아 선이 그어지는 것 방지).
    if (pointersRef.current.size === 0) blockDrawRef.current = false;
    else if (blockDrawRef.current) return;

    // 도형 확정: 미리보기 셀을 실제로 찍는다 (undo 1회).
    if (shapeRef.current) {
      const cells = shapeCells(shapeRef.current);
      shapeRef.current = null;
      pushUndo();
      paintPoints(cells, color);
      noteColorUsed();
      bump();
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      dragRef.current = null;
      if (drag.mode === "select") {
        setSelRect(normalizeRect(drag.x0, drag.y0, drag.x1, drag.y1));
      } else {
        // 이동/복사 확정: 플로트를 현재 위치에 스탬프.
        const fr = activeFrame();
        fr.pixels = stampPixels(fr.pixels, size, drag.float, drag.w, drag.h, drag.fx, drag.fy);
        setSelRect({ x: drag.fx, y: drag.fy, w: drag.w, h: drag.h });
      }
      bump();
      return;
    }
    drawingRef.current = false;
  };

  // ----- selection ops (픽셀을 바꾸는 조작은 모두 현재 프레임 undo 대상) -----
  const clearSelection = () => {
    setSelRect(null);
    dragRef.current = null;
  };
  // 도구 전환 헬퍼 — 선택 도구를 떠나면 선택 해제.
  // 모드가 허용하지 않는 도구는 무시한다(보석 모드에서 단축키로 지우개가 켜지는 사고 방지).
  const pickTool = (t) => {
    if (!allowsTool(modeRef.current, t)) return;
    setTool(t);
    shapeRef.current = null; // 진행 중 도형 미리보기 폐기
    if (t !== "select") clearSelection();
  };

  // ----- 모드 진입/전환 -----
  // 그림 데이터(프레임·도안·팔레트)는 그대로 두고 화면 구성만 바꾼다 → 오가도 작업이 안 날아간다.
  const enterMode = (id) => {
    setMode(id);
    modeRef.current = id;
    lastModeRef.current = id;
    setDrawerOpen(false);
    setMoreTools(false);
    setTool("pen");
    shapeRef.current = null;
    clearSelection();
    setGemMode(MODES[id].gem);
    if (!MODES[id].gem) setPatternFilter(null);
    // 이미 완성된 도안을 다시 열 때 컨페티가 터지지 않도록 현재 상태를 기준으로 맞춘다.
    const p = patternProgress(patternRef.current, framesRef.current[frameIndexRef.current]?.pixels);
    wasDoneRef.current = !!p && p.total > 0 && p.done === p.total;
    setCelebrating(false);
    setPlaying(false);
    setView(FIT_VIEW);
    bump();
  };
  const leaveMode = () => {
    setDrawerOpen(false);
    setPlaying(false);
    setMode(null);
  };
  const flipSelection = () => {
    const sel = selRectRef.current;
    if (!sel) return;
    pushUndo();
    const fr = activeFrame();
    const data = extractRect(fr.pixels, size, sel);
    fr.pixels = stampPixels(
      clearRect(fr.pixels, size, sel), size,
      flipX(data, sel.w, sel.h), sel.w, sel.h, sel.x, sel.y
    );
    bump();
  };
  const duplicateSelection = () => {
    const sel = selRectRef.current;
    if (!sel) return;
    pushUndo();
    const fr = activeFrame();
    const data = extractRect(fr.pixels, size, sel);
    // (+1,+1) 위치에 복사본을 찍고 선택을 복사본으로 옮긴다 → 바로 드래그로 이동 가능.
    const nx = clamp(sel.x + 1, -(sel.w - 1), size - 1);
    const ny = clamp(sel.y + 1, -(sel.h - 1), size - 1);
    fr.pixels = stampPixels(fr.pixels, size, data, sel.w, sel.h, nx, ny);
    setSelRect({ x: nx, y: ny, w: sel.w, h: sel.h });
    bump();
  };
  const deleteSelection = () => {
    const sel = selRectRef.current;
    if (!sel) return;
    pushUndo();
    const fr = activeFrame();
    fr.pixels = clearRect(fr.pixels, size, sel);
    bump();
  };

  // ----- actions -----
  const applyClearCanvas = () => {
    pushUndo();
    activeFrame().pixels = makeGrid(size);
    bump();
  };

  const clearCanvas = () => setPendingDestructiveAction({ type: "clear" });

  const applySizeChange = (s) => {
    // 크기 변경은 전체 초기화 (단일 빈 프레임 + 히스토리 리셋).
    clearSelection();
    framesRef.current = [{ pixels: makeGrid(s), history: createHistory() }];
    setCurrentFrame(0);
    frameIndexRef.current = 0;
    setPlaying(false);
    // 참조: 출처가 세션에 있으면 새 크기로 재생성, 없으면 해제.
    if (refSource?.type === "image") setReference(sampleReference(refSource.img, s));
    else if (refSource?.type === "template") setReference(templateToReference(TEMPLATES[refSource.index], s));
    else setReference(null);
    // 도안은 크기 종속 → 해제.
    setPattern(null);
    patternRef.current = null;
    setPatternFilter(null);
    filterRef.current = null;
    setView(FIT_VIEW);
    setSize(s);
    bump();
  };

  const changeSize = (s) => {
    if (s === size) return;
    setPendingDestructiveAction({ type: "resize", size: s });
  };

  const allPixels = () => framesRef.current.map((f) => f.pixels);

  const projectData = () => ({
    size,
    frames: allPixels(),
    currentFrame,
    color,
    palettes,
    reference,
    refOpacity,
    pattern,
    mode: mode ?? lastModeRef.current,
  });

  const hasMeaningfulWork = () =>
    framesRef.current.some((frame) => frame.pixels.some(Boolean)) ||
    reference?.some((value) => value !== null) ||
    pattern?.some(Boolean);

  const refreshLibrary = () => setLibraryItems(listLibraryItems());

  const openLibrary = () => {
    refreshLibrary();
    setDrawerOpen(false);
    setLibraryOpen(true);
  };

  const startFreshWork = (id) => {
    const freshSize = DEFAULT_SIZE;
    clearSelection();
    framesRef.current = [{ pixels: makeGrid(freshSize), history: createHistory() }];
    frameIndexRef.current = 0;
    setCurrentFrame(0);
    setSize(freshSize);
    setColor(DEFAULT_COLOR);
    setReference(null);
    setRefSource(null);
    setRefOpacity(1);
    setShowReference(true);
    setPattern(null);
    patternRef.current = null;
    setPatternFilter(null);
    filterRef.current = null;
    setPalettes(normalizePaletteState(null));
    setPaletteEdit(false);
    setPlaying(false);
    setView(FIT_VIEW);
    setMode(id);
    modeRef.current = id;
    lastModeRef.current = id;
    setGemMode(MODES[id].gem);
    setTool("pen");
    setDrawerOpen(false);
    setMoreTools(false);
    setCelebrating(false);
    wasDoneRef.current = false;
    setCurrentLibraryId(null);
    bump();
    setNotice({ text: "새 작품을 시작했어요. 마음에 들면 보관함에 저장해요!", error: false });
  };

  const requestNewWork = (id) => {
    if (hasMeaningfulWork()) {
      setPendingNewMode(id);
      return;
    }
    startFreshWork(id);
  };

  const openLibrarySave = (afterNewMode = null) => {
    const saved = currentLibraryId ? loadLibraryItem(currentLibraryId) : null;
    setLibraryName(saved?.name ?? "내 그림");
    setLibrarySaveError(null);
    setLibrarySave({ afterNewMode });
  };

  const saveToLibrary = (overwrite) => {
    const saveFlow = librarySave;
    const id = overwrite && currentLibraryId ? currentLibraryId : createLibraryId();
    const data = projectData();
    let thumb;
    try {
      thumb = makeLibraryThumb(data.frames[data.currentFrame], data.size);
    } catch {
      setLibrarySaveError("미리보기를 만들지 못했어요. 다시 시도해 주세요.");
      return;
    }

    const result = saveLibraryItem({ id, name: libraryName, thumb, data });
    if (!result.ok) {
      const messages = {
        quota: "저장 공간이 부족해요. 보관함에서 필요 없는 작품을 지운 뒤 다시 저장해요.",
        limit: "내 작품은 20개까지 보관할 수 있어요. 필요 없는 작품을 지우고 다시 저장해요.",
        unavailable: "이 브라우저에서는 보관함을 사용할 수 없어요.",
        invalid: "작품을 저장할 수 없어요. 다시 시도해 주세요.",
      };
      setLibrarySaveError(messages[result.reason] ?? messages.invalid);
      return;
    }

    setCurrentLibraryId(id);
    refreshLibrary();
    setLibrarySave(null);
    if (saveFlow?.afterNewMode) {
      startFreshWork(saveFlow.afterNewMode);
      return;
    }
    setNotice({ text: `“${result.item.name}”을(를) 내 작품에 저장했어요.`, error: false });
  };

  const restoreProjectData = (data, message) => {
    // 상태 복원 + undo 히스토리 초기화.
    clearSelection();
    framesRef.current = data.frames.map((px) => ({ pixels: px, history: createHistory() }));
    frameIndexRef.current = data.currentFrame;
    setCurrentFrame(data.currentFrame);
    setSize(data.size);
    setColor(data.color);
    setReference(data.reference);
    setRefSource(null); // 파일/보관함에는 밑그림 원본(이미지/도안 출처)이 없다.
    setRefOpacity(data.refOpacity);
    setShowReference(true);
    setPattern(data.pattern);
    patternRef.current = data.pattern;
    setPatternFilter(null);
    filterRef.current = null;
    setPalettes(data.palettes);
    setPaletteEdit(false);
    setPlaying(false);
    setView(FIT_VIEW);
    setMode(data.mode);
    modeRef.current = data.mode;
    lastModeRef.current = data.mode;
    setGemMode(MODES[data.mode].gem);
    setTool("pen");
    setDrawerOpen(false);
    setCelebrating(false);
    const progress = patternProgress(data.pattern, data.frames[data.currentFrame]);
    wasDoneRef.current = !!progress && progress.total > 0 && progress.done === progress.total;
    bump();
    // 디바운스를 기다리지 않고 "작업 중" 자동저장 슬롯도 최신 상태로 맞춘다.
    saveState(data);
    setNotice({ text: message, error: false });
  };

  const openLibraryItem = (item) => {
    const saved = loadLibraryItem(item.id);
    if (!saved) {
      refreshLibrary();
      setNotice({ text: "이 작품을 찾지 못했어요. 목록을 새로 고쳤습니다.", error: true });
      return;
    }
    if (saved.id !== currentLibraryId && hasMeaningfulWork()) {
      const shouldOpen = window.confirm(
        "지금 작업 중인 그림이 있어요. 보관함에 먼저 저장하지 않으면 다른 작품을 열 때 바뀔 수 있어요.\n\n확인: 다른 작품 열기 / 취소: 돌아가기"
      );
      if (!shouldOpen) return;
    }
    restoreProjectData(saved.data, `“${saved.name}”을(를) 열었어요. 이어서 그려요!`);
    setCurrentLibraryId(saved.id);
    setLibraryOpen(false);
  };

  const removeLibraryItem = (item) => {
    if (!window.confirm(`“${item.name}”을(를) 내 작품에서 지울까요? 이 작업은 되돌릴 수 없어요.`)) return;
    const result = deleteLibraryItem(item.id);
    if (!result.ok) {
      setNotice({ text: "작품을 지우지 못했어요. 다시 시도해 주세요.", error: true });
      return;
    }
    if (item.id === currentLibraryId) setCurrentLibraryId(null);
    refreshLibrary();
  };

  const handleExport = () => exportSheet(allPixels(), size, exportScale);

  // 시트 PNG + 프레임 좌표/FPS가 담긴 JSON 메타를 함께 저장.
  const handleExportMeta = () => {
    const meta = exportSheetWithMeta(allPixels(), size, exportScale, fps);
    setNotice({
      text: `시트+메타 저장 — ${meta.frameCount}프레임 · ${meta.sheetWidth}×${meta.sheetHeight}px · ${meta.fps}fps`,
      error: false,
    });
  };

  // 애니메이션 GIF (무의존 인코더). 색이 255개를 넘으면 예외 → 안내.
  const handleGif = () => {
    try {
      const bytes = exportGif(allPixels(), size, { scale: exportScale, fps });
      setNotice({
        text: `GIF 저장 — ${framesRef.current.length}프레임 · ${fps}fps · ${(bytes / 1024).toFixed(1)}KB`,
        error: false,
      });
    } catch (e) {
      setNotice({ text: `GIF 저장 실패 — ${e.message}`, error: true });
    }
  };

  const handleCopy = async () => {
    const done = await copyFrameToClipboard(activeFrame().pixels, size, exportScale);
    setNotice(
      done
        ? { text: `현재 프레임을 클립보드에 복사했어요 (${size * exportScale}×${size * exportScale}px).`, error: false }
        : { text: "클립보드 이미지 복사를 지원하지 않는 브라우저예요.", error: true }
    );
  };

  // ----- project save/load (.emberpix) -----
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleProjectSave = () =>
    saveProjectFile({
      size,
      frames: framesRef.current.map((f) => f.pixels),
      currentFrame,
      color,
      palettes,
      palette: activeColors(palettes), // 평면 형태도 함께 (v1 호환 · 외부 도구용)
      reference,
      refOpacity,
      pattern,
      mode: mode ?? lastModeRef.current,
    });

  const handleProjectLoad = async (file) => {
    if (!file) return;
    let data = null;
    try {
      data = parseProject(await file.text());
    } catch {
      data = null;
    }
    if (!data) {
      setNotice({ text: "불러오기 실패 — 손상되었거나 .emberpix 형식이 아닙니다.", error: true });
      return;
    }
    // 외부 파일은 특정 보관함 항목과 연결하지 않는다. 이후 저장은 새 작품으로 안내한다.
    setCurrentLibraryId(null);
    restoreProjectData(data, `불러오기 완료 — ${data.size}×${data.size}, 프레임 ${data.frames.length}개`);
  };

  // ----- coloring reference -----
  const loadReference = async (file) => {
    if (!file) return;
    try {
      const img = await imageFromFile(file);
      setRefSource({ type: "image", img });
      setReference(sampleReference(img, size));
      setShowReference(true);
    } catch {
      // 이미지가 아니거나 손상된 파일 — 조용히 무시.
    }
  };
  const applyTemplate = (index) => {
    setRefSource({ type: "template", index });
    setReference(templateToReference(TEMPLATES[index], size));
    setShowReference(true);
  };
  const clearReference = () => {
    setRefSource(null);
    setReference(null);
  };

  // ----- 팔레트 관리 -----
  const paletteList = allPalettes(palettes);
  const paletteIndex = activePaletteIndex(palettes);
  const swatches = activeColors(palettes);
  const canEditPalette = isEditable(palettes);

  const pickPalette = (i) => {
    setPalettes((s) => setActivePalette(s, i));
    setPaletteEdit(false);
  };
  const newPaletteFromCurrent = () => {
    if (palettes.user.length >= MAX_PALETTES) {
      setNotice({ text: `팔레트는 최대 ${MAX_PALETTES}개까지 만들 수 있어요.`, error: true });
      return;
    }
    // 지금 색 하나로 시작하는 빈 팔레트 — 여기에 색을 계속 추가한다.
    setPalettes((s) => addPalette(s, `팔레트 ${s.user.length + 1}`, [color]));
    setPaletteEdit(false);
  };
  const copyPalette = () => {
    if (palettes.user.length >= MAX_PALETTES) {
      setNotice({ text: `팔레트는 최대 ${MAX_PALETTES}개까지 만들 수 있어요.`, error: true });
      return;
    }
    setPalettes((s) => duplicateActivePalette(s));
    setPaletteEdit(false);
  };
  const deletePalette = () => {
    setPalettes((s) => removePalette(s, activePaletteIndex(s)));
    setPaletteEdit(false);
  };
  const addCurrentColor = () => {
    if (swatches.length >= MAX_COLORS) {
      setNotice({ text: `한 팔레트에는 색 ${MAX_COLORS}개까지 담을 수 있어요.`, error: true });
      return;
    }
    setPalettes((s) => addColorToActive(s, color));
  };
  // 스와치 클릭 — 편집 모드면 삭제, 아니면 현재 색으로 선택.
  const onSwatch = (c) => {
    if (paletteEdit && canEditPalette) {
      setPalettes((s) => removeColorFromActive(s, c));
      return;
    }
    setColor(c);
    if (tool === "eraser") pickTool("pen");
  };

  // 이미지에서 대표색 추출 → 새 팔레트 슬롯으로 저장 (M12 도안 생성과 같은 quantize.js).
  const extractPaletteFrom = async (file) => {
    if (!file) return;
    if (palettes.user.length >= MAX_PALETTES) {
      setNotice({ text: `팔레트는 최대 ${MAX_PALETTES}개까지 만들 수 있어요.`, error: true });
      return;
    }
    try {
      const img = await imageFromFile(file);
      const colors = extractPalette(img, extractCount);
      if (!colors.length) {
        setNotice({ text: "이미지에서 색을 찾지 못했어요 (전부 투명한 이미지?).", error: true });
        return;
      }
      const name = (file.name || "이미지").replace(/\.[^.]+$/, "");
      setPalettes((s) => addPalette(s, name, colors));
      setPaletteEdit(false);
      setNotice({ text: `팔레트 추출 완료 — 대표색 ${colors.length}개`, error: false });
    } catch {
      setNotice({ text: "이미지를 읽을 수 없어요.", error: true });
    }
  };

  // ----- 보석십자수 (도안 설정/해제) -----
  const setActivePattern = (pat) => {
    setPattern(pat);
    patternRef.current = pat;
    setPatternFilter(null);
    filterRef.current = null;
    setGemMode(true);
    setTool("pen");
    clearSelection();
  };
  // 현재 그림을 도안으로: 스냅샷을 도안으로 삼고 캔버스를 비운다 → 따라 채우기.
  const drawingToPattern = () => {
    const snap = activeFrame().pixels.slice();
    if (snap.every((c) => c === null)) {
      setNotice({ text: "먼저 그림을 그려야 도안으로 만들 수 있어요.", error: true });
      return;
    }
    pushUndo();
    activeFrame().pixels = makeGrid(size);
    setActivePattern(snap);
    bump();
  };
  const applyBuiltinPattern = (i) => {
    pushUndo();
    activeFrame().pixels = makeGrid(size);
    setActivePattern(BUILTIN_PATTERNS[i].make(size));
    bump();
  };
  const clearPattern = () => {
    setPattern(null);
    patternRef.current = null;
    setPatternFilter(null);
    filterRef.current = null;
  };

  const refreshPatternLibrary = () => setPatternLibraryItems(listPatternItems());
  const openPatternSave = () => {
    if (!pattern) return;
    setPatternName("내 보석 도안");
    setPatternSaveError(null);
    setPatternSave(true);
  };
  const saveCurrentPattern = () => {
    if (!pattern) return;
    let thumb;
    try {
      thumb = makePatternThumb(pattern, size);
    } catch {
      setPatternSaveError("미리보기를 만들지 못했어요. 다시 시도해 주세요.");
      return;
    }
    const result = savePatternItem({
      id: createPatternId(),
      name: patternName,
      size,
      pattern: pattern.slice(),
      thumb,
    });
    if (!result.ok) {
      const messages = {
        limit: "내 도안은 20개까지 보관할 수 있어요. 필요 없는 도안을 지워 주세요.",
        quota: "저장 공간이 부족해요. 필요 없는 도안을 지워 주세요.",
        unavailable: "이 브라우저에서는 도안 보관함을 사용할 수 없어요.",
        invalid: "도안을 저장할 수 없어요. 다시 시도해 주세요.",
      };
      setPatternSaveError(messages[result.reason] ?? messages.invalid);
      return;
    }
    refreshPatternLibrary();
    setPatternSave(false);
    setPatternSaveError(null);
    setNotice({ text: `“${result.item.name}” 도안을 내 도안에 저장했어요.`, error: false });
  };
  const openPatternItem = (item) => {
    if (item.size !== size) return;
    pushUndo();
    activeFrame().pixels = makeGrid(size);
    setActivePattern(item.pattern.slice());
    bump();
    setNotice({ text: `“${item.name}” 도안을 열었어요.`, error: false });
  };
  const removePatternItem = (item) => {
    if (!window.confirm(`“${item.name}” 도안을 내 도안에서 지울까요?`)) return;
    const result = deletePatternItem(item.id);
    if (!result.ok) {
      setNotice({ text: "도안을 지우지 못했어요. 다시 시도해 주세요.", error: true });
      return;
    }
    refreshPatternLibrary();
    setNotice({ text: result.removed ? `“${item.name}” 도안을 지웠어요.` : "이미 지워진 도안이에요.", error: false });
  };
  // 도안 전체를 한 번에 채우기(미리보기/포기용). 필터가 켜져 있으면 그 색만.
  const fillPattern = () => {
    if (!pattern) return;
    pushUndo();
    const px = activeFrame().pixels.slice();
    for (let i = 0; i < pattern.length; i++) {
      if (!pattern[i]) continue;
      if (patternFilter && pattern[i] !== patternFilter) continue;
      px[i] = pattern[i];
    }
    activeFrame().pixels = px;
    bump();
  };

  // 사진 → 컬러 도안 (M11 quantize.js 재사용). 캔버스는 비우고 도안만 남긴다.
  const patternFromImage = async (file) => {
    if (!file) return;
    try {
      const img = await imageFromFile(file);
      const pat = imageToPattern(img, size, patternColors);
      const beads = pat.filter(Boolean).length;
      if (!beads) {
        setNotice({ text: "도안을 만들 수 없어요 — 이미지가 비어 있거나 전부 투명합니다.", error: true });
        return;
      }
      pushUndo();
      activeFrame().pixels = makeGrid(size);
      setActivePattern(pat);
      bump();
      setNotice({
        text: `도안 생성 완료 — 색 ${new Set(pat.filter(Boolean)).size}개 · 보석 ${beads}알`,
        error: false,
      });
    } catch {
      setNotice({ text: "이미지를 읽을 수 없어요.", error: true });
    }
  };

  // 색 범례 — 색별 총/남은 개수. 도안이 있을 때만 계산한다.
  const legend = gemMode && pattern ? patternLegend(pattern, frames[currentFrame]?.pixels) : [];
  const toggleFilter = (c) => setPatternFilter((f) => (f === c ? null : c));
  const filterNext = () => setPatternFilter(nextUnfinishedColor(legend));

  // ----- frame ops (전환/구조 변경 시 선택 해제 — 좌표가 다른 프레임에 새면 안 됨) -----
  const switchFrame = (i) => {
    setPlaying(false);
    clearSelection();
    setCurrentFrame(i);
    frameIndexRef.current = i;
    bump();
  };
  const addFrame = () => {
    const i = frameIndexRef.current + 1;
    framesRef.current.splice(i, 0, { pixels: makeGrid(size), history: createHistory() });
    setPlaying(false);
    clearSelection();
    setCurrentFrame(i);
    frameIndexRef.current = i;
    bump();
  };
  const duplicateFrame = () => {
    const i = frameIndexRef.current + 1;
    framesRef.current.splice(i, 0, {
      pixels: activeFrame().pixels.slice(),
      history: createHistory(),
    });
    setPlaying(false);
    clearSelection();
    setCurrentFrame(i);
    frameIndexRef.current = i;
    bump();
  };
  const deleteFrame = () => {
    if (framesRef.current.length <= 1) return;
    const i = frameIndexRef.current;
    framesRef.current.splice(i, 1);
    const next = Math.min(i, framesRef.current.length - 1);
    setPlaying(false);
    clearSelection();
    setCurrentFrame(next);
    frameIndexRef.current = next;
    bump();
  };
  const reorderFrame = (to) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from == null || from === to) return;
    const arr = framesRef.current;
    const active = arr[frameIndexRef.current];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    const idx = arr.indexOf(active);
    setCurrentFrame(idx);
    frameIndexRef.current = idx;
    bump();
  };

  // keyboard shortcuts — deleteSelection이 size를 캡처하므로 size 변경 시 재등록.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === "b") pickTool("pen");
      else if (e.key === "e") pickTool("eraser");
      else if (e.key === "g") pickTool("fill");
      else if (e.key === "i") pickTool("picker");
      else if (e.key === "m") pickTool("select");
      else if (e.key === "l") pickTool("line");
      else if (e.key === "r") pickTool("rect");
      else if (e.key === "o") pickTool("ellipse");
      else if (e.key === "x") pickTool("replace");
      else if (e.key === "+" || e.key === "=") setBrushSize((n) => Math.min(4, n + 1));
      else if (e.key === "-" || e.key === "_") setBrushSize((n) => Math.max(1, n - 1));
      else if (e.key === "Escape") { clearSelection(); shapeRef.current = null; bump(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selRectRef.current) {
        e.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [size]);

  // ----- styles -----
  const FONT = "'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  const S = {
    // 화면 전체를 덮는 고정 셸 — 페이지 스크롤이 없으므로 캔버스가 밀리지 않는다.
    shell: {
      position: "absolute",
      inset: 0,
      background: UI.bg,
      color: UI.text,
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
      WebkitUserSelect: "none",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
    },
    topBar: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 10px",
      borderBottom: `1px solid ${UI.border}`,
      background: UI.panel,
    },
    // 캔버스 + 조작부를 담는 본문. 좁으면 세로로 쌓고, 넓으면 나란히 놓는다.
    main: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: wide ? "row" : "column",
    },
    // 캔버스 영역 — 남는 공간을 전부 먹고 가운데 정렬. min* 0이 있어야 flex가 줄어든다.
    stage: {
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
    },
    // 조작부 — 좁은 화면은 아래 띠, 넓은 화면은 오른쪽 기둥.
    bottom: wide
      ? {
          flexShrink: 0,
          width: sideWidth,
          borderLeft: `1px solid ${UI.border}`,
          background: UI.panel,
          padding: "10px 12px",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }
      : {
          flexShrink: 0,
          borderTop: `1px solid ${UI.border}`,
          background: UI.panel,
          padding: "8px 10px 10px",
        },
    // 태블릿처럼 폭이 남을 때 조작부가 흉하게 늘어나지 않도록 가운데로 모은다.
    barInner: { width: "100%", maxWidth: wide ? "none" : 620, margin: "0 auto" },
    // 아이용 큰 버튼(56px) — 자주 쓰는 도구/되돌리기에만 쓴다.
    bigBtn: (active, disabled) => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      flex: 1,
      minWidth: 56,
      height: 56,
      padding: 0,
      background: active ? UI.ember : UI.panelHi,
      color: active ? "#16130f" : disabled ? "#4a4d58" : UI.text,
      border: `1px solid ${active ? UI.emberDeep : UI.border}`,
      borderRadius: 8,
      cursor: disabled ? "default" : "pointer",
      fontSize: 11,
      fontWeight: 700,
      touchAction: "manipulation",
    }),
    // 서랍(고급 기능) — 화면 아래에서 올라오는 오버레이. 내부에서만 스크롤한다.
    scrim: {
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 20,
    },
    drawer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      // 넓은 화면에서 서랍이 화면 전체로 퍼지지 않게 가운데로 모은다.
      maxWidth: 720,
      margin: "0 auto",
      maxHeight: "82%",
      display: "flex",
      flexDirection: "column",
      background: UI.bg,
      borderTop: `1px solid ${UI.border}`,
      borderRadius: "12px 12px 0 0",
      zIndex: 21,
      paddingBottom: "env(safe-area-inset-bottom)",
    },
    drawerHead: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderBottom: `1px solid ${UI.border}`,
    },
    drawerBody: {
      overflowY: "auto",
      overscrollBehavior: "contain", // 서랍 끝에서 뒤 화면이 안 밀리게
      WebkitOverflowScrolling: "touch",
      padding: "10px 10px 4px",
    },
    // 시작 화면
    start: {
      position: "absolute",
      inset: 0,
      background: UI.bg,
      color: UI.text,
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      padding: 20,
      userSelect: "none",
      WebkitUserSelect: "none",
    },
    modeCard: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: "100%",
      maxWidth: 320,
      minHeight: 128,
      padding: 16,
      background: UI.panel,
      color: UI.text,
      border: `2px solid ${UI.border}`,
      borderRadius: 14,
      boxShadow: "4px 4px 0 rgba(0,0,0,0.35)",
      cursor: "pointer",
      fontFamily: FONT,
      touchAction: "manipulation",
    },
    header: {
      width: "100%",
      maxWidth: 560,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 4px 12px",
    },
    logo: {
      fontFamily: "'Courier New', monospace",
      fontWeight: 800,
      fontSize: 20,
      letterSpacing: 3,
      color: UI.text,
    },
    panel: {
      width: "100%",
      maxWidth: 560,
      background: UI.panel,
      border: `1px solid ${UI.border}`,
      borderRadius: 4,
      boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`,
      padding: 10,
      marginBottom: 12,
    },
    toolRow: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      alignItems: "center",
    },
    btn: (active, danger) => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minWidth: 40,
      height: 40,
      padding: "0 10px",
      background: active ? UI.ember : UI.panelHi,
      color: active ? "#16130f" : danger ? "#ff8a7a" : UI.text,
      border: `1px solid ${active ? UI.emberDeep : UI.border}`,
      borderRadius: 3,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      touchAction: "manipulation",
    }),
    canvasWrap: {
      // 실측한 정사각 한 변. 아직 못 쟀으면 폭 기준으로 시작한다(첫 프레임만 해당).
      width: square || "100%",
      height: square || undefined,
      aspectRatio: square ? undefined : "1",
      flexShrink: 0,
      position: "relative",
      overflow: "hidden",
      touchAction: "none",
      border: `1px solid ${UI.border}`,
      borderRadius: 4,
      boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`,
      background: UI.panel,
    },
    canvas: {
      width: "100%",
      height: "100%",
      display: "block",
      imageRendering: "pixelated",
      touchAction: "none",
      transformOrigin: "0 0",
      cursor: "crosshair",
    },
    paletteGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(8, 1fr)",
      gap: 6,
    },
    swatch: (c, active) => ({
      aspectRatio: "1",
      background: c,
      borderRadius: 3,
      border: active ? `2px solid ${UI.ember}` : `1px solid rgba(255,255,255,0.12)`,
      boxShadow: active ? `0 0 0 2px ${UI.bg}, 0 0 8px ${UI.ember}55` : "none",
      cursor: "pointer",
      padding: 0,
    }),
    label: { fontSize: 11, color: UI.dim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    select: {
      background: UI.panelHi,
      color: UI.text,
      border: `1px solid ${UI.border}`,
      borderRadius: 3,
      height: 36,
      padding: "0 8px",
      fontSize: 13,
    },
    thumb: (active) => ({
      flexShrink: 0,
      position: "relative",
      padding: 3,
      background: "#16171c",
      border: `2px solid ${active ? UI.ember : UI.border}`,
      borderRadius: 4,
      cursor: "pointer",
      lineHeight: 0,
    }),
    thumbNum: {
      position: "absolute",
      bottom: 1,
      right: 2,
      fontSize: 10,
      color: UI.dim,
      fontFamily: "monospace",
      textShadow: "0 0 2px #000",
    },
  };

  // short = 하단 큰 버튼에 붙는 한글 라벨 (아이콘만으로는 아이가 못 알아본다)
  const toolDefs = [
    { id: "pen", icon: "pen", label: "펜 (B)", short: "펜" },
    { id: "eraser", icon: "eraser", label: "지우개 (E)", short: "지우개" },
    { id: "fill", icon: "fill", label: "채우기 (G)", short: "채우기" },
    { id: "picker", icon: "picker", label: "스포이드 (I)", short: "색 집기" },
    { id: "line", icon: "line", label: "직선 (L)" },
    { id: "rect", icon: "rect", label: "사각형 (R)" },
    { id: "ellipse", icon: "circle", label: "원/타원 (O)" },
    { id: "replace", icon: "swap", label: "색 교체 (X) — 클릭한 색을 현재 색으로 전부 바꿈" },
    { id: "select", icon: "select", label: "선택 — 드래그로 영역 지정, 내부 드래그 이동, Alt+드래그 복사" },
  ];

  const prog = patternProgress(pattern, frames[currentFrame]?.pixels);
  const progDone = prog && prog.done === prog.total && prog.total > 0;

  // 보석 도안 저장 이름 화면.
  if (patternSave) {
    return (
      <div style={{ ...S.start, justifyContent: "center", gap: 16 }}>
        <div style={{ ...S.logo, fontSize: 28 }}>내 도안에 저장</div>
        <div style={{ width: "100%", maxWidth: 420, ...S.panel, marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>이 도안의 이름을 지어 주세요</div>
          <div style={{ fontSize: 12, color: UI.dim, marginBottom: 12 }}>생성된 도안과 미리보기만 이 기기에 저장해요. 원본 사진은 저장하지 않아요.</div>
          <label htmlFor="pattern-name" style={{ display: "block", fontSize: 12, color: UI.dim, marginBottom: 6 }}>도안 이름</label>
          <input
            id="pattern-name"
            data-testid="pattern-name"
            value={patternName}
            maxLength={40}
            autoFocus
            onChange={(e) => setPatternName(e.target.value)}
            style={{
              width: "100%", height: 44, boxSizing: "border-box", padding: "0 10px",
              background: UI.bg, color: UI.text, border: `1px solid ${UI.border}`,
              borderRadius: 4, fontFamily: FONT, fontSize: 16,
            }}
          />
          {patternSaveError && (
            <div role="alert" style={{ marginTop: 10, color: "#ff8a7a", fontSize: 12, lineHeight: 1.5 }}>
              {patternSaveError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button data-testid="pattern-save-primary" style={{ ...S.btn(true), flex: 1, height: 46 }} onClick={saveCurrentPattern}>
              <Icon name="download" size={17} color="#16130f" /> 저장
            </button>
            <button style={{ ...S.btn(false), flex: 1, height: 46 }} onClick={() => { setPatternSave(false); setPatternSaveError(null); }}>
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 보관함 저장은 현재 화면 위에 간단한 전용 화면으로 띄운다.
  // 이렇게 하면 평소 편집 화면은 복잡해지지 않고, 터치 버튼도 충분히 크게 유지된다.
  if (librarySave) {
    const hasLinkedWork = !!currentLibraryId;
    return (
      <div style={{ ...S.start, justifyContent: "center", gap: 16 }}>
        <div style={{ ...S.logo, fontSize: 28 }}>내 작품에 저장</div>
        <div style={{ width: "100%", maxWidth: 420, ...S.panel, marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>이 작품의 이름을 지어 주세요</div>
          <div style={{ fontSize: 12, color: UI.dim, marginBottom: 12 }}>저장하면 언제든 다시 열어서 이어 그릴 수 있어요.</div>
          <label htmlFor="library-name" style={{ display: "block", fontSize: 12, color: UI.dim, marginBottom: 6 }}>작품 이름</label>
          <input
            id="library-name"
            data-testid="library-name"
            value={libraryName}
            maxLength={40}
            autoFocus
            onChange={(e) => setLibraryName(e.target.value)}
            style={{
              width: "100%", height: 44, boxSizing: "border-box", padding: "0 10px",
              background: UI.bg, color: UI.text, border: `1px solid ${UI.border}`,
              borderRadius: 4, fontFamily: FONT, fontSize: 16,
            }}
          />
          {librarySaveError && (
            <div role="alert" style={{ marginTop: 10, color: "#ff8a7a", fontSize: 12, lineHeight: 1.5 }}>
              {librarySaveError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button
              data-testid="library-save-primary"
              style={{ ...S.btn(true), flex: 1, minWidth: 150, height: 46 }}
              onClick={() => saveToLibrary(hasLinkedWork)}
            >
              <Icon name="download" size={17} color="#16130f" />
              {hasLinkedWork ? "덮어써서 저장" : "내 작품에 저장"}
            </button>
            {hasLinkedWork && (
              <button style={{ ...S.btn(false), flex: 1, minWidth: 140, height: 46 }} onClick={() => saveToLibrary(false)}>
                새 작품으로 저장
              </button>
            )}
            <button
              style={{ ...S.btn(false), width: "100%", height: 40 }}
              onClick={() => { setLibrarySave(null); setLibrarySaveError(null); }}
            >
              취소
            </button>
          </div>
          {hasLinkedWork && (
            <div style={{ marginTop: 10, fontSize: 11, color: UI.dim, lineHeight: 1.5 }}>
              같은 작품을 고치고 있다면 덮어써요. 다른 버전도 남기고 싶다면 “새 작품으로 저장”을 눌러요.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (pendingNewMode) {
    const nextMode = MODES[pendingNewMode];
    return (
      <div style={{ ...S.start, justifyContent: "center", gap: 16 }}>
        <div style={{ ...S.logo, fontSize: 28 }}>새 작품 시작</div>
        <div style={{ width: "100%", maxWidth: 420, ...S.panel, marginBottom: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>지금 그림을 먼저 보관할까요?</div>
          <div style={{ fontSize: 13, color: UI.dim, lineHeight: 1.6 }}>
            새 {nextMode.name} 작품을 시작하면 지금 캔버스는 바뀌어요. 마음에 든 그림은 내 작품에 남겨 둘 수 있어요.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <button
              data-testid="new-work-save-first"
              style={{ ...S.btn(true), height: 48 }}
              onClick={() => {
                const afterNewMode = pendingNewMode;
                setPendingNewMode(null);
                openLibrarySave(afterNewMode);
              }}
            >
              <Icon name="download" size={18} color="#16130f" /> 먼저 보관함에 저장
            </button>
            <button
              data-testid="new-work-discard"
              style={{ ...S.btn(false), height: 46 }}
              onClick={() => {
                const next = pendingNewMode;
                setPendingNewMode(null);
                startFreshWork(next);
              }}
            >
              저장 안 하고 새로 시작
            </button>
            <button style={{ ...S.btn(false), height: 40 }} onClick={() => setPendingNewMode(null)}>취소</button>
          </div>
        </div>
      </div>
    );
  }

  if (libraryOpen) {
    return (
      <div style={{ ...S.start, justifyContent: "flex-start", gap: 14, padding: "20px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 720, display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ ...S.btn(false), minWidth: 48 }} onClick={() => setLibraryOpen(false)} title="돌아가기">
            <Icon name="back" size={19} />
          </button>
          <div style={{ ...S.logo, fontSize: 26, flex: 1 }}>내 작품</div>
          <span style={{ color: UI.dim, fontSize: 12 }}>{libraryItems.length}/20</span>
        </div>
        <div style={{ width: "100%", maxWidth: 720, color: UI.dim, fontSize: 13, lineHeight: 1.5 }}>
          저장한 그림을 골라 다시 이어 그려요.
        </div>
        {libraryItems.length === 0 ? (
          <div style={{ ...S.panel, maxWidth: 720, textAlign: "center", padding: "28px 16px", marginBottom: 0 }}>
            <Icon name="grid" size={34} color={UI.ember} />
            <div style={{ marginTop: 10, fontSize: 16, fontWeight: 800 }}>아직 저장한 작품이 없어요</div>
            <div style={{ marginTop: 6, fontSize: 12, color: UI.dim }}>그림을 만든 뒤 “보관함 저장”을 눌러 보세요.</div>
          </div>
        ) : (
          <div style={{
            width: "100%", maxWidth: 720, display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 10,
          }}>
            {libraryItems.map((item) => (
              <div key={item.id} data-testid={`library-item-${item.id}`} style={{
                background: UI.panel, border: `1px solid ${item.id === currentLibraryId ? UI.ember : UI.border}`,
                borderRadius: 8, padding: 8, boxShadow: "3px 3px 0 rgba(0,0,0,0.25)",
              }}>
                <img
                  src={item.thumb}
                  alt={`${item.name} 미리보기`}
                  style={{
                    display: "block", width: "100%", aspectRatio: "1", objectFit: "contain",
                    imageRendering: "pixelated", background: UI.bg, borderRadius: 4,
                  }}
                />
                <div title={item.name} style={{ marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 800 }}>
                  {item.name}
                </div>
                <div style={{ marginTop: 3, color: UI.dim, fontSize: 11 }}>
                  {item.size}×{item.size} · {savedAtLabel(item.updatedAt)}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button style={{ ...S.btn(true), height: 38, flex: 1, padding: "0 8px" }} onClick={() => openLibraryItem(item)}>
                    열기
                  </button>
                  <button style={{ ...S.btn(false, true), height: 38, minWidth: 40, padding: "0 8px" }} onClick={() => removeLibraryItem(item)} title="작품 지우기">
                    <Icon name="trash" size={16} color="#ff8a7a" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ----- 시작 화면 (모드 고르기) -----
  if (!mode) {
    // 지금 메모리에 있는 그림 기준 — 세션 중 나갔다 와도 정확히 표시된다.
    const hasSavedWork = hasMeaningfulWork();
    const savedMode = lastModeRef.current;
    return (
      <div style={{ ...S.start, justifyContent: "flex-start", overflowY: "auto", padding: "26px 20px" }}>
        <div style={{ ...S.logo, fontSize: 30 }}>
          EMBER<span style={{ color: UI.ember }}>PIX</span>
        </div>
        <div style={{ fontSize: 14, color: UI.dim, marginTop: -10 }}>그리던 그림을 이어가거나 새 작품을 시작해요!</div>
        <div data-testid="first-use-hint" style={{ fontSize: 13, color: UI.dim, marginTop: -8 }}>
          처음이라면 아래의 “그림 그리기”를 눌러 색을 고르고 톡톡 찍어 봐요!
        </div>
        <div style={{
          display: "flex", gap: 16, width: "100%", justifyContent: "center",
          flexDirection: wide ? "row" : "column", alignItems: "center",
        }}>
        {MODE_LIST.map((m) => {
          const resume = hasSavedWork && savedMode === m.id;
          return (
            <button
              key={m.id}
              style={{ ...S.modeCard, borderColor: resume ? UI.ember : UI.border }}
              onClick={() => enterMode(m.id)}
            >
              <Icon name={m.icon} size={40} color={UI.ember} />
              <div style={{ fontSize: 20, fontWeight: 800 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: UI.dim }}>{m.desc}</div>
              {resume && (
                <div style={{ fontSize: 11, color: UI.ember, fontWeight: 700 }}>
                  이어서 하기 · {size}×{size}
                </div>
              )}
            </button>
          );
        })}
        </div>
        <div style={{ ...S.panel, maxWidth: 660, marginBottom: 0, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>새 작품 시작</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MODE_LIST.map((m) => (
              <button
                key={`new-${m.id}`}
                data-testid={`new-work-${m.id}`}
                style={{ ...S.btn(false), flex: 1, minWidth: 140, height: 44 }}
                onClick={() => requestNewWork(m.id)}
              >
                <Icon name={m.icon} size={17} color={UI.ember} /> 새 {m.name}
              </button>
            ))}
          </div>
        </div>
        <button
          data-testid="library-open"
          style={{ ...S.modeCard, maxWidth: 660, minHeight: 74, flexDirection: "row", gap: 12 }}
          onClick={openLibrary}
        >
          <Icon name="grid" size={30} color={UI.ember} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>내 작품</div>
            <div style={{ fontSize: 12, color: UI.dim }}>저장한 그림 {libraryItems.length}개 · 다시 열어 이어 그리기</div>
          </div>
        </button>
      </div>
    );
  }

  const modeDef = MODES[mode];
  const quickTools = toolDefs.filter((t) => modeDef.quickTools.includes(t.id));
  const extraTools = toolDefs.filter(
    (t) => modeDef.tools.includes(t.id) && !modeDef.quickTools.includes(t.id)
  );
  const pendingIsResize = pendingDestructiveAction?.type === "resize";
  const pendingSize = pendingDestructiveAction?.size;
  const pendingTitle = pendingIsResize ? `캔버스를 ${pendingSize}×${pendingSize}로 바꿀까요?` : "지금 그림을 지울까요?";
  const pendingDescription = pendingIsResize
    ? "크기를 바꾸면 지금 그림, 프레임, 도안이 새 캔버스로 바뀌어요. 계속할까요?"
    : "잘못 누른 걸까요? 지운 그림은 바로 되돌리기로 다시 가져올 수 있어요.";
  const pendingConfirmLabel = pendingIsResize ? "크기 바꾸기" : "지우기";

  return (
    <div style={S.shell}>
      {/* 인라인 스타일로는 못 쓰는 키프레임만 여기에 (외부 CSS 라이브러리 없음) */}
      <style>{`@keyframes gemPop { 0%,100% { opacity:.55; transform:translateY(0) } 50% { opacity:1; transform:translateY(-2px) } }`}</style>

      {/* 상단 바 — 모드 나가기 / 제목 / 다시 실행 / 더보기 */}
      <div style={{ ...S.topBar, justifyContent: "center" }}>
        <div style={{ ...S.barInner, display: "flex", alignItems: "center", gap: 6 }}>
        <button style={{ ...S.btn(false), minWidth: 44 }} onClick={leaveMode} title="모드 바꾸기">
          <Icon name="back" size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={modeDef.icon} size={16} color={UI.ember} />
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{modeDef.name}</span>
          <span style={{ fontSize: 11, color: UI.dim, fontFamily: "monospace" }}>{size}×{size}</span>
        </div>
        <button style={{ ...S.btn(false), minWidth: 44 }} onClick={redo} disabled={!redoLen} title="다시 실행 (Ctrl+Shift+Z)">
          <Icon name="redo" size={18} color={redoLen ? UI.text : "#4a4d58"} />
        </button>
        <button style={{ ...S.btn(drawerOpen), minWidth: 52 }} onClick={() => setDrawerOpen((v) => !v)} title="더보기 — 크기·프레임·내보내기 등">
          <Icon name="more" size={18} color={drawerOpen ? "#16130f" : UI.text} />
        </button>
        </div>
      </div>

      {/* 안내 배너 — 프로젝트/팔레트/내보내기 결과를 한곳에서 알린다 (4초 후 사라짐) */}
      {notice && (
        <div style={{
          flexShrink: 0, padding: "7px 12px", fontSize: 12,
          color: notice.error ? "#ff8a7a" : UI.text,
          background: notice.error ? "#2a1614" : UI.panelHi,
          borderBottom: `1px solid ${UI.border}`,
        }}>
          {notice.text}
        </div>
      )}

      {/* 본문 — 좁으면 캔버스 위/조작부 아래, 넓으면 캔버스 왼쪽/조작부 오른쪽 */}
      <div style={S.main}>
      {/* canvas — 남는 공간을 전부 차지한다 */}
      <div ref={stageRef} style={S.stage}>
        <div ref={wrapRef} style={S.canvasWrap}>
          <canvas
            ref={canvasRef}
            style={{ ...S.canvas, transform: cssTransform(view) }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {/* 조작부 — 모드마다 다르다 */}
      <div style={S.bottom}>
      <div style={S.barInner}>
        {mode === MODE_DRAW ? (
          <>
            <div style={{ display: "flex", gap: 6 }}>
              {quickTools.map((t) => (
                <button key={t.id} style={S.bigBtn(tool === t.id)} onClick={() => pickTool(t.id)} title={t.label}>
                  <Icon name={t.icon} size={22} color={tool === t.id ? "#16130f" : UI.text} />
                  {t.short}
                </button>
              ))}
              <button style={S.bigBtn(false, !undoLen)} onClick={undo} disabled={!undoLen} title="실행 취소 (Ctrl+Z)">
                <Icon name="undo" size={22} color={undoLen ? UI.text : "#4a4d58"} />
                되돌리기
              </button>
            </div>

            {/* 확장 도구(도형·선택·색교체)는 필요할 때만 펼친다 */}
            <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
              <button
                style={{ ...S.btn(moreTools), height: 34, fontSize: 12 }}
                onClick={() => setMoreTools((v) => !v)}
                title="도형·선택 같은 확장 도구 보기"
              >
                도구 {moreTools ? "접기" : "더"}
              </button>
              {moreTools ? extraTools.map((t) => (
                <button key={t.id} style={{ ...S.btn(tool === t.id), height: 34, minWidth: 38 }} onClick={() => pickTool(t.id)} title={t.label}>
                  <Icon name={t.icon} size={17} color={tool === t.id ? "#16130f" : UI.text} />
                </button>
              )) : (
                <>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: UI.dim }}>색을 골라 캔버스를 톡톡</span>
                </>
              )}
            </div>

            {moreTools && (
              <div style={{ ...S.toolRow, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: UI.dim, letterSpacing: 1 }}>브러시</span>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    style={{ ...S.btn(brushSize === n), height: 30, minWidth: 30, padding: 0 }}
                    onClick={() => setBrushSize(n)}
                    title={`${n}×${n} 브러시`}
                  >
                    {n}
                  </button>
                ))}
                {(tool === "rect" || tool === "ellipse") && (
                  <button
                    style={{ ...S.btn(shapeFilled), height: 30 }}
                    onClick={() => setShapeFilled((v) => !v)}
                    title="도형 내부 채우기"
                  >
                    {shapeFilled ? "채움" : "테두리"}
                  </button>
                )}
                <button style={{ ...S.btn(showGrid), height: 30, minWidth: 34 }} onClick={() => setShowGrid(!showGrid)} title="그리드">
                  <Icon name="grid" size={15} color={showGrid ? "#16130f" : UI.text} />
                </button>
                <button style={{ ...S.btn(mirrorX), height: 30, minWidth: 34 }} onClick={() => setMirrorX(!mirrorX)} title="좌우 대칭 그리기">
                  <Icon name="mirror" size={15} color={mirrorX ? "#16130f" : UI.text} />
                </button>
              </div>
            )}

            {/* 선택 조작 (선택이 있을 때만) */}
            {selRect && (
              <div style={{ ...S.toolRow, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: UI.dim, fontFamily: "monospace" }}>
                  선택 {selRect.w}×{selRect.h}
                </span>
                <div style={{ flex: 1 }} />
                <button style={{ ...S.btn(false), height: 32 }} onClick={flipSelection} title="선택 영역 좌우반전">
                  <Icon name="mirror" size={15} /> 반전
                </button>
                <button style={{ ...S.btn(false), height: 32 }} onClick={duplicateSelection} title="선택 영역 복제 (Alt+드래그 = 복사 이동)">
                  <Icon name="copy" size={15} /> 복제
                </button>
                <button style={{ ...S.btn(false, true), height: 32 }} onClick={deleteSelection} title="선택 영역 지우기 (Delete)">
                  <Icon name="trash" size={15} color="#ff8a7a" />
                </button>
                <button style={{ ...S.btn(false), height: 32 }} onClick={clearSelection} title="선택 해제 (Esc)">
                  해제
                </button>
              </div>
            )}

            {/* 팔레트 — 아이는 여기서 색만 고르면 된다 */}
            <div style={{ ...S.paletteGrid, marginTop: 8 }}>
              {swatches.map((c) => (
                <button
                  key={c}
                  style={{ ...S.swatch(c, color === c && tool !== "eraser"), minHeight: 34 }}
                  onClick={() => { setColor(c); if (tool === "eraser") pickTool("pen"); }}
                  title={c}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* 보석 모드 — 펜 고정. 진행률 + 색 고르기 + 되돌리기만 남긴다 */}
            {prog ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon name="gem" size={14} color={progDone ? UI.ember : UI.dim} />
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: progDone ? UI.ember : UI.dim }}>
                    {prog.done} / {prog.total}
                  </span>
                  {progDone && (
                    <button
                      onClick={() => { setCelebrating(false); setTimeout(() => setCelebrating(true), 0); }}
                      title="다시 축하하기"
                      style={{
                        fontSize: 12, color: UI.ember, fontWeight: 700, padding: "2px 6px",
                        background: "transparent", border: "none", cursor: "pointer",
                      }}
                    >
                      완성! ✨
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  <button
                    style={{ ...S.btn(false), height: 32, fontSize: 11 }}
                    onClick={filterNext}
                    disabled={!nextUnfinishedColor(legend)}
                    title="아직 남은 색 중 개수가 가장 많은 색으로"
                  >
                    다음 색
                  </button>
                  <button
                    style={{ ...S.btn(!patternFilter), height: 32, fontSize: 11 }}
                    onClick={() => setPatternFilter(null)}
                    title="모든 색 놓기"
                  >
                    전체
                  </button>
                  <button style={{ ...S.btn(false), height: 32, minWidth: 38 }} onClick={undo} disabled={!undoLen} title="되돌리기 (Ctrl+Z)">
                    <Icon name="undo" size={16} color={undoLen ? UI.text : "#4a4d58"} />
                  </button>
                </div>
                <div style={{ height: 6, background: UI.panelHi, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{
                    height: "100%",
                    width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%`,
                    background: UI.ember, transition: "width 0.15s",
                  }} />
                </div>
                {/* 색 고르기 — 큰 동그라미, 가로 스크롤 */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", overscrollBehavior: "contain", paddingBottom: 4 }}>
                  {legend.map((e) => {
                    const done = e.done >= e.total;
                    const on = patternFilter === e.color;
                    return (
                      <button
                        key={e.color}
                        onClick={() => toggleFilter(e.color)}
                        title={`${e.color} — 남은 ${e.total - e.done}알 / 총 ${e.total}알`}
                        style={{
                          flexShrink: 0, width: 58, padding: "6px 0",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          background: on ? UI.panelHi : "transparent",
                          border: `2px solid ${on ? UI.ember : "transparent"}`,
                          borderRadius: 10, cursor: "pointer",
                          opacity: done && !on ? 0.45 : 1,
                        }}
                      >
                        <span style={{
                          width: 32, height: 32, borderRadius: "50%", background: e.color,
                          border: "2px solid rgba(255,255,255,0.25)",
                        }} />
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: done ? UI.ember : UI.text }}>
                          {done ? "완료" : e.total - e.done}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontSize: 12, color: UI.dim, lineHeight: 1.5 }}>
                  도안을 고르면 흐린 점 위를 눌러 보석을 채워요.
                </div>
                <button style={{ ...S.btn(true), height: 44, fontSize: 13 }} onClick={() => setDrawerOpen(true)}>
                  <Icon name="gem" size={18} color="#16130f" /> 도안 고르기
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
      </div>

      {/* 입력 상태 — 펜/터치가 실제로 들어온 경우에만 표시 */}
      {pointerInfo && (
        <div data-testid="pointer-status" style={{
          position: "absolute", left: 10, bottom: 10, zIndex: 5,
          padding: "5px 8px", borderRadius: 4, background: "rgba(20,21,25,0.82)",
          color: pointerInfo.type === "pen" ? UI.ember : UI.dim,
          fontSize: 11, pointerEvents: "none",
        }}>
          {pointerInfo.label}{pointerInfo.pressure == null ? "" : ` · ${Math.round(pointerInfo.pressure * 100)}%`}
        </div>
      )}

      {/* 완성 컨페티 — 화면 전체를 덮되 터치는 통과시킨다 */}
      {celebrating && (
        <canvas
          ref={confettiRef}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none", zIndex: 30,
          }}
        />
      )}

      {/* ----- 더보기 서랍 (고급 기능은 전부 여기에) ----- */}
      {drawerOpen && (
        <>
          <div style={S.scrim} onClick={() => setDrawerOpen(false)} />
          <div style={S.drawer}>
            <div style={S.drawerHead}>
              <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>더보기</div>
              <select data-testid="canvas-size-select" style={S.select} value={size} onChange={(e) => changeSize(Number(e.target.value))} title="캔버스 크기 (바꾸면 새로 시작)">
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}×{s}</option>
                ))}
              </select>
              <button data-testid="clear-canvas" style={{ ...S.btn(false, true), height: 36 }} onClick={clearCanvas} title="전체 지우기">
                <Icon name="trash" size={16} color="#ff8a7a" />
              </button>
              <button style={{ ...S.btn(false), height: 36 }} onClick={() => setDrawerOpen(false)}>닫기</button>
            </div>
            <div style={S.drawerBody}>

      {/* zoom controls */}
      <div style={{ ...S.panel, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>확대 · 두 손가락으로 확대/이동</div>
        <button
          style={{ ...S.btn(false), height: 34 }}
          onClick={() => applyZoom(1 / 1.5)}
          disabled={view.scale <= MIN_SCALE}
          title="축소"
        >
          −
        </button>
        <span style={{ fontSize: 12, color: UI.dim, fontFamily: "monospace", width: 46, textAlign: "center" }}>
          {view.scale.toFixed(1)}×
        </span>
        <button
          style={{ ...S.btn(false), height: 34 }}
          onClick={() => applyZoom(1.5)}
          disabled={view.scale >= MAX_SCALE}
          title="확대"
        >
          +
        </button>
        <button
          style={{ ...S.btn(false), height: 34 }}
          onClick={resetView}
          disabled={view.scale === 1 && view.tx === 0 && view.ty === 0}
          title="화면 맞춤"
        >
          맞춤
        </button>
      </div>

      {/* frames — 애니메이션은 그림 모드에서만 (보석십자수는 한 장짜리다) */}
      {mode === MODE_DRAW && (
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>프레임 · {frames.length}</div>
          <button style={{ ...S.btn(playing), height: 32, minWidth: 32 }} onClick={() => { clearSelection(); setPlaying((p) => !p); }} title={playing ? "정지" : "재생"}>
            <Icon name={playing ? "stop" : "play"} color={playing ? "#16130f" : UI.text} size={16} />
          </button>
          <input
            type="range" min={1} max={24} value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            style={{ width: 90, margin: "0 8px", accentColor: UI.ember }}
            title="재생 속도"
          />
          <span style={{ fontSize: 12, color: UI.dim, fontFamily: "monospace", width: 46 }}>{fps} fps</span>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {frames.map((f, i) => (
            <div
              key={i}
              style={S.thumb(i === currentFrame)}
              onClick={() => switchFrame(i)}
              draggable
              onDragStart={() => (dragIndexRef.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorderFrame(i)}
              title={`프레임 ${i + 1} (드래그로 순서 변경)`}
            >
              <FrameThumb pixels={f.pixels} size={size} rev={version} />
              <span style={S.thumbNum}>{i + 1}</span>
            </div>
          ))}
        </div>

        <div style={{ ...S.toolRow, marginTop: 8 }}>
          <button style={{ ...S.btn(false), height: 34 }} onClick={addFrame} title="프레임 추가">
            <Icon name="plus" size={16} /> 추가
          </button>
          <button style={{ ...S.btn(false), height: 34 }} onClick={duplicateFrame} title="현재 프레임 복제">
            <Icon name="copy" size={16} /> 복제
          </button>
          <button style={{ ...S.btn(false, true), height: 34 }} onClick={deleteFrame} disabled={frames.length <= 1} title="현재 프레임 삭제">
            <Icon name="trash" size={16} color={frames.length <= 1 ? "#4a4d58" : "#ff8a7a"} />
          </button>
          <div style={{ flex: 1 }} />
          <button style={{ ...S.btn(onionSkin), height: 34 }} onClick={() => setOnionSkin((o) => !o)} title="어니언 스킨 (이전 프레임 표시)">
            <Icon name="onion" size={16} color={onionSkin ? "#16130f" : UI.text} /> 어니언
          </button>
        </div>
      </div>
      )}

      {/* tile preview */}
      {mode === MODE_DRAW && (
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>타일 모드</div>
          <button
            style={{ ...S.btn(tilePreview), height: 34 }}
            onClick={() => setTilePreview((t) => !t)}
            title="3×3 반복 미리보기 (심리스 타일 확인)"
          >
            <Icon name="grid" size={16} color={tilePreview ? "#16130f" : UI.text} /> 3×3 미리보기
          </button>
        </div>
        {tilePreview && (
          <canvas
            ref={tileCanvasRef}
            style={{
              width: "100%",
              display: "block",
              marginTop: 10,
              imageRendering: "pixelated",
              border: `1px solid ${UI.border}`,
              borderRadius: 4,
              background: UI.bg,
            }}
          />
        )}
      </div>
      )}

      {/* coloring reference */}
      {mode === MODE_DRAW && (
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>색칠공부</div>
          <button
            style={{ ...S.btn(false), height: 34 }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="참조 이미지 불러오기 — 흑백으로 캔버스 아래에 깔림 (내보내기 미포함)"
          >
            <Icon name="image" size={16} /> 이미지 불러오기
          </button>
          {reference && (
            <>
              <button
                style={{ ...S.btn(showReference), height: 34 }}
                onClick={() => setShowReference((v) => !v)}
                title="참조 이미지 표시/숨김"
              >
                표시
              </button>
              <button
                style={{ ...S.btn(false, true), height: 34 }}
                onClick={clearReference}
                title="참조 이미지 제거"
              >
                <Icon name="trash" size={16} color="#ff8a7a" />
              </button>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            loadReference(e.target.files && e.target.files[0]);
            e.target.value = "";
          }}
        />

        {/* 밑그림 투명도 */}
        {reference && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: UI.dim, letterSpacing: 1 }}>투명도</span>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(refOpacity * 100)}
              onChange={(e) => setRefOpacity(Number(e.target.value) / 100)}
              style={{ flex: 1, accentColor: UI.ember }}
              title="밑그림 투명도"
            />
            <span style={{ fontSize: 12, color: UI.dim, fontFamily: "monospace", width: 40, textAlign: "right" }}>
              {Math.round(refOpacity * 100)}%
            </span>
          </div>
        )}

        {/* 내장 도안 갤러리 */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 10, paddingBottom: 4 }}>
          {TEMPLATES.map((t, i) => {
            const active = refSource?.type === "template" && refSource.index === i;
            return (
              <div
                key={t.name}
                style={{ ...S.thumb(active), lineHeight: "normal" }}
                onClick={() => applyTemplate(i)}
                title={`${t.name} 도안 깔기`}
              >
                <TemplateThumb tpl={t} />
                <div style={{ fontSize: 10, color: active ? UI.ember : UI.dim, textAlign: "center", marginTop: 3 }}>
                  {t.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 보석십자수 — 도안 고르기/만들기. 진행률·색 범례는 하단 바에 있으므로 여기선 뺀다. */}
      {mode === MODE_GEM && (
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>도안</div>
          {prog && (
            <span style={{ fontSize: 12, color: UI.dim, fontFamily: "monospace" }}>
              {prog.done} / {prog.total} · {prog.total ? Math.floor((prog.done / prog.total) * 100) : 0}%
            </span>
          )}
        </div>

        {/* 완성 축하 */}
        {gemMode && progDone && (
          <div style={{
            marginTop: 10, padding: "10px 12px", borderRadius: 4,
            border: `1px solid ${UI.emberDeep}`, background: "#2a1d13",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ display: "block", animation: `gemPop 1.4s ${i * 0.12}s infinite` }}>
                  <Icon name="gem" size={15} color={UI.ember} />
                </span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: UI.text, fontWeight: 600 }}>
              완성! 보석 {prog.total}알을 모두 놓았어요 ✨
            </div>
          </div>
        )}

        <div style={{ ...S.toolRow, marginTop: 10 }}>
          <button style={{ ...S.btn(false), height: 34 }} onClick={drawingToPattern} title="지금 그린 그림을 도안으로 바꾸고 캔버스를 비웁니다">
            <Icon name="download" size={16} /> 현재 그림을 도안으로
          </button>
          {pattern && (
            <>
              <button style={{ ...S.btn(false), height: 34 }} onClick={openPatternSave} title="현재 보석 도안을 내 도안에 저장">
                <Icon name="download" size={16} /> 도안 저장
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ ...S.btn(false), height: 34 }} onClick={fillPattern} title={patternFilter ? "지금 필터된 색만 한 번에 채우기" : "도안대로 한 번에 채우기"}>
                {patternFilter ? "이 색 채우기" : "전부 채우기"}
              </button>
              <button style={{ ...S.btn(false, true), height: 34 }} onClick={clearPattern} title="도안 지우기">
                <Icon name="trash" size={16} color="#ff8a7a" />
              </button>
            </>
          )}
        </div>

        {/* 사진 → 도안 */}
        <div style={{ ...S.toolRow, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: UI.dim, letterSpacing: 1 }}>사진으로 도안</span>
          <select
            style={{ ...S.select, height: 34 }}
            value={patternColors}
            onChange={(e) => setPatternColors(Number(e.target.value))}
            title="도안에 쓸 색 개수"
          >
            {PATTERN_COLORS.map((n) => (
              <option key={n} value={n}>{n}색</option>
            ))}
          </select>
          <button
            style={{ ...S.btn(false), height: 34 }}
            onClick={() => patternInputRef.current && patternInputRef.current.click()}
            title="사진에서 컬러 도안을 자동 생성 — 캔버스는 비워지고 도안만 남습니다"
          >
            <Icon name="image" size={16} /> 사진 불러오기
          </button>
        </div>
        <input
          ref={patternInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            patternFromImage(e.target.files && e.target.files[0]);
            e.target.value = "";
          }}
        />

        {/* 내장 도안 */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 10, paddingBottom: 4 }}>
          {BUILTIN_PATTERNS.map((p, i) => (
            <div
              key={p.name}
              style={{ ...S.thumb(false), lineHeight: "normal" }}
              onClick={() => applyBuiltinPattern(i)}
              title={`${p.name} 도안으로 보석십자수 시작`}
            >
              <PatternThumb make={p.make} size={size} />
              <div style={{ fontSize: 10, color: UI.dim, textAlign: "center", marginTop: 3 }}>{p.name}</div>
            </div>
          ))}
        </div>

        {/* 내 도안 */}
        <div style={{ fontSize: 11, color: UI.dim, letterSpacing: 1, marginTop: 8 }}>내 도안</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 6, paddingBottom: 4 }}>
          {patternLibraryItems.filter((item) => item.size === size).map((item) => (
            <div key={item.id} style={{ ...S.thumb(false), lineHeight: "normal", width: 62 }} title={`${item.name} 도안`}>
              <img src={item.thumb} alt={`${item.name} 도안 미리보기`} style={{ display: "block", width: 56, height: 56, imageRendering: "pixelated", background: UI.bg }} />
              <div style={{ fontSize: 10, color: UI.dim, textAlign: "center", marginTop: 3, maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
              <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                <button style={{ ...S.btn(true), minWidth: 0, width: 32, height: 28, padding: 0, fontSize: 10 }} onClick={() => openPatternItem(item)}>열기</button>
                <button style={{ ...S.btn(false, true), minWidth: 0, width: 24, height: 28, padding: 0 }} onClick={() => removePatternItem(item)} title="내 도안에서 삭제"><Icon name="trash" size={13} color="#ff8a7a" /></button>
              </div>
            </div>
          ))}
          {!patternLibraryItems.filter((item) => item.size === size).length && (
            <div style={{ fontSize: 11, color: UI.dim, padding: "8px 0" }}>사진으로 만든 도안을 저장하면 여기에 보여요.</div>
          )}
        </div>
        {!!patternLibraryItems.filter((item) => item.size === size).length && (
          <div style={{ fontSize: 11, color: UI.dim, marginTop: 1 }}>내 도안은 이 기기에만 저장돼요 · {patternLibraryItems.filter((item) => item.size === size).length}/20</div>
        )}

        {!pattern && (
          <div style={{ fontSize: 11, color: UI.dim, marginTop: 8, lineHeight: 1.5 }}>
            도안을 고르면 흐린 점 위를 톡톡 눌러 보석을 채웁니다. 터치와 모바일 펜을 지원해요.
          </div>
        )}
      </div>
      )}

      {/* palette — 색은 그림 모드에서만 고른다 (보석 모드는 도안 색을 그대로 쓴다) */}
      {mode === MODE_DRAW && (
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>팔레트</div>
          <button
            style={{ ...S.btn(false), height: 30, minWidth: 30, padding: "0 8px", fontSize: 12 }}
            onClick={copyPalette}
            title="현재 팔레트 복제 — 내장 팔레트를 손보고 싶을 때"
          >
            <Icon name="copy" size={14} /> 복제
          </button>
          <button
            style={{ ...S.btn(false), height: 30, minWidth: 30, padding: "0 8px", fontSize: 12 }}
            onClick={newPaletteFromCurrent}
            title="현재 색으로 새 팔레트 만들기"
          >
            <Icon name="plus" size={14} /> 새 팔레트
          </button>
        </div>

        {/* 팔레트 슬롯 전환 */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {paletteList.map((p, i) => (
            <button
              key={`${i}-${p.name}`}
              style={{
                ...S.btn(i === paletteIndex),
                height: 30,
                flexShrink: 0,
                padding: "0 10px",
                fontSize: 12,
                fontWeight: 500,
              }}
              onClick={() => pickPalette(i)}
              title={`${p.name} (${p.colors.length}색)`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* 이름 변경 · 삭제 (사용자 팔레트만) */}
        {canEditPalette && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <input
              type="text"
              value={paletteList[paletteIndex].name}
              onChange={(e) => setPalettes((s) => renamePalette(s, paletteIndex, e.target.value))}
              style={{ ...S.select, height: 30, flex: 1, minWidth: 0, fontSize: 12 }}
              title="팔레트 이름"
            />
            <button
              style={{ ...S.btn(paletteEdit), height: 30, padding: "0 8px", fontSize: 12 }}
              onClick={() => setPaletteEdit((v) => !v)}
              title="색 삭제 모드 — 켜고 스와치를 누르면 그 색이 빠집니다"
            >
              {paletteEdit ? "삭제 중" : "색 삭제"}
            </button>
            <button
              style={{ ...S.btn(false, true), height: 30, minWidth: 30, padding: "0 8px" }}
              onClick={deletePalette}
              title="이 팔레트 삭제"
            >
              <Icon name="trash" size={14} color="#ff8a7a" />
            </button>
          </div>
        )}

        {/* 스와치 */}
        <div style={{ ...S.paletteGrid, marginTop: 8 }}>
          {swatches.map((c) => (
            <button
              key={c}
              style={{
                ...S.swatch(c, color === c && tool !== "eraser"),
                position: "relative",
                cursor: paletteEdit && canEditPalette ? "not-allowed" : "pointer",
              }}
              onClick={() => onSwatch(c)}
              title={paletteEdit && canEditPalette ? `${c} 삭제` : c}
            >
              {paletteEdit && canEditPalette && (
                <span style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "#16130f",
                  textShadow: "0 0 3px rgba(255,255,255,0.9)",
                }}>×</span>
              )}
            </button>
          ))}
          {!swatches.length && (
            <span style={{ fontSize: 11, color: UI.dim, gridColumn: "1 / -1" }}>
              색이 없습니다 — 아래 “현재 색 추가”로 채워보세요.
            </span>
          )}
        </div>

        {/* 최근 사용 색 */}
        {!!palettes.recent.length && (
          <div style={{ marginTop: 12 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>최근 사용</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {palettes.recent.map((c) => (
                <button
                  key={c}
                  style={{
                    width: 24, height: 24, background: c, borderRadius: 3, padding: 0,
                    border: color === c ? `2px solid ${UI.ember}` : `1px solid rgba(255,255,255,0.12)`,
                    cursor: "pointer",
                  }}
                  onClick={() => { setColor(c); if (tool === "eraser") pickTool("pen"); }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* 현재 색 + 팔레트에 추가 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 3, background: color,
            border: `2px solid ${UI.border}`, flexShrink: 0,
          }} />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 44, height: 36, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
            title="커스텀 색"
          />
          <span style={{ fontSize: 12, color: UI.dim, fontFamily: "monospace", flex: 1 }}>{color}</span>
          <button
            style={{ ...S.btn(false), height: 34, fontSize: 12 }}
            onClick={addCurrentColor}
            disabled={!canEditPalette || swatches.includes(color)}
            title={canEditPalette ? "현재 색을 이 팔레트에 추가" : "내장 팔레트는 수정할 수 없어요 — 복제해서 쓰세요"}
          >
            <Icon name="plus" size={14} color={!canEditPalette || swatches.includes(color) ? "#4a4d58" : UI.text} />
            현재 색 추가
          </button>
        </div>

        {/* 이미지에서 팔레트 추출 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>이미지에서 추출</div>
          <select
            style={{ ...S.select, height: 34 }}
            value={extractCount}
            onChange={(e) => setExtractCount(Number(e.target.value))}
            title="뽑을 대표색 개수"
          >
            {EXTRACT_COUNTS.map((n) => (
              <option key={n} value={n}>{n}색</option>
            ))}
          </select>
          <button
            style={{ ...S.btn(false), height: 34, fontSize: 12 }}
            onClick={() => paletteInputRef.current && paletteInputRef.current.click()}
            title="이미지에서 대표색을 뽑아 새 팔레트로 저장"
          >
            <Icon name="image" size={16} /> 추출
          </button>
        </div>
        <input
          ref={paletteInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            extractPaletteFrom(e.target.files && e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      )}

      {/* export */}
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>
            {frames.length > 1 ? "스프라이트 시트 내보내기" : "PNG 내보내기"}
          </div>
          <select style={S.select} value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))}>
            {[1, 4, 8, 16].map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
          <button style={{ ...S.btn(true), height: 36 }} onClick={handleExport} title="투명 PNG로 저장">
            <Icon name="download" color="#16130f" />
            저장
          </button>
        </div>

        <div style={{ ...S.toolRow, marginTop: 8 }}>
          <button
            style={{ ...S.btn(false), height: 34, fontSize: 12 }}
            onClick={handleCopy}
            title="현재 프레임 PNG를 클립보드에 복사 — 다른 앱에 바로 붙여넣기"
          >
            <Icon name="copy" size={16} /> 클립보드 복사
          </button>
          <div style={{ flex: 1 }} />
          {frames.length > 1 && (
            <>
              <button
                style={{ ...S.btn(false), height: 34, fontSize: 12 }}
                onClick={handleExportMeta}
                title="스프라이트 시트 PNG + 프레임 좌표·FPS가 담긴 JSON 메타를 함께 저장"
              >
                <Icon name="download" size={16} /> 시트+메타
              </button>
              <button
                style={{ ...S.btn(false), height: 34, fontSize: 12 }}
                onClick={handleGif}
                title={`애니메이션 GIF로 저장 — 현재 재생 속도(${fps}fps)와 배율(${exportScale}×) 사용`}
              >
                <Icon name="play" size={16} /> GIF
              </button>
            </>
          )}
        </div>
        {frames.length > 1 && (
          <div style={{ fontSize: 11, color: UI.dim, marginTop: 8, lineHeight: 1.5 }}>
            GIF·메타는 프레임 패널의 재생 속도({fps}fps)와 위 배율({exportScale}×)을 그대로 씁니다.
          </div>
        )}
      </div>

      {/* project save/load */}
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>프로젝트 (.emberpix)</div>
          <button
            style={{ ...S.btn(false), height: 36 }}
            onClick={handleProjectSave}
            title="프로젝트 파일로 저장 — 프레임·팔레트·밑그림 포함"
          >
            <Icon name="download" size={16} /> 저장
          </button>
          <button
            style={{ ...S.btn(false), height: 36 }}
            onClick={() => projectInputRef.current && projectInputRef.current.click()}
            title="프로젝트 파일 불러오기 (.emberpix)"
          >
            <Icon name="upload" size={16} /> 불러오기
          </button>
        </div>
        <input
          ref={projectInputRef}
          type="file"
          accept=".emberpix,application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            handleProjectLoad(e.target.files && e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div style={{ ...S.toolRow, marginTop: 8 }}>
          <button
            data-testid="library-save"
            style={{ ...S.btn(true), height: 38, flex: 1 }}
            onClick={() => openLibrarySave()}
            title="이 작품을 브라우저 안의 내 작품 목록에 저장"
          >
            <Icon name="grid" size={17} color="#16130f" />
            {currentLibraryId ? "내 작품 저장" : "보관함 저장"}
          </button>
          <button
            style={{ ...S.btn(false), height: 38 }}
            onClick={openLibrary}
            title="저장한 작품 목록 열기"
          >
            <Icon name="grid" size={17} /> 내 작품
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: UI.dim, lineHeight: 1.5 }}>
          .emberpix 파일로 불러온 그림도 여기서 내 작품에 보관할 수 있어요.
        </div>
      </div>

              {mode === MODE_DRAW && (
                <div style={{ fontSize: 11, color: UI.dim, textAlign: "center", padding: "4px 0 10px", lineHeight: 1.6 }}>
                  단축키 · B 펜 / E 지우개 / G 채우기 / I 스포이드 / L 직선 / R 사각 / O 원 / X 색교체 / M 선택
                  <br />+ − 브러시 크기 / Del 선택 지우기 / Esc 해제 / Ctrl+Z 취소
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {pendingDestructiveAction && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          background: "rgba(0,0,0,0.68)",
        }}>
          <div data-testid="destructive-confirmation" style={{ width: "100%", maxWidth: 420, ...S.panel, marginBottom: 0 }}>
            <div style={{ ...S.logo, fontSize: 24, marginBottom: 16 }}>잠깐만요</div>
            <div data-testid="destructive-confirmation-title" style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{pendingTitle}</div>
            <div style={{ fontSize: 13, color: UI.dim, lineHeight: 1.6 }}>{pendingDescription}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              <button
                data-testid="destructive-cancel"
                style={{ ...S.btn(false), height: 46 }}
                onClick={() => setPendingDestructiveAction(null)}
              >
                아니요, 돌아가기
              </button>
              <button
                data-testid="destructive-confirm"
                style={{ ...S.btn(true), height: 46 }}
                onClick={() => {
                  const action = pendingDestructiveAction;
                  setPendingDestructiveAction(null);
                  if (action.type === "resize") applySizeChange(action.size);
                  else applyClearCanvas();
                }}
              >
                {pendingConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
