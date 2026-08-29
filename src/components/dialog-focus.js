// native dialog는 문서 밖 브라우저 UI로 Tab을 넘길 수 있어 양 끝을 명시적으로 순환한다.
export function keepDialogFocus(event) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  const buttons = [...dialog.querySelectorAll('button:not([disabled])')];
  if (!buttons.length) return;
  const active = dialog.ownerDocument.activeElement;
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
