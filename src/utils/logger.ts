import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error";

let currentLevel: LogLevel = "info";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function timestamp(): string {
  return new Date().toISOString();
}

export function debug(message: string, ...args: unknown[]): void {
  if (shouldLog("debug")) {
    console.log(chalk.gray(`[${timestamp()}] DEBUG:`), message, ...args);
  }
}

export function info(message: string, ...args: unknown[]): void {
  if (shouldLog("info")) {
    console.log(chalk.blue(`[${timestamp()}] INFO:`), message, ...args);
  }
}

export function warn(message: string, ...args: unknown[]): void {
  if (shouldLog("warn")) {
    console.log(chalk.yellow(`[${timestamp()}] WARN:`), message, ...args);
  }
}

export function error(message: string, ...args: unknown[]): void {
  if (shouldLog("error")) {
    console.log(chalk.red(`[${timestamp()}] ERROR:`), message, ...args);
  }
}

export function success(message: string): void {
  console.log(chalk.green(`[OK]`), message);
}

export function step(message: string): void {
  console.log(chalk.cyan(`[*]`), message);
}

export const logger = {
  debug,
  info,
  warn,
  error,
  success,
  step,
  setLevel: setLogLevel,
};
