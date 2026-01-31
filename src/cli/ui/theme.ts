import chalk from "chalk";

export const theme = {
  primary: chalk.cyan,
  secondary: chalk.gray,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  highlight: chalk.bold.white,
  dim: chalk.dim,
  accent: chalk.magenta,
};

export const symbols = {
  check: theme.success("[OK]"),
  cross: theme.error("[X]"),
  warning: theme.warning("[!]"),
  info: theme.info("[i]"),
  arrow: theme.primary(">"),
  bullet: theme.dim("-"),
};

export const BANNER = `
  ____  _                     ____
 / ___|| |_ ___  _ __ _   _  / ___|__ _ _ ____   ____ _ ___
 \\___ \\| __/ _ \\| '__| | | || |   / _\` | '_ \\ \\ / / _\` / __|
  ___) | || (_) | |  | |_| || |__| (_| | | | \\ V / (_| \\__ \\
 |____/ \\__\\___/|_|   \\__, | \\____\\__,_|_| |_|\\_/ \\__,_|___/
                      |___/
`;

export function printBanner(): void {
  console.log(theme.primary(BANNER));
  console.log(
    theme.secondary(
      "  Transform books into multimedia with Google Gemini AI\n"
    )
  );
}

export function printVersion(version: string): void {
  console.log(theme.dim(`  v${version}\n`));
}

export function printSuccess(message: string): void {
  console.log(`${symbols.check} ${message}`);
}

export function printError(message: string): void {
  console.log(`${symbols.cross} ${theme.error(message)}`);
}

export function printWarning(message: string): void {
  console.log(`${symbols.warning} ${theme.warning(message)}`);
}

export function printInfo(message: string): void {
  console.log(`${symbols.info} ${message}`);
}

export function printStep(message: string): void {
  console.log(`${symbols.arrow} ${message}`);
}

export function printList(items: string[]): void {
  items.forEach((item) => {
    console.log(`  ${symbols.bullet} ${item}`);
  });
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
