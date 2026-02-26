import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import chalk from "chalk";
import ora from "ora";
import { loadConfig } from "./config.js";
import { Orchestrator } from "./orchestrator/orchestrator.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  console.clear();
  console.log(
    chalk.bold.bgMagenta.white(
      "\n  🧠 Cortex — AI Code Generation Platform  \n"
    )
  );
  console.log(
    chalk.dim(
      "  Multi-agent AI code generation from natural language prompts\n"
    )
  );
  logger.divider();

  // ─── Get product idea ─────────────────────────────────────
  let productIdea: string;

  if (process.argv[2]) {
    productIdea = process.argv.slice(2).join(" ");
    logger.info(`Product Idea (from args): "${productIdea}"`);
  } else {
    const rl = createInterface({ input, output });
    productIdea = await rl.question(
      chalk.bold.cyan("📝 Enter your product idea: ")
    );
    rl.close();

    if (!productIdea.trim()) {
      logger.error("No product idea provided. Exiting.");
      process.exit(1);
    }
  }

  logger.divider();

  // ─── Load config & run ────────────────────────────────────
  const config = loadConfig();

  const hasKey =
    config.llm.openai.apiKey ||
    config.llm.gemini.apiKey ||
    config.llm.deepseek.apiKey;

  if (!hasKey) {
    logger.error(
      "No LLM API key configured. Copy .env.example to .env and set at least one API key."
    );
    process.exit(1);
  }

  const spinner = ora({
    text: chalk.cyan("Initializing orchestrator..."),
    spinner: "dots12",
  }).start();

  try {
    spinner.stop();

    const orchestrator = new Orchestrator(config);
    const result = await orchestrator.run(productIdea.trim());

    logger.divider();
    logger.header("✅ Cortex Pipeline Complete");
    console.log(chalk.bold("\nProject Summary:"));
    console.log(chalk.white(`  ID:       ${result.projectId}`));
    console.log(chalk.white(`  Name:     ${result.projectName}`));
    console.log(
      chalk.white(
        `  Status:   ${result.status === "approved" ? chalk.green("APPROVED ✔") : chalk.red("REJECTED ✖")}`
      )
    );
    console.log(
      chalk.white(
        `  Score:    ${result.principalReview.overallQuality}/10`
      )
    );
    console.log(
      chalk.white(
        `  Files:    ${result.frontendCode.files.length + result.backendCode.files.length + result.databaseCode.files.length + result.qaCode.files.length + result.devopsCode.files.length}`
      )
    );
    console.log(chalk.white(`  Project:  ${result.projectDir}`));
    console.log(chalk.white(`  ZIP:      ${result.zipPath}`));
    logger.divider();
  } catch (err) {
    spinner.stop();
    logger.error("Pipeline failed", err);
    process.exit(1);
  }
}

main();
