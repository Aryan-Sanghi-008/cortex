/**
 * Deployer — abstract interface + Vercel implementation.
 */

import { logger } from "../utils/logger.js";

export type DeployPlatform = "vercel" | "railway" | "render";

export interface DeployResult {
  platform: DeployPlatform;
  url: string;
  status: "deploying" | "ready" | "error";
  deploymentId: string;
  error?: string;
}

export interface Deployer {
  deploy(projectDir: string, projectName: string): Promise<DeployResult>;
  getStatus(deploymentId: string): Promise<DeployResult>;
}

/**
 * Vercel Deployer — uses Vercel REST API.
 * Requires VERCEL_TOKEN env var.
 */
export class VercelDeployer implements Deployer {
  private token: string;

  constructor(token?: string) {
    this.token = token ?? process.env.VERCEL_TOKEN ?? "";
    if (!this.token) {
      logger.warn("[Deploy] VERCEL_TOKEN not set — deployment will fail");
    }
  }

  async deploy(projectDir: string, projectName: string): Promise<DeployResult> {
    const fs = await import("fs/promises");
    const path = await import("path");

    logger.info(`[Deploy] Deploying ${projectName} to Vercel...`);

    // Collect all files for upload
    const files = await this.collectFiles(projectDir, projectDir, fs, path);

    const body = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      files,
      projectSettings: {
        framework: null, // auto-detect
      },
    };

    try {
      const res = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Vercel API error: ${res.status} ${err}`);
      }

      const data = (await res.json()) as { id: string; url: string; readyState: string };

      logger.info(`[Deploy] Deployment started: https://${data.url}`);

      return {
        platform: "vercel",
        url: `https://${data.url}`,
        status: data.readyState === "READY" ? "ready" : "deploying",
        deploymentId: data.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Deploy] Failed: ${msg}`);
      return {
        platform: "vercel",
        url: "",
        status: "error",
        deploymentId: "",
        error: msg,
      };
    }
  }

  async getStatus(deploymentId: string): Promise<DeployResult> {
    try {
      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );

      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

      const data = (await res.json()) as { id: string; url: string; readyState: string };

      return {
        platform: "vercel",
        url: `https://${data.url}`,
        status: data.readyState === "READY" ? "ready" : "deploying",
        deploymentId: data.id,
      };
    } catch (err) {
      return {
        platform: "vercel",
        url: "",
        status: "error",
        deploymentId,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async collectFiles(
    dir: string,
    rootDir: string,
    fs: typeof import("fs/promises"),
    path: typeof import("path")
  ): Promise<Array<{ file: string; data: string }>> {
    const files: Array<{ file: string; data: string }> = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath);

      // Skip node_modules, .git, etc.
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === ".next"
      ) continue;

      if (entry.isDirectory()) {
        const subFiles = await this.collectFiles(fullPath, rootDir, fs, path);
        files.push(...subFiles);
      } else {
        const content = await fs.readFile(fullPath, "utf-8");
        files.push({ file: relPath, data: content });
      }
    }

    return files;
  }
}

/**
 * Deployment cost estimator.
 */
export function estimateDeploymentCost(
  platform: DeployPlatform,
  projectComplexity: "simple" | "medium" | "complex"
): {
  monthly: string;
  yearly: string;
  breakdown: string[];
} {
  const costs: Record<DeployPlatform, Record<string, { monthly: number; items: string[] }>> = {
    vercel: {
      simple: { monthly: 0, items: ["Vercel Hobby (free)", "Static hosting", "Serverless functions (limited)"] },
      medium: { monthly: 20, items: ["Vercel Pro ($20/mo)", "Unlimited bandwidth", "Serverless functions"] },
      complex: { monthly: 20, items: ["Vercel Pro ($20/mo)", "Edge functions", "Analytics", "+ External DB ($5-15/mo)"] },
    },
    railway: {
      simple: { monthly: 5, items: ["Railway Starter ($5/mo)", "Container hosting", "Basic DB"] },
      medium: { monthly: 10, items: ["Railway ($10/mo)", "Auto-scaling", "Postgres DB"] },
      complex: { monthly: 20, items: ["Railway ($20/mo)", "Multiple services", "Redis + Postgres"] },
    },
    render: {
      simple: { monthly: 0, items: ["Render Free tier", "Static hosting", "750h/mo web service"] },
      medium: { monthly: 7, items: ["Render Starter ($7/mo)", "Web service", "Postgres"] },
      complex: { monthly: 25, items: ["Render ($25/mo)", "Multiple services", "Postgres + Redis"] },
    },
  };

  const c = costs[platform][projectComplexity];
  return {
    monthly: c.monthly === 0 ? "Free" : `$${c.monthly}/mo`,
    yearly: c.monthly === 0 ? "Free" : `$${c.monthly * 12}/yr`,
    breakdown: c.items,
  };
}
