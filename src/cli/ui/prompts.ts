import * as p from "@clack/prompts";
import chalk from "chalk";

export async function text(options: {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | void;
}): Promise<string | symbol> {
  return p.text(options);
}

export async function password(options: {
  message: string;
  validate?: (value: string) => string | void;
}): Promise<string | symbol> {
  return p.password(options);
}

export async function confirm(options: {
  message: string;
  initialValue?: boolean;
}): Promise<boolean | symbol> {
  return p.confirm(options);
}

export async function select<T extends string>(options: {
  message: string;
  options: Array<{ value: T; label: string; hint?: string }>;
  initialValue?: T;
}): Promise<T | symbol> {
  return p.select(options);
}

export async function multiselect<T extends string>(options: {
  message: string;
  options: Array<{ value: T; label: string; hint?: string }>;
  required?: boolean;
  initialValues?: T[];
}): Promise<T[] | symbol> {
  return p.multiselect(options);
}

export function spinner(): {
  start: (message?: string) => void;
  stop: (message?: string, code?: number) => void;
  message: (message?: string) => void;
} {
  return p.spinner();
}

export function intro(message: string): void {
  p.intro(chalk.bgCyan.black(` ${message} `));
}

export function outro(message: string): void {
  p.outro(chalk.green(message));
}

export function note(message: string, title?: string): void {
  p.note(message, title);
}

export function cancel(message: string): void {
  p.cancel(message);
  process.exit(0);
}

export function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

export function log(options: {
  type: "info" | "warn" | "error" | "success" | "step" | "message";
  message: string;
}): void {
  switch (options.type) {
    case "info":
      p.log.info(options.message);
      break;
    case "warn":
      p.log.warn(options.message);
      break;
    case "error":
      p.log.error(options.message);
      break;
    case "success":
      p.log.success(options.message);
      break;
    case "step":
      p.log.step(options.message);
      break;
    default:
      p.log.message(options.message);
  }
}

export async function group<T extends Record<string, unknown>>(
  prompts: () => Promise<T>,
  options?: { onCancel?: () => void }
): Promise<T> {
  return p.group(prompts, options);
}
