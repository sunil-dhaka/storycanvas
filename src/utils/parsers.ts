import { readFileSync } from "node:fs";
import { extname } from "node:path";
import pdfParse from "pdf-parse";
import EPub from "epub2";

const ENCODING_FALLBACKS = ["utf-8", "latin1", "cp1252"] as const;

export async function extractText(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".txt":
    case ".md":
      return extractTextFromTxt(filePath);
    case ".pdf":
      return extractTextFromPdf(filePath);
    case ".epub":
      return extractTextFromEpub(filePath);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

function extractTextFromTxt(filePath: string): string {
  for (const encoding of ENCODING_FALLBACKS) {
    try {
      const content = readFileSync(filePath, { encoding: encoding as BufferEncoding });
      if (content.length > 0) {
        return content;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to read text file with any encoding: ${filePath}`);
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractTextFromEpub(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on("error", (err: Error) => {
      reject(new Error(`Failed to parse EPUB: ${err.message}`));
    });

    epub.on("end", async () => {
      try {
        const chapters: string[] = [];

        for (const item of epub.flow) {
          if (item.id) {
            const chapterText = await getChapterText(epub, item.id);
            if (chapterText) {
              chapters.push(chapterText);
            }
          }
        }

        resolve(chapters.join("\n\n"));
      } catch (err) {
        reject(err);
      }
    });

    epub.parse();
  });
}

function getChapterText(epub: EPub, chapterId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err: Error, text?: string) => {
      if (err) {
        reject(err);
        return;
      }

      const plainText = stripHtml(text ?? "");
      resolve(plainText);
    });
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSupportedFormats(): string[] {
  return [".txt", ".md", ".pdf", ".epub"];
}

export function isSupportedFormat(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return getSupportedFormats().includes(ext);
}
