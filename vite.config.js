import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Vercel과 로컬 배포는 루트 경로를 쓴다.
  // GitHub Pages 빌드는 워크플로에서 --base=/emberpix/로 덮어쓴다.
  base: "/",
  plugins: [react()],
  server: { port: 5199 },
});
