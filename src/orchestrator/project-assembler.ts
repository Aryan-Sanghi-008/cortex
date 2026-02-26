import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { logger } from "../utils/logger.js";
import type { CodeOutput } from "../validation/index.js";

/**
 * Project Assembler — writes generated code files to disk and creates a ZIP.
 */
export class ProjectAssembler {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Write all code files to a project directory.
   */
  async assembleProject(
    projectId: string,
    projectName: string,
    codeOutputs: Record<string, CodeOutput>
  ): Promise<{ projectDir: string; zipPath: string }> {
    const projectDir = path.join(this.outputDir, projectId, "project");
    await fs.mkdir(projectDir, { recursive: true });

    // Collect all files and dependencies
    const allFiles: Array<{ path: string; content: string }> = [];
    const allDeps = new Set<string>();
    const allDevDeps = new Set<string>();

    for (const [team, output] of Object.entries(codeOutputs)) {
      logger.info(`Assembling ${output.files.length} files from ${team}`);
      for (const file of output.files) {
        allFiles.push({ path: file.path, content: file.content });
      }
      output.dependencies.forEach((d) => allDeps.add(d));
      output.devDependencies.forEach((d) => allDevDeps.add(d));
    }

    // Write all files
    for (const file of allFiles) {
      const filePath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");
    }

    // Generate package.json if not already created by a bot
    const hasPackageJson = allFiles.some((f) => f.path === "package.json");
    if (!hasPackageJson) {
      const packageJson = {
        name: projectName.toLowerCase().replace(/\s+/g, "-"),
        version: "1.0.0",
        private: true,
        type: "module",
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          test: "vitest run",
          lint: "eslint . --ext .ts,.tsx",
        },
        dependencies: Object.fromEntries(
          [...allDeps].map((d) => [d, "latest"])
        ),
        devDependencies: Object.fromEntries(
          [...allDevDeps].map((d) => [d, "latest"])
        ),
      };
      await fs.writeFile(
        path.join(projectDir, "package.json"),
        JSON.stringify(packageJson, null, 2),
        "utf-8"
      );
    }

    // Create ZIP
    const zipPath = path.join(this.outputDir, projectId, `${projectName.toLowerCase().replace(/\s+/g, "-")}.zip`);
    await this.createZip(projectDir, zipPath);

    logger.success(`Project assembled → ${projectDir}`);
    logger.success(`ZIP created → ${zipPath}`);

    return { projectDir, zipPath };
  }

  private async createZip(
    sourceDir: string,
    outPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
