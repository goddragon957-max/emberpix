import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/emberpix/",
  plugins: [react()],
  server: { port: 5199 },
});
