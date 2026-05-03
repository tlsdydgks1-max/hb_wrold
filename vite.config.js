import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hbWebSocketServer = () => ({
  name: "hb-world-websocket-server",
  configureServer(server) {
    const child = spawn(process.execPath, ["server/ws-server.js"], {
      cwd: __dirname,
      env: {
        ...process.env,
        HB_WS_PORT: process.env.HB_WS_PORT || "8787",
      },
      stdio: "inherit",
      windowsHide: true,
    });

    server.httpServer?.once("close", () => {
      child.kill();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
  },
  plugins: [react(), hbWebSocketServer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
