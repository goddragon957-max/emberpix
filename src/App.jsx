import React, { useState, useRef, useEffect } from "react";
import { makeGrid, floodFill } from "./core/grid.js";
import { createHistory } from "./core/history.js";
import { render } from "./core/renderer.js";
import { exportPNG } from "./core/exporter.js";
import { saveState, loadState } from "./core/storage.js";

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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <path d={paths[name]} />
    </svg>
  );
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
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  const pixelsRef = useRef(boot?.pixels ?? makeGrid(boot?.size ?? DEFAULT_SIZE));
  const historyRef = useRef(createHistory());
  const drawingRef = useRef(false);
  const canvasRef = useRef(null);

  const bump = () => setVersion((v) => v + 1);
  const syncStacks = () => {
    setUndoLen(historyRef.current.undoLen);
    setRedoLen(historyRef.current.redoLen);
  };

  // ----- rendering -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    render(canvas, pixelsRef.current, size, showGrid);
  }, [version, showGrid, size]);

  // ----- autosave (픽셀/크기/색 변경 후 디바운스 저장) -----
  useEffect(() => {
    const t = setTimeout(() => {
      saveState({ size, pixels: pixelsRef.current, color });
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [version, size, color]);

  // ----- history -----
  const pushUndo = () => {
    historyRef.current.push(pixelsRef.current);
    syncStacks();
  };
  const undo = () => {
    const prev = historyRef.current.undo(pixelsRef.current);
    if (prev === null) return;
    pixelsRef.current = prev;
    syncStacks();
    bump();
  };
  const redo = () => {
    const next = historyRef.current.redo(pixelsRef.current);
    if (next === null) return;
    pixelsRef.current = next;
    syncStacks();
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
    const px = pixelsRef.current;
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
      const c = pixelsRef.current[y * size + x];
      if (c) setColor(c);
      return;
    }
    if (tool === "fill") {
      pushUndo();
      pixelsRef.current = floodFill(pixelsRef.current, size, x, y, color);
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
    pixelsRef.current = makeGrid(size);
    bump();
  };

  const changeSize = (s) => {
    if (s === size) return;
    pixelsRef.current = makeGrid(s);
    historyRef.current.reset();
    syncStacks();
    setSize(s);
    bump();
  };

  const handleExport = () => exportPNG(pixelsRef.current, size, exportScale);

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
          <div style={{ ...S.label, marginBottom: 0, flex: 1 }}>PNG 내보내기</div>
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
