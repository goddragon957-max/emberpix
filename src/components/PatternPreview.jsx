import React, { useEffect, useRef } from "react";

// 내부 해상도를 도안 격자와 맞춰 48px 축소에서도 팔레트 색이 섞이지 않게 한다.
export function TemplateThumb({ tpl, displaySize = 48 }) {
  const ref = useRef(null);
  const size = tpl.rows.length;
  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    tpl.rows.forEach((row, y) => [...row].forEach((cell, x) => {
      ctx.fillStyle = cell === "#" ? "#2d2d2d" : "#f4f4f4";
      ctx.fillRect(x, y, 1, 1);
    }));
  }, [tpl]);
  return <canvas aria-hidden="true" ref={ref} width={size} height={size}
    style={{ width: displaySize, height: displaySize, display: "block", imageRendering: "pixelated", borderRadius: 2 }} />;
}

export function PatternThumb({ make, size = 32, displaySize = 48 }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    make(size).forEach((color, index) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(index % size, Math.floor(index / size), 1, 1);
    });
  }, [make, size]);
  return <canvas aria-hidden="true" ref={ref} width={size} height={size}
    style={{ width: displaySize, height: displaySize, display: "block", imageRendering: "pixelated", borderRadius: 2 }} />;
}
