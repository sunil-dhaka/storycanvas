import { existsSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { PipelineContext, PipelineStageResult } from "../types.js";
import { extractText, isSupportedFormat } from "../../utils/parsers.js";
import { sanitizeFilename, ensureDir } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";

export async function processInput(
  inputPath: string,
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!existsSync(inputPath)) {
      return {
        success: false,
        message: `File not found: ${inputPath}`,
      };
    }

    if (!isSupportedFormat(inputPath)) {
      const ext = extname(inputPath);
      return {
        success: false,
        message: `Unsupported file format: ${ext}. Supported: .txt, .md, .pdf, .epub`,
      };
    }

    logger.step(`Extracting text from ${basename(inputPath)}...`);

    const text = await extractText(inputPath);

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        message: "No text content extracted from file",
      };
    }

    const title = sanitizeFilename(
      basename(inputPath, extname(inputPath))
    );

    ensureDir(ctx.config.directories.books);
    const bookPath = join(ctx.config.directories.books, `${title}.txt`);
    writeFileSync(bookPath, text);

    ctx.bookTitle = title;
    ctx.bookPath = bookPath;
    ctx.textContent = text;

    logger.success(`Extracted ${text.length} characters from ${title}`);

    return {
      success: true,
      message: `Successfully processed: ${title}`,
      data: {
        title,
        bookPath,
        characterCount: text.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to process input: ${message}`,
    };
  }
}

export function isInputComplete(ctx: PipelineContext): boolean {
  return !!(
    ctx.bookTitle &&
    ctx.bookPath &&
    ctx.textContent &&
    existsSync(ctx.bookPath)
  );
}
