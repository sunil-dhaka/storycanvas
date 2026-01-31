import { existsSync, unlinkSync, readFileSync } from "node:fs";
import * as prompts from "../ui/prompts.js";
import { printBanner, printSuccess, printError, printInfo } from "../ui/theme.js";
import {
  loadConfig,
  saveConfig,
  configExists,
  getConfigPath,
} from "../../config/loader.js";
import { DEFAULT_CONFIG, MODEL_OPTIONS } from "../../config/defaults.js";
import { TTS_VOICES } from "../../core/types.js";

interface ConfigOptions {
  show?: boolean;
  edit?: boolean;
  reset?: boolean;
  path?: boolean;
}

export async function config(options: ConfigOptions): Promise<void> {
  printBanner();

  if (options.path) {
    console.log(getConfigPath());
    return;
  }

  if (options.show) {
    await showConfig();
    return;
  }

  if (options.reset) {
    await resetConfig();
    return;
  }

  if (options.edit) {
    await editConfig();
    return;
  }

  prompts.intro("Configuration Management");

  const action = await prompts.select({
    message: "What would you like to do?",
    options: [
      { value: "show", label: "Show current configuration" },
      { value: "edit", label: "Edit configuration" },
      { value: "reset", label: "Reset to defaults" },
      { value: "path", label: "Show config file path" },
    ],
  });

  if (prompts.isCancel(action)) {
    prompts.cancel("Cancelled.");
    return;
  }

  switch (action) {
    case "show":
      await showConfig();
      break;
    case "edit":
      await editConfig();
      break;
    case "reset":
      await resetConfig();
      break;
    case "path":
      console.log(getConfigPath());
      break;
  }
}

async function showConfig(): Promise<void> {
  if (!configExists()) {
    printError("No configuration found. Run 'storycanvas onboard' first.");
    return;
  }

  const configPath = getConfigPath();
  const content = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(content);

  parsed.apiKey = parsed.apiKey
    ? `${parsed.apiKey.slice(0, 6)}...${parsed.apiKey.slice(-4)}`
    : "(not set)";

  console.log("\nCurrent Configuration:\n");
  console.log(JSON.stringify(parsed, null, 2));
  console.log("");
}

async function editConfig(): Promise<void> {
  if (!configExists()) {
    printError("No configuration found. Run 'storycanvas onboard' first.");
    return;
  }

  const currentConfig = await loadConfig();
  if (!currentConfig) {
    printError("Failed to load configuration.");
    return;
  }

  prompts.intro("Edit Configuration");

  const section = await prompts.select({
    message: "Which section would you like to edit?",
    options: [
      { value: "models", label: "Models" },
      { value: "image", label: "Image settings" },
      { value: "video", label: "Video settings" },
      { value: "tts", label: "TTS settings" },
      { value: "audio", label: "Audio settings" },
      { value: "directories", label: "Directories" },
    ],
  });

  if (prompts.isCancel(section)) {
    prompts.cancel("Cancelled.");
    return;
  }

  switch (section) {
    case "models":
      await editModels(currentConfig);
      break;
    case "image":
      await editImageSettings(currentConfig);
      break;
    case "video":
      await editVideoSettings(currentConfig);
      break;
    case "tts":
      await editTTSSettings(currentConfig);
      break;
    case "audio":
      await editAudioSettings(currentConfig);
      break;
    case "directories":
      await editDirectories(currentConfig);
      break;
  }
}

async function editModels(currentConfig: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  if (!currentConfig) return;

  const textModel = await prompts.select({
    message: "Text model:",
    options: MODEL_OPTIONS.text.map((m) => ({ value: m.value, label: m.label })),
    initialValue: currentConfig.models.text,
  });

  if (prompts.isCancel(textModel)) return;

  const imageModel = await prompts.select({
    message: "Image model:",
    options: MODEL_OPTIONS.image.map((m) => ({ value: m.value, label: m.label })),
    initialValue: currentConfig.models.image,
  });

  if (prompts.isCancel(imageModel)) return;

  saveConfig({
    ...currentConfig,
    models: {
      ...currentConfig.models,
      text: textModel,
      image: imageModel,
    },
  });

  printSuccess("Models updated");
}

