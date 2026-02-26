import chalk from "chalk";

export const logger = {
  info: (msg: string) => {
    console.log(chalk.blue("ℹ"), chalk.gray(msg));
  },

  success: (msg: string) => {
    console.log(chalk.green("✔"), msg);
  },

  warn: (msg: string) => {
    console.log(chalk.yellow("⚠"), chalk.yellow(msg));
  },

  error: (msg: string, err?: unknown) => {
    console.error(chalk.red("✖"), chalk.red(msg));
    if (err instanceof Error) {
      console.error(chalk.red("  →"), chalk.dim(err.message));
    }
  },

  bot: (name: string, msg: string) => {
    console.log(
      chalk.magenta("🤖"),
      chalk.bold.cyan(`[${name}]`),
      chalk.white(msg)
    );
  },

  step: (stepNumber: number, total: number, description: string) => {
    console.log(
      chalk.bold.green(`\n━━━ Step ${stepNumber}/${total}`),
      chalk.bold.white(`— ${description}`),
      chalk.bold.green("━━━")
    );
  },

  divider: () => {
    console.log(chalk.gray("─".repeat(60)));
  },

  header: (title: string) => {
    console.log(chalk.bold.bgBlue.white(`\n  ${title}  \n`));
  },
};
