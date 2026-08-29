import React, { useEffect, useId, useRef } from "react";
import { TEMPLATES } from "../core/templates.js";
import { BUILTIN_PATTERNS } from "../core/patterns.js";
import { PatternThumb, TemplateThumb } from "./PatternPreview.jsx";
import "./pattern-gallery.css";
import { keepDialogFocus } from "./dialog-focus.js";

export default function PatternGallery({ kind, size, selectedIndex, onSelect, onClose, theme }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const hintId = useId();
  const entries = kind === "draw" ? TEMPLATES : BUILTIN_PATTERNS;
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    dialog.querySelector("[data-gallery-close]").focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="pattern-gallery" aria-labelledby={titleId} aria-describedby={hintId}
      style={{ "--gallery-bg": theme.bg, "--gallery-panel": theme.panel, "--gallery-hi": theme.panelHi,
        "--gallery-text": theme.text, "--gallery-dim": theme.dim, "--gallery-accent": theme.ember, "--gallery-border": theme.border }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => { event.stopPropagation(); keepDialogFocus(event); }}>
      <header className="pattern-gallery__header">
        <div>
          <h2 id={titleId}>{kind === "draw" ? "그림" : "보석십자수"} 도안 전체보기</h2>
          <p id={hintId}>내장 도안 {entries.length}개 · 마음에 드는 그림을 골라요</p>
        </div>
        <button type="button" data-gallery-close onClick={onClose} aria-label="도안 전체보기 닫기">닫기</button>
      </header>
      <ul className="pattern-gallery__grid">
        {entries.map((entry, index) => (
          <li key={entry.name}>
            <button type="button" className="pattern-gallery__item" aria-pressed={selectedIndex === index}
              aria-label={`${entry.name} 도안 선택`} onClick={() => onSelect(index)}>
              {kind === "draw" ? <TemplateThumb tpl={entry} displaySize={80} />
                : <PatternThumb make={entry.make} size={size} displaySize={80} />}
              <span>{entry.name}</span>
              <small>{selectedIndex === index ? "선택됨" : "선택하기"}</small>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
