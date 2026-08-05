import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 서비스워커 등록 — 홈 화면에 담아 오프라인으로도 쓰기 위함.
// dev에서는 HMR과 캐시가 얽히므로 프로덕션 빌드에서만 켠다.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // 상대 경로 — GitHub Pages처럼 하위 경로에 배포해도 그대로 동작한다.
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // 미지원 브라우저·비보안 컨텍스트 등 — 앱 동작에는 영향 없다.
    });
  });
}
