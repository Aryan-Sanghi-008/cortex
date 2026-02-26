import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { loadConfig } from "../config.js";
import { wsEmitter } from "./ws-emitter.js";
import projectsRouter from "./routes/projects.js";
import uploadRouter from "./routes/upload.js";
import { logger } from "../utils/logger.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();
const server = createServer(app);

// ─── WebSocket ──────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws" });
wsEmitter.attach(wss);

// ─── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ─── API Routes ─────────────────────────────────────────────
app.use("/api/projects", projectsRouter);
app.use("/api/upload", uploadRouter);

// ─── Serve generated project files for download ─────────────
const config = loadConfig();
app.use(
  "/output",
  express.static(path.resolve(config.outputDir))
);

// ─── Serve web UI (production build, optional) ──────────────
const webDist = path.resolve("./web/dist");
app.use(express.static(webDist));

// Catch-all: serve SPA for non-API routes (production only)
app.get("*", (req, res) => {
  // Don't catch API routes
  if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    res.sendFile(path.join(webDist, "index.html"));
  } catch {
    res.status(200).send("Cortex server running. Use the web UI at http://localhost:3000");
  }
});

// ─── Start ──────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.header("🧠 Cortex Server");
  logger.info(`HTTP  → http://localhost:${PORT}`);
  logger.info(`WS    → ws://localhost:${PORT}/ws`);
  logger.info(`API   → http://localhost:${PORT}/api/projects`);
  logger.divider();
});

export { app, server };
