import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;
const MAX_FILENAME_LENGTH = 240;

export function sanitizeFilename(filename: string): string {
  let sanitized = filename.replace(INVALID_FILENAME_CHARS, "");
  sanitized = sanitized.trim();

  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = extname(sanitized);
    const name = basename(sanitized, ext);
    sanitized = name.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }

  return sanitized;
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function listFiles(
  dirPath: string,
  extensions?: string[]
): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = readdirSync(dirPath);

  return files
    .filter((file) => {
      const filePath = join(dirPath, file);
      if (!statSync(filePath).isFile()) return false;

      if (extensions) {
        const ext = extname(file).toLowerCase();
        return extensions.includes(ext);
      }

      return true;
    })
    .map((file) => join(dirPath, file));
}

export function naturalSort(files: string[]): string[] {
  return files.sort((a, b) => {
    const aName = basename(a);
    const bName = basename(b);

    return aName.localeCompare(bName, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function getBookTitle(filePath: string): string {
  const name = basename(filePath);
  const ext = extname(name);
  return name.slice(0, -ext.length);
}

export function createOutputDir(
  baseDir: string,
  bookTitle: string
): string {
  const sanitized = sanitizeFilename(bookTitle);
  const outputDir = join(baseDir, sanitized);
  ensureDir(outputDir);
  return outputDir;
}

export function getSubdirs(baseDir: string, bookTitle: string): {
  characters: string;
  scenes: string;
  audio: string;
  video: string;
} {
  const outputDir = createOutputDir(baseDir, bookTitle);

  const dirs = {
    characters: join(outputDir, "characters"),
    scenes: join(outputDir, "scenes"),
    audio: join(outputDir, "audio"),
    video: join(outputDir, "video"),
  };

  Object.values(dirs).forEach(ensureDir);

  return dirs;
}
