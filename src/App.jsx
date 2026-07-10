import React, { useState, useRef, useEffect } from "react";
import { makeGrid, floodFill } from "./core/grid.js";
import { createHistory } from "./core/history.js";
import { render, renderTilePreview } from "./core/renderer.js";
import { exportSheet } from "./core/exporter.js";
import { saveState, loadState } from "./core/storage.js";
import { imageFromFile, sampleReference } from "./core/reference.js";

// ---------- constants ----------
const PALETTE = [
  "#1a1c2c", "#5d275d", "#b13e53", "#ef7d57",
  "#ffcd75", "#a7f070", "#38b764", "#257179",
  "#29366f", "#3b5dc9", "#41a6f6", "#73eff7",
  "#f4f4f4", "#94b0c2", "#566c86", "#333c57",
];
const SIZES = [16, 32, 64];
const DEFAULT_SIZE = 32;
const DEFAULT_COLOR = PALETTE[3];
const AUTOSAVE_MS = 500;

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
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z",
    copy: "M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z",
    play: "M8 5v14l11-7L8 5z",
    stop: "M6 6h12v12H6z",
    onion: "M12 3l8.5 5-8.5 5-8.5-5L12 3zm7 8.2l1.5 .8-8.5 5-8.5-5 1.5-.8L12 15l7-3.8z",
    image: "M3 4h18v16H3V4zm2 2v12h14V6H5zm2 10l3-4 2 2.5 1.5-2L17 16H7zm3-7a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z",
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

  // 색칠공부 (참조 이미지를 흑백으로 캔버스 아래에 표시)
  const [reference, setReference] = useState(() => boot?.reference ?? null);
  const [showReference, setShowReference] = useState(true);
  const refImageRef = useRef(null); // 원본 이미지 — 크기 변경 시 재샘플용 (세션 한정)
  const fileInputRef = useRef(null);

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
    render(canvas, active, size, showGrid, onion, showReference ? reference : null);
  }, [version, showGrid, size, currentFrame, onionSkin, playing, reference, showReference]);

  // ----- tile preview (켜져 있으면 현재 프레임을 3×3 반복 렌더) -----
  useEffect(() => {
    if (!tilePreview) return;
    const cv = tileCanvasRef.current;
    if (!cv) return;
    renderTilePreview(cv, framesRef.current[currentFrame].pixels, size);
  }, [tilePreview, version, currentFrame, size]);

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
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [version, size, color, currentFrame, reference]);

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
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return [x, y];
  };

  const paintCell = (x, y) => {
    const px = activeFrame().pixels;
    const value = tool === "eraser" ? null : color;
    px[y * size + x] = value;
    if (mirrorX) px[y * size + (size - 1 - x)] = value;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const cellPos = cellFromEvent(e);
    if (!cellPos) return;
    const [x, y] = cellPos;

    if (tool === "picker") {
      const c = activeFrame().pixels[y * size + x];
      if (c) setColor(c);
      return;
    }
    if (tool === "fill") {
      pushUndo();
      activeFrame().pixels = floodFill(activeFrame().pixels, size, x, y, color);
      bump();
      return;
    }
    // pen / eraser stroke
    pushUndo();
    drawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    paintCell(x, y);
    bump();
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const cellPos = cellFromEvent(e);
    if (!cellPos) return;
    paintCell(cellPos[0], cellPos[1]);
    bump();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  // ----- actions -----
  const clearCanvas = () => {
    pushUndo();
    activeFrame().pixels = makeGrid(size);
    bump();
  };

  const changeSize = (s) => {
    if (s === size) return;
    // 크기 변경은 전체 초기화 (단일 빈 프레임 + 히스토리 리셋).
    framesRef.current = [{ pixels: makeGrid(s), history: createHistory() }];
    setCurrentFrame(0);
    frameIndexRef.current = 0;
    setPlaying(false);
    // 참조 이미지: 원본이 세션에 있으면 새 크기로 재샘플, 없으면 해제.
    setReference(refImageRef.current ? sampleReference(refImageRef.current, s) : null);
    setSize(s);
    bump();
  };

  const handleExport = () =>
    exportSheet(framesRef.current.map((f) => f.pixels), size, exportScale);

  // ----- coloring reference -----
  const loadReference = async (file) => {
    if (!file) return;
    try {
      const img = await imageFromFile(file);
      refImageRef.current = img;
      setReference(sampleReference(img, size));
      setShowReference(true);
    } catch {
      // 이미지가 아니거나 손상된 파일 — 조용히 무시.
    }
  };
  const clearReference = () => {
    refImageRef.current = null;
    setReference(null);
  };

  // ----- frame ops -----
  const switchFrame = (i) => {
    setPlaying(false);
    setCurrentFrame(i);
    frameIndexRef.current = i;
    bump();
  };
  const addFrame = () => {
    const i = frameIndexRef.current + 1;
    framesRef.current.splice(i, 0, { pixels: makeGrid(size), history: createHistory() });
    setPlaying(false);
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

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === "b") setTool("pen");
      else if (e.key === "e") setTool("eraser");
      else if (e.key === "g") setTool("fill");
      else if (e.key === "i") setTool("picker");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ----- styles -----
  const S = {
    app: {
      minHeight: "100vh",
      background: UI.bg,
      color: UI.text,
      fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 12px 32px",
      userSelect: "none",
      WebkitUserSelect: "none",
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
      width: "100%",
      maxWidth: 560,
      marginBottom: 12,
    },
    canvas: {
      width: "100%",
      display: "block",
      imageRendering: "pixelated",
      touchAction: "none",
      border: `1px solid ${UI.border}`,
      borderRadius: 4,
      boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`,
      cursor: "crosshair",
      background: UI.panel,
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

  const toolDefs = [
    { id: "pen", icon: "pen", label: "펜" },
    { id: "eraser", icon: "eraser", label: "지우개" },
    { id: "fill", icon: "fill", label: "채우기" },
    { id: "picker", icon: "picker", label: "스포이드" },
  ];

  return (
    <div style={S.app}>
      {/* header */}
      <div style={S.header}>
        <div style={S.logo}>
          EMBER<span style={{ color: UI.ember }}>PIX</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={S.select} value={size} onChange={(e) => changeSize(Number(e.target.value))}>
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}×{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* tools */}
      <div style={S.panel}>
        <div style={S.toolRow}>
          {toolDefs.map((t) => (
            <button key={t.id} style={S.btn(tool === t.id)} onClick={() => setTool(t.id)} title={t.label}>
              <Icon name={t.icon} />
            </button>
          ))}
          <div style={{ width: 1, height: 28, background: UI.border, margin: "0 4px" }} />
          <button style={S.btn(false)} onClick={undo} disabled={!undoLen} title="실행 취소 (Ctrl+Z)">
            <Icon name="undo" color={undoLen ? UI.text : "#4a4d58"} />
          </button>
          <button style={S.btn(false)} onClick={redo} disabled={!redoLen} title="다시 실행 (Ctrl+Shift+Z)">
            <Icon name="redo" color={redoLen ? UI.text : "#4a4d58"} />
          </button>
          <div style={{ width: 1, height: 28, background: UI.border, margin: "0 4px" }} />
          <button style={S.btn(showGrid)} onClick={() => setShowGrid(!showGrid)} title="그리드">
            <Icon name="grid" />
          </button>
          <button style={S.btn(mirrorX)} onClick={() => setMirrorX(!mirrorX)} title="좌우 대칭 그리기">
            <Icon name="mirror" />
          </button>
          <div style={{ flex: 1 }} />
          <button style={S.btn(false, true)} onClick={clearCanvas} title="전체 지우기">
            <Icon name="trash" color="#ff8a7a" />
          </button>
        </div>
      </div>

      {/* canvas */}
      <div style={S.canvasWrap}>
        <canvas
          ref={canvasRef}
          style={S.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* frames */}
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>프레임 · {frames.length}</div>
          <button style={{ ...S.btn(playing), height: 32, minWidth: 32 }} onClick={() => setPlaying((p) => !p)} title={playing ? "정지" : "재생"}>
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

      {/* tile preview */}
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

      {/* coloring reference */}
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
      </div>

      {/* palette */}
      <div style={S.panel}>
        <div style={S.label}>Palette — Sweetie 16</div>
        <div style={S.paletteGrid}>
          {PALETTE.map((c) => (
            <button key={c} style={S.swatch(c, color === c && tool !== "eraser")} onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }} />
          ))}
        </div>
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
          <span style={{ fontSize: 12, color: UI.dim, fontFamily: "monospace" }}>{color}</span>
        </div>
      </div>

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
          <button style={{ ...S.btn(true), height: 36 }} onClick={handleExport}>
            <Icon name="download" color="#16130f" />
            저장
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: UI.dim, maxWidth: 560, width: "100%", textAlign: "center" }}>
        단축키 · B 펜 / E 지우개 / G 채우기 / I 스포이드 / Ctrl+Z 취소
      </div>
    </div>
  );
}
