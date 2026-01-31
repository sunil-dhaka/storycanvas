import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PipelineContext, PipelineStageResult } from "../types.js";
import { sanitizeFilename, ensureDir } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";

const GUTENBERG_BASE_URL = "https://www.gutenberg.org/files";
const GUTENBERG_FALLBACK_URL = "https://www.gutenberg.org/ebooks";
const GUTENBERG_HEADER_MARKER = "*** START OF THE PROJECT GUTENBERG EBOOK";
const GUTENBERG_FOOTER_MARKER = "*** END OF THE PROJECT GUTENBERG EBOOK";

export interface BookInfo {
  id: number;
  title: string;
  author: string;
  language: string;
}

export async function downloadBook(
  bookId: number,
  ctx: PipelineContext,
  catalogPath?: string
): Promise<PipelineStageResult> {
  try {
    logger.step(`Downloading book #${bookId} from Project Gutenberg...`);

    let bookInfo: BookInfo | null = null;
    if (catalogPath && existsSync(catalogPath)) {
      bookInfo = findBookInCatalog(bookId, catalogPath);
      if (bookInfo && bookInfo.language.toLowerCase() !== "english") {
        return {
          success: false,
          message: `Book #${bookId} is not in English (${bookInfo.language})`,
        };
      }
    }

    const text = await fetchBookText(bookId);

    if (!text) {
      return {
        success: false,
        message: `Failed to download book #${bookId}`,
      };
    }

    const cleanedText = stripGutenbergHeaders(text);

    const title = bookInfo?.title ?? `gutenberg_${bookId}`;
    const sanitizedTitle = sanitizeFilename(title);

    ensureDir(ctx.config.directories.books);
    const bookPath = join(
      ctx.config.directories.books,
      `${sanitizedTitle}.txt`
    );
    writeFileSync(bookPath, cleanedText);

    ctx.bookTitle = sanitizedTitle;
    ctx.bookPath = bookPath;
    ctx.textContent = cleanedText;

    logger.success(
      `Downloaded: ${title} (${cleanedText.length} characters)`
    );

    return {
      success: true,
      message: `Successfully downloaded: ${title}`,
      data: {
        bookId,
        title,
        author: bookInfo?.author,
        bookPath,
        characterCount: cleanedText.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to download book: ${message}`,
    };
  }
}

async function fetchBookText(bookId: number): Promise<string | null> {
  const urls = [
    `${GUTENBERG_BASE_URL}/${bookId}/${bookId}-0.txt`,
    `${GUTENBERG_BASE_URL}/${bookId}/${bookId}.txt`,
    `${GUTENBERG_FALLBACK_URL}/${bookId}.txt.utf-8`,
  ];

  for (const url of urls) {
    try {
      logger.debug(`Trying: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "StoryCanvas/1.0 (Book-to-Video Pipeline)",
        },
      });

      if (response.ok) {
        return response.text();
      }
    } catch {
      continue;
    }
  }

  return null;
}

function stripGutenbergHeaders(text: string): string {
  let result = text;

  const headerIndex = result.indexOf(GUTENBERG_HEADER_MARKER);
  if (headerIndex !== -1) {
    const headerEnd = result.indexOf("\n", headerIndex);
    if (headerEnd !== -1) {
      result = result.slice(headerEnd + 1);
    }
  }

  const footerIndex = result.indexOf(GUTENBERG_FOOTER_MARKER);
  if (footerIndex !== -1) {
    result = result.slice(0, footerIndex);
  }

  return result.trim();
}

function findBookInCatalog(
  bookId: number,
  catalogPath: string
): BookInfo | null {
  try {
    const content = readFileSync(catalogPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length >= 4) {
        const id = parseInt(parts[0], 10);
        if (id === bookId) {
          return {
            id,
            title: parts[1]?.replace(/"/g, "") ?? "",
            author: parts[2]?.replace(/"/g, "") ?? "",
            language: parts[3]?.replace(/"/g, "") ?? "",
          };
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function searchBooks(
  query: string,
  catalogPath: string,
  limit: number = 10
): Promise<BookInfo[]> {
  const results: BookInfo[] = [];

  try {
    const content = readFileSync(catalogPath, "utf-8");
    const lines = content.split("\n");
    const lowerQuery = query.toLowerCase();

    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length >= 4) {
        const title = parts[1]?.replace(/"/g, "") ?? "";
        const author = parts[2]?.replace(/"/g, "") ?? "";
        const language = parts[3]?.replace(/"/g, "") ?? "";

        if (
          language.toLowerCase() === "english" &&
          (title.toLowerCase().includes(lowerQuery) ||
            author.toLowerCase().includes(lowerQuery))
        ) {
          results.push({
            id: parseInt(parts[0], 10),
            title,
            author,
            language,
          });

          if (results.length >= limit) {
            break;
          }
        }
      }
    }
  } catch {
    return [];
  }

  return results;
}

export function isGutenbergComplete(ctx: PipelineContext): boolean {
  return !!(
    ctx.bookTitle &&
    ctx.bookPath &&
    ctx.textContent &&
    existsSync(ctx.bookPath)
  );
}
