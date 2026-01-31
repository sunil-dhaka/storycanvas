import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as prompts from "../ui/prompts.js";
import { printBanner, printInfo, printList, printSuccess } from "../ui/theme.js";
import { loadConfig, configExists } from "../../config/loader.js";
import { searchBooks, downloadBook, type BookInfo } from "../../core/stages/gutenberg.js";
import { createContext } from "../../core/pipeline.js";

interface BooksOptions {
  search?: string;
  download?: string;
  list?: boolean;
}

const DEFAULT_CATALOG_PATH = "./pg_catalog.csv";

export async function books(options: BooksOptions): Promise<void> {
  printBanner();

  if (options.list) {
    await listDownloadedBooks();
    return;
  }

  if (options.download) {
    await downloadBookById(parseInt(options.download, 10));
    return;
  }

  if (options.search) {
    await searchGutenberg(options.search);
    return;
  }

  prompts.intro("Project Gutenberg Books");

  const action = await prompts.select({
    message: "What would you like to do?",
    options: [
      { value: "search", label: "Search for books" },
      { value: "download", label: "Download a book by ID" },
      { value: "list", label: "List downloaded books" },
    ],
  });

  if (prompts.isCancel(action)) {
    prompts.cancel("Cancelled.");
    return;
  }

  switch (action) {
    case "search": {
      const query = await prompts.text({
        message: "Enter search query (title or author):",
      });

      if (prompts.isCancel(query)) {
        prompts.cancel("Cancelled.");
        return;
      }

      await searchGutenberg(query);
      break;
    }

    case "download": {
      const bookId = await prompts.text({
        message: "Enter the Project Gutenberg book ID:",
        placeholder: "e.g., 74",
        validate: (value) => {
          const id = parseInt(value, 10);
          if (isNaN(id) || id <= 0) return "Please enter a valid book ID";
        },
      });

      if (prompts.isCancel(bookId)) {
        prompts.cancel("Cancelled.");
        return;
      }

      await downloadBookById(parseInt(bookId, 10));
      break;
    }

    case "list":
      await listDownloadedBooks();
      break;
  }
}

async function searchGutenberg(query: string): Promise<void> {
  if (!existsSync(DEFAULT_CATALOG_PATH)) {
    printInfo(
      "Catalog file not found. Searching requires pg_catalog.csv"
    );
    printInfo(
      "Download from: https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv"
    );
    return;
  }

  const s = prompts.spinner();
  s.start(`Searching for "${query}"...`);

  const results = await searchBooks(query, DEFAULT_CATALOG_PATH, 20);

  s.stop(`Found ${results.length} results`);

  if (results.length === 0) {
    printInfo("No books found matching your query.");
    return;
  }

  console.log("\nSearch Results:\n");

  results.forEach((book, i) => {
    console.log(`  ${i + 1}. [${book.id}] ${book.title}`);
    console.log(`     Author: ${book.author}`);
    console.log("");
  });

  const downloadChoice = await prompts.confirm({
    message: "Would you like to download one of these books?",
    initialValue: true,
  });

  if (prompts.isCancel(downloadChoice) || !downloadChoice) {
    return;
  }

  const selectedBook = await prompts.select({
    message: "Select a book to download:",
    options: results.map((book) => ({
      value: String(book.id),
      label: `[${book.id}] ${book.title}`,
      hint: book.author,
    })),
  });

  if (prompts.isCancel(selectedBook)) {
    return;
  }

  await downloadBookById(parseInt(selectedBook, 10));
}

async function downloadBookById(bookId: number): Promise<void> {
  const config = await loadConfig();

  if (!config) {
    printInfo("No configuration found. Using defaults.");
    return;
  }

  const ctx = createContext(config);

  const s = prompts.spinner();
  s.start(`Downloading book #${bookId}...`);

  const result = await downloadBook(bookId, ctx, DEFAULT_CATALOG_PATH);

  if (result.success) {
    s.stop("Download complete!");
    printSuccess(`Downloaded: ${ctx.bookTitle}`);
    printInfo(`Saved to: ${ctx.bookPath}`);
    printInfo(`Characters: ${ctx.textContent.length.toLocaleString()}`);
  } else {
    s.stop("Download failed", 1);
    prompts.log({ type: "error", message: result.message });
  }
}

async function listDownloadedBooks(): Promise<void> {
  const config = await loadConfig();
  const booksDir = config?.directories.books ?? "./books";

  if (!existsSync(booksDir)) {
    printInfo("No books directory found.");
    return;
  }

  const files = readdirSync(booksDir).filter((f) => f.endsWith(".txt"));

  if (files.length === 0) {
    printInfo("No downloaded books found.");
    return;
  }

  console.log("\nDownloaded Books:\n");
  printList(files.map((f) => f.replace(".txt", "")));
  console.log("");
}
