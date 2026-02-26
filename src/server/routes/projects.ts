import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { loadConfig } from "../../config.js";
import { wsEmitter } from "../ws-emitter.js";
import { logger } from "../../utils/logger.js";
import { Orchestrator } from "../../orchestrator/orchestrator.js";
import { startPreview, stopPreview, getPreviewStatus } from "../preview-server.js";
import { VercelDeployer, estimateDeploymentCost, type DeployPlatform } from "../../deploy/deployer.js";
import { calculateCost, StripeGateway } from "../../payments/gateway.js";
import { ProjectStore } from "../../memory/project-store.js";

const router = Router();
const projectStore = new ProjectStore();

// In-memory project store
interface ProjectRecord {
  id: string;
  productIdea: string;
  images: string[];
  status: "queued" | "running" | "completed" | "failed";
  output?: any;
  error?: string;
  createdAt: string;
  previewUrl?: string;
  deployUrl?: string;
  deployStatus?: string;
}

const projects = new Map<string, ProjectRecord>();

// ─── CREATE PROJECT ─────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const { productIdea, images } = req.body as {
      productIdea: string;
      images?: string[];
    };

    if (!productIdea?.trim()) {
      res.status(400).json({ error: "productIdea is required" });
      return;
    }

    const projectId = randomUUID().slice(0, 8);
    const record: ProjectRecord = {
      id: projectId,
      productIdea: productIdea.trim(),
      images: images ?? [],
      status: "queued",
      createdAt: new Date().toISOString(),
    };

    projects.set(projectId, record);
    res.status(201).json({ projectId, status: "queued" });

    // Run pipeline in background
    setImmediate(async () => {
      record.status = "running";
      try {
        const config = loadConfig();
        const orchestrator = new Orchestrator(config, wsEmitter);

        // Inject past experience
        const similar = await projectStore.findSimilar(record.productIdea);
        const experience = projectStore.formatForPrompt(similar);

        const output = await orchestrator.run(
          record.productIdea + experience,
          record.images
        );
        record.status = "completed";
        record.output = output;

        // Store for future learning
        await projectStore.addProject({
          id: output.projectId,
          prompt: record.productIdea,
          projectType: output.documentation?.projectType ?? "web",
          features: (output.documentation?.features ?? []).map((f: any) => typeof f === 'string' ? f : f.name ?? String(f)),
          techStack: {
            frontend: [],
            backend: [],
            database: "unknown",
          },
          fileCount:
            (output.frontendCode?.files?.length ?? 0) +
            (output.backendCode?.files?.length ?? 0) +
            (output.databaseCode?.files?.length ?? 0),
          qualityScore: output.principalReview?.overallQuality ?? 0,
          lessons: output.principalReview?.summary
            ? [output.principalReview.summary]
            : [],
        });
      } catch (err) {
        record.status = "failed";
        record.error = err instanceof Error ? err.message : String(err);
        logger.error(`Project ${projectId} failed`, err);
        wsEmitter.pipelineError(projectId, record.error);
      }
    });
  } catch (err) {
    logger.error("Failed to create project", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET PROJECT ────────────────────────────────────────────
router.get("/:id", (req: Request, res: Response) => {
  const project = projects.get(req.params.id as string);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

// ─── LIST PROJECTS ──────────────────────────────────────────
router.get("/", (_req: Request, res: Response) => {
  const list = Array.from(projects.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(list);
});

// ─── PREVIEW ────────────────────────────────────────────────
router.post("/:id/preview", async (req: Request, res: Response) => {
  const project = projects.get(req.params.id as string);
  if (!project?.output?.projectDir) {
    res.status(404).json({ error: "Project not found or not completed" });
    return;
  }

  try {
    const { url, port } = await startPreview(project.id, project.output.projectDir);
    project.previewUrl = url;
    res.json({ previewUrl: url, port });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Preview failed" });
  }
});

router.delete("/:id/preview", async (req: Request, res: Response) => {
  await stopPreview(req.params.id as string);
  const project = projects.get(req.params.id as string);
  if (project) project.previewUrl = undefined;
  res.json({ status: "stopped" });
});

router.get("/:id/preview/status", (req: Request, res: Response) => {
  const status = getPreviewStatus(req.params.id as string);
  res.json(status ?? { status: "not_running" });
});

// ─── DEPLOY ─────────────────────────────────────────────────
router.post("/:id/deploy", async (req: Request, res: Response) => {
  const project = projects.get(req.params.id as string);
  if (!project?.output?.projectDir) {
    res.status(404).json({ error: "Project not found or not completed" });
    return;
  }

  const platform = (req.body.platform ?? "vercel") as DeployPlatform;
  try {
    const deployer = new VercelDeployer();
    const result = await deployer.deploy(
      project.output.projectDir,
      project.output.projectName ?? "cortex-project"
    );
    project.deployUrl = result.url;
    project.deployStatus = result.status;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Deploy failed" });
  }
});

// ─── COST ESTIMATE ──────────────────────────────────────────
router.get("/:id/cost", (req: Request, res: Response) => {
  const project = projects.get(req.params.id as string);
  if (!project?.output) {
    res.status(404).json({ error: "Project not completed" });
    return;
  }

  const platform = (req.query.platform as DeployPlatform) ?? "vercel";
  const llmCost = project.output.costBreakdown?.totalCost ?? 0.10;
  const totalCost = calculateCost(llmCost, platform);
  const hosting = estimateDeploymentCost(platform, "medium");

  res.json({
    ...totalCost,
    hosting,
  });
});

// ─── PAYMENT ────────────────────────────────────────────────
router.post("/:id/pay", async (req: Request, res: Response) => {
  const project = projects.get(req.params.id as string);
  if (!project?.output) {
    res.status(404).json({ error: "Project not completed" });
    return;
  }

  const platform = (req.body.platform ?? "vercel") as DeployPlatform;
  const llmCost = project.output.costBreakdown?.totalCost ?? 0.10;
  const costBreakdown = calculateCost(llmCost, platform);

  const gateway = new StripeGateway();
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const result = await gateway.createCheckout(
    project.id,
    costBreakdown,
    `${baseUrl}/api/projects/${project.id}/deploy-after-pay`,
    `${baseUrl}/?cancelled=true`
  );

  res.json(result);
});

// ─── POST-PAYMENT DEPLOY ────────────────────────────────────
router.get("/:id/deploy-after-pay", async (req: Request, res: Response) => {
  const project = projects.get(req.params.id as string);
  if (!project?.output?.projectDir) {
    res.redirect("/?error=project_not_found");
    return;
  }

  try {
    const deployer = new VercelDeployer();
    const result = await deployer.deploy(
      project.output.projectDir,
      project.output.projectName ?? "cortex-project"
    );
    project.deployUrl = result.url;
    project.deployStatus = result.status;
    res.redirect(`/?deployed=true&url=${encodeURIComponent(result.url)}`);
  } catch {
    res.redirect("/?error=deploy_failed");
  }
});

export default router;