async function editImageSettings(currentConfig: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  if (!currentConfig) return;

  const maxCharacters = await prompts.text({
    message: "Max character images:",
    defaultValue: String(currentConfig.image.maxCharacterImages),
  });

  if (prompts.isCancel(maxCharacters)) return;

  const maxScenes = await prompts.text({
    message: "Max scene images:",
    defaultValue: String(currentConfig.image.maxSceneImages),
  });

  if (prompts.isCancel(maxScenes)) return;

  saveConfig({
    ...currentConfig,
    image: {
      ...currentConfig.image,
      maxCharacterImages: parseInt(maxCharacters, 10),
      maxSceneImages: parseInt(maxScenes, 10),
    },
  });

  printSuccess("Image settings updated");
}

async function editVideoSettings(currentConfig: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  if (!currentConfig) return;

  const mode = await prompts.select({
    message: "Video mode:",
    options: [
      { value: "slideshow", label: "Image slideshow" },
      { value: "veo", label: "Veo AI video" },
    ],
    initialValue: currentConfig.video.mode,
  });

  if (prompts.isCancel(mode)) return;

  const fps = await prompts.text({
    message: "FPS (frames per second):",
    defaultValue: String(currentConfig.video.fps),
  });

  if (prompts.isCancel(fps)) return;

  saveConfig({
    ...currentConfig,
    video: {
      ...currentConfig.video,
      mode: mode as "slideshow" | "veo",
      fps: parseFloat(fps),
    },
  });

  printSuccess("Video settings updated");
}

async function editTTSSettings(currentConfig: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  if (!currentConfig) return;

  const enabled = await prompts.confirm({
    message: "Enable TTS narration?",
    initialValue: currentConfig.tts.enabled,
  });

  if (prompts.isCancel(enabled)) return;

  const voice = await prompts.select({
    message: "TTS voice:",
    options: TTS_VOICES.slice(0, 10).map((v) => ({
      value: v.name,
      label: v.description ? `${v.name} (${v.description})` : v.name,
    })),
    initialValue: currentConfig.tts.voice,
  });

  if (prompts.isCancel(voice)) return;

  saveConfig({
    ...currentConfig,
    tts: {
      enabled,
      voice,
    },
  });

  printSuccess("TTS settings updated");
}

async function editAudioSettings(currentConfig: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  if (!currentConfig) return;

  const musicVolume = await prompts.text({
    message: "Background music volume (0-1):",
    defaultValue: String(currentConfig.audio.musicVolume),
  });

  if (prompts.isCancel(musicVolume)) return;

  const narrationVolume = await prompts.text({
    message: "Narration volume (0-1):",
    defaultValue: String(currentConfig.audio.narrationVolume),
  });

  if (prompts.isCancel(narrationVolume)) return;

  saveConfig({
    ...currentConfig,
    audio: {
      ...currentConfig.audio,
      musicVolume: parseFloat(musicVolume),
      narrationVolume: parseFloat(narrationVolume),
    },
  });

  printSuccess("Audio settings updated");
}

async function editDirectories(currentConfig: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  if (!currentConfig) return;

  const output = await prompts.text({
    message: "Output directory:",
    defaultValue: currentConfig.directories.output,
  });

  if (prompts.isCancel(output)) return;

  const music = await prompts.text({
    message: "Music directory:",
    defaultValue: currentConfig.directories.music,
  });

  if (prompts.isCancel(music)) return;

  saveConfig({
    ...currentConfig,
    directories: {
      ...currentConfig.directories,
      output,
      music,
    },
  });

  printSuccess("Directories updated");
}

async function resetConfig(): Promise<void> {
  if (!configExists()) {
    printInfo("No configuration to reset.");
    return;
  }

  const confirm = await prompts.confirm({
    message: "Are you sure you want to reset configuration to defaults?",
    initialValue: false,
  });

  if (prompts.isCancel(confirm) || !confirm) {
    prompts.cancel("Reset cancelled.");
    return;
  }

  unlinkSync(getConfigPath());
  printSuccess("Configuration reset. Run 'storycanvas onboard' to set up again.");
}
