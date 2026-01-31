import { existsSync } from "node:fs";
import * as prompts from "../ui/prompts.js";
import {
  printBanner,
  printSuccess,
  printError,
  printWarning,
  printInfo,
} from "../ui/theme.js";
import { loadConfig, configExists, getConfigPath } from "../../config/loader.js";
import { validateApiKey } from "../../services/gemini.js";
import { checkFfmpeg } from "../../services/ffmpeg.js";

export async function doctor(): Promise<void> {
  printBanner();
  prompts.intro("StoryCanvas Diagnostics");

  let allPassed = true;

  prompts.log({ type: "step", message: "Checking system requirements..." });

  printInfo(`Node.js: ${process.version}`);
  const nodeVersion = parseInt(process.version.slice(1).split(".")[0], 10);
  if (nodeVersion >= 22) {
    printSuccess("Node.js version is compatible");
  } else {
    printWarning("Node.js 22+ recommended");
    allPassed = false;
  }

  if (checkFfmpeg()) {
    printSuccess("ffmpeg found");
  } else {
    printInfo("ffmpeg-static will be used (bundled)");
  }

  prompts.log({ type: "step", message: "Checking configuration..." });

  if (configExists()) {
    printSuccess(`Config found: ${getConfigPath()}`);

    const config = await loadConfig();

    if (config) {
      printSuccess("Config is valid");

      prompts.log({ type: "step", message: "Validating API key..." });

      const s = prompts.spinner();
      s.start("Testing API connection...");

      const isValid = await validateApiKey(config.apiKey);

      if (isValid) {
        s.stop("API key is valid");
        printSuccess("Gemini API connection successful");
      } else {
        s.stop("API key validation failed", 1);
        printError("API key is invalid or expired");
        allPassed = false;
      }

      prompts.log({ type: "step", message: "Checking directories..." });

      const dirs = [
        { name: "Output", path: config.directories.output },
        { name: "Music", path: config.directories.music },
        { name: "Books", path: config.directories.books },
      ];

      for (const dir of dirs) {
        if (existsSync(dir.path)) {
          printSuccess(`${dir.name} directory: ${dir.path}`);
        } else {
          printInfo(`${dir.name} directory will be created: ${dir.path}`);
        }
      }

      prompts.log({ type: "step", message: "Current configuration:" });

      console.log("");
      console.log(`  Text model:  ${config.models.text}`);
      console.log(`  Image model: ${config.models.image}`);
      console.log(`  TTS model:   ${config.models.tts}`);
      console.log(`  Video model: ${config.models.video}`);
      console.log(`  TTS enabled: ${config.tts.enabled}`);
      console.log(`  TTS voice:   ${config.tts.voice}`);
      console.log(`  Video mode:  ${config.video.mode}`);
      console.log(`  Resolution:  ${config.video.resolution}`);
      console.log("");
    } else {
      printError("Config file is invalid");
      allPassed = false;
    }
  } else {
    printWarning("No configuration found");
    printInfo("Run 'storycanvas onboard' to set up");
    allPassed = false;
  }

  if (allPassed) {
    prompts.outro("All checks passed! StoryCanvas is ready to use.");
  } else {
    prompts.outro("Some issues found. Please address them before using StoryCanvas.");
    process.exit(1);
  }
}
