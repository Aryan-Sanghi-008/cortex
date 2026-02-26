import { spawn, ChildProcess } from "child_process";
import { logger } from "../utils/logger.js";

/**
 * Preview Server — spawns a local dev server for generated projects.
 *
 * Flow: npm install → npm run dev → returns preview URL
 * The UI embeds this in an iframe for live preview.
 */

interface PreviewInstance {
  projectId: string;
  port: number;
  process: ChildProcess;
  url: string;
  status: "installing" | "starting" | "running" | "stopped" | "error";
  error?: string;
}

const previews = new Map<string, PreviewInstance>();
let nextPort = 4000;

function allocatePort(): number {
  return nextPort++;
}

export async function startPreview(
  projectId: string,
  projectDir: string
): Promise<{ url: string; port: number }> {
  // Kill existing preview for this project
  await stopPreview(projectId);

  const port = allocatePort();
  const url = `http://localhost:${port}`;

  const instance: PreviewInstance = {
    projectId,
    port,
    process: null!,
    url,
    status: "installing",
  };
  previews.set(projectId, instance);

  logger.info(`[Preview] Installing deps for ${projectId}...`);

  return new Promise((resolve, reject) => {
    // Step 1: npm install
    const install = spawn("npm", ["install", "--legacy-peer-deps"], {
      cwd: projectDir,
      shell: true,
      stdio: "pipe",
    });

    install.on("error", (err) => {
      instance.status = "error";
      instance.error = err.message;
      reject(new Error(`npm install failed: ${err.message}`));
    });

    install.on("close", (code) => {
      if (code !== 0) {
        instance.status = "error";
        instance.error = `npm install exited with code ${code}`;
        reject(new Error(instance.error));
        return;
      }

      logger.info(`[Preview] Starting dev server on port ${port}...`);
      instance.status = "starting";

      // Step 2: npm run dev
      const dev = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
        cwd: projectDir,
        shell: true,
        stdio: "pipe",
        env: { ...process.env, PORT: String(port) },
      });

      instance.process = dev;

      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          // Assume it started even if we didn't detect the message
          started = true;
          instance.status = "running";
          resolve({ url, port });
        }
      }, 15000); // 15s timeout

      dev.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        // Detect common dev server ready messages
        if (
          !started &&
          (output.includes("localhost") ||
            output.includes("ready") ||
            output.includes("compiled") ||
            output.includes("Local:"))
        ) {
          started = true;
          clearTimeout(timeout);
          instance.status = "running";
          logger.info(`[Preview] Server running at ${url}`);
          resolve({ url, port });
        }
      });

      dev.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        // Vite/Next output goes to stderr sometimes
        if (
          !started &&
          (output.includes("localhost") || output.includes("ready"))
        ) {
          started = true;
          clearTimeout(timeout);
          instance.status = "running";
          resolve({ url, port });
        }
      });

      dev.on("close", () => {
        clearTimeout(timeout);
        instance.status = "stopped";
        previews.delete(projectId);
      });

      dev.on("error", (err) => {
        clearTimeout(timeout);
        instance.status = "error";
        instance.error = err.message;
        if (!started) reject(err);
      });
    });
  });
}

export async function stopPreview(projectId: string): Promise<void> {
  const instance = previews.get(projectId);
  if (!instance) return;

  try {
    instance.process?.kill("SIGTERM");
    // Force kill after 5s
    setTimeout(() => instance.process?.kill("SIGKILL"), 5000);
  } catch {}

  previews.delete(projectId);
  logger.info(`[Preview] Stopped preview for ${projectId}`);
}

export function getPreviewStatus(projectId: string): PreviewInstance | null {
  return previews.get(projectId) ?? null;
}

export function stopAllPreviews(): void {
  for (const [id] of previews) {
    stopPreview(id);
  }
}
