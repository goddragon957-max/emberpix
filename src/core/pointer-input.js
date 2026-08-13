const POINTER_LABELS = {
  pen: "펜",
  touch: "터치",
  mouse: "마우스",
};

export function normalizePointerType(pointerType) {
  return typeof pointerType === "string" && pointerType.trim() ? pointerType : "unknown";
}

export function describePointer(event) {
  const type = normalizePointerType(event?.pointerType);
  const pressure = type === "pen" && Number.isFinite(event?.pressure)
    ? Math.max(0, Math.min(1, event.pressure))
    : null;
  return {
    type,
    label: POINTER_LABELS[type] ?? "입력",
    pressure,
  };
}

// 펜은 선택한 브러시 크기를 기본으로 하되, 강하게 누르면 한 단계만 넓힌다.
// 보석십자수는 호출부에서 항상 한 칸으로 고정하므로 그림 모드에만 적용된다.
export function pressureBrushSize(baseSize, event) {
  const safeBase = Math.max(1, Math.min(4, Math.trunc(baseSize) || 1));
  const info = describePointer(event);
  if (info.type !== "pen" || info.pressure == null || info.pressure < 0.72) return safeBase;
  return Math.min(4, safeBase + 1);
}
