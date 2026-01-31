import { Command } from "commander";
import { onboard } from "./commands/onboard.js";
import { create } from "./commands/create.js";
import { books } from "./commands/books.js";
import { doctor } from "./commands/doctor.js";
import { config } from "./commands/config.js";

const program = new Command();

program
  .name("storycanvas")
  .description("Transform books into multimedia content with Google Gemini AI")
  .version("0.1.0");

program
  .command("onboard")
  .description("Interactive setup wizard for first-time configuration")
  .action(onboard);

program
  .command("create")
  .description("Create multimedia content from text")
  .option("-f, --file <path>", "Path to input file (.txt, .pdf, .epub, .md)")
  .option("-g, --gutenberg <id>", "Project Gutenberg book ID to download")
  .option(
    "-s, --stages <stages>",
    "Comma-separated list of stages to run (illustrations,narration,video,music,metadata)"
  )
  .option("-m, --mode <mode>", "Video mode: slideshow or veo")
  .action(create);

program
  .command("books")
  .description("Browse and download books from Project Gutenberg")
  .option("-s, --search <query>", "Search for books by title or author")
  .option("-d, --download <id>", "Download a book by ID")
  .option("-l, --list", "List downloaded books")
  .action(books);

program
  .command("doctor")
  .description("Run diagnostics and check system setup")
  .action(doctor);

program
  .command("config")
  .description("View and manage configuration")
  .option("--show", "Show current configuration")
  .option("--edit", "Edit configuration interactively")
  .option("--reset", "Reset configuration to defaults")
  .option("--path", "Show config file path")
  .action(config);

program.parse();
