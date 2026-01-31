import { existsSync } from "node:fs";
import * as prompts from "../ui/prompts.js";
import { printBanner, printSuccess, printError, printInfo } from "../ui/theme.js";
import { saveConfig, configExists, getConfigPath } from "../../config/loader.js";
import { validateApiKey } from "../../services/gemini.js";
import { checkFfmpeg } from "../../services/ffmpeg.js";
import { MODEL_OPTIONS, ASPECT_RATIO_OPTIONS } from "../../config/defaults.js";
import { TTS_VOICES } from "../../core/types.js";

export async function onboard(): Promise<void> {
  printBanner();

  if (configExists()) {
    const overwrite = await prompts.confirm({
      message: "Configuration already exists. Overwrite?",
      initialValue: false,
    });

    if (prompts.isCancel(overwrite) || !overwrite) {
      prompts.cancel("Onboarding cancelled.");
      return;
    }
  }

  prompts.intro("Welcome to StoryCanvas! Let's set you up.");

  prompts.log({ type: "step", message: "Step 1/5: API Key" });

  const apiKey = await prompts.password({
    message: "Enter your Gemini API key:",
    validate: (value) => {
      if (!value || value.length < 10) {
        return "Please enter a valid API key";
      }
    },
  });

  if (prompts.isCancel(apiKey)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  prompts.log({ type: "step", message: "Step 2/5: System Check" });

  const s = prompts.spinner();
  s.start("Validating API key...");

  const isValid = await validateApiKey(apiKey);
  if (!isValid) {
    s.stop("API key validation failed", 1);
    printError("Invalid API key. Please check and try again.");
    process.exit(1);
  }
  s.stop("API key validated successfully");

  if (checkFfmpeg()) {
    printSuccess("ffmpeg found");
  } else {
    printInfo("ffmpeg-static will be used for video processing");
  }

  printSuccess("Node.js " + process.version);

  prompts.log({ type: "step", message: "Step 3/5: Model Selection" });

  const textModel = await prompts.select({
    message: "Text processing model:",
    options: MODEL_OPTIONS.text.map((m) => ({
      value: m.value,
      label: m.label,
    })),
  });

  if (prompts.isCancel(textModel)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  const imageModel = await prompts.select({
    message: "Image generation model:",
    options: MODEL_OPTIONS.image.map((m) => ({
      value: m.value,
      label: m.label,
    })),
  });

  if (prompts.isCancel(imageModel)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  const ttsVoice = await prompts.select({
    message: "TTS voice:",
    options: TTS_VOICES.slice(0, 10).map((v) => ({
      value: v.name,
      label: v.description ? `${v.name} (${v.description})` : v.name,
    })),
  });

  if (prompts.isCancel(ttsVoice)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  prompts.log({ type: "step", message: "Step 4/5: Output Directory" });

  const outputDir = await prompts.text({
    message: "Where should StoryCanvas save outputs?",
    defaultValue: "./storycanvas-output",
    placeholder: "./storycanvas-output",
  });

  if (prompts.isCancel(outputDir)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  prompts.log({ type: "step", message: "Step 5/5: Video Settings" });

  const aspectRatio = await prompts.select({
    message: "Default aspect ratio:",
    options: ASPECT_RATIO_OPTIONS.map((a) => ({
      value: a.value,
      label: a.label,
    })),
  });

  if (prompts.isCancel(aspectRatio)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  const enableTTS = await prompts.confirm({
    message: "Enable TTS narration by default?",
    initialValue: true,
  });

  if (prompts.isCancel(enableTTS)) {
    prompts.cancel("Onboarding cancelled.");
    return;
  }

  saveConfig({
    apiKey,
    models: {
      text: textModel,
      image: imageModel,
      tts: "gemini-2.5-flash-preview-tts",
      video: "veo-3.1-fast",
    },
    image: {
      maxCharacterImages: 30,
      maxSceneImages: 50,
      aspectRatio: aspectRatio as "9:16" | "16:9" | "1:1",
      personGeneration: "allow_adult",
      retryAttempts: 3,
      retryDelay: 2,
    },
    video: {
      mode: "slideshow",
      fps: 0.5,
      resolution: "1080p",
    },
    tts: {
      enabled: enableTTS,
      voice: ttsVoice,
    },
    audio: {
      musicVolume: 0.3,
      narrationVolume: 1.0,
      supportedFormats: [".mp3", ".m4a", ".wav", ".aac", ".ogg"],
    },
    directories: {
      output: outputDir,
      music: "./music",
      books: "./books",
    },
  });

  prompts.note(
    `Config saved to: ${getConfigPath()}\n\nRun 'storycanvas create' to start!`,
    "Setup complete!"
  );

  prompts.outro("Happy creating!");
}
