import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../utils/logger.js";

export interface BotEvent {
  event:
    | "pipeline-start"
    | "pipeline-complete"
    | "pipeline-error"
    | "step-start"
    | "step-complete"
    | "bot-start"
    | "bot-complete"
    | "bot-error"
    | "review-start"
    | "review-result"
    | "correction-loop"
    | "file-generated";
  projectId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * WebSocket event broadcaster.
 * The orchestrator emits events here, and all connected UI clients receive them.
 */
export class WSEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  attach(wss: WebSocketServer): void {
    this.wss = wss;
    wss.on("connection", (ws) => {
      this.clients.add(ws);
      logger.info(`WS client connected (total: ${this.clients.size})`);

      ws.on("close", () => {
        this.clients.delete(ws);
        logger.info(`WS client disconnected (total: ${this.clients.size})`);
      });
    });
  }

  emit(event: BotEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  // ─── Helper emitters ─────────────────────────────────────

  pipelineStart(projectId: string, productIdea: string): void {
    this.emit({
      event: "pipeline-start",
      projectId,
      timestamp: Date.now(),
      data: { productIdea },
    });
  }

  pipelineComplete(projectId: string, status: string, score: number): void {
    this.emit({
      event: "pipeline-complete",
      projectId,
      timestamp: Date.now(),
      data: { status, score },
    });
  }

  pipelineError(projectId: string, error: string): void {
    this.emit({
      event: "pipeline-error",
      projectId,
      timestamp: Date.now(),
      data: { error },
    });
  }

  botStart(projectId: string, botName: string, step: string): void {
    this.emit({
      event: "bot-start",
      projectId,
      timestamp: Date.now(),
      data: { bot: botName, step },
    });
  }

  botComplete(
    projectId: string,
    botName: string,
    filesGenerated?: number
  ): void {
    this.emit({
      event: "bot-complete",
      projectId,
      timestamp: Date.now(),
      data: { bot: botName, filesGenerated },
    });
  }

  botError(projectId: string, botName: string, error: string): void {
    this.emit({
      event: "bot-error",
      projectId,
      timestamp: Date.now(),
      data: { bot: botName, error },
    });
  }

  reviewStart(projectId: string, reviewer: string, target: string): void {
    this.emit({
      event: "review-start",
      projectId,
      timestamp: Date.now(),
      data: { reviewer, target },
    });
  }

  reviewResult(
    projectId: string,
    reviewer: string,
    approved: boolean,
    score: number
  ): void {
    this.emit({
      event: "review-result",
      projectId,
      timestamp: Date.now(),
      data: { reviewer, approved, score },
    });
  }

  fileGenerated(projectId: string, filePath: string, language: string): void {
    this.emit({
      event: "file-generated",
      projectId,
      timestamp: Date.now(),
      data: { path: filePath, language },
    });
  }
}

// Singleton instance
export const wsEmitter = new WSEmitter();
