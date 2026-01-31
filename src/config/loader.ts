import { cosmiconfig } from "cosmiconfig";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { storyCanvasConfigSchema } from "./schema.js";
import type { StoryCanvasConfig } from "../core/types.js";
import { DEFAULT_CONFIG } from "./defaults.js";

const MODULE_NAME = "storycanvas";

const explorer = cosmiconfig(MODULE_NAME, {
  searchPlaces: [
    `.${MODULE_NAME}rc`,
    `.${MODULE_NAME}rc.json`,
    `.${MODULE_NAME}rc.js`,
    `.${MODULE_NAME}rc.cjs`,
    `${MODULE_NAME}.config.js`,
    `${MODULE_NAME}.config.cjs`,
    `${MODULE_NAME}.config.json`,
  ],
});

export function getConfigPath(): string {
  return join(homedir(), `.${MODULE_NAME}rc`);
}

export function configExists(): boolean {
  return existsSync(getConfigPath());
}

export async function loadConfig(): Promise<StoryCanvasConfig | null> {
  try {
    const result = await explorer.search();

    if (!result || result.isEmpty) {
      const globalPath = getConfigPath();
      if (existsSync(globalPath)) {
        const content = readFileSync(globalPath, "utf-8");
        const parsed = JSON.parse(content);
        return storyCanvasConfigSchema.parse(parsed);
      }
      return null;
    }

    return storyCanvasConfigSchema.parse(result.config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}

export function saveConfig(config: Partial<StoryCanvasConfig>): void {
  const configPath = getConfigPath();
  const fullConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    models: { ...DEFAULT_CONFIG.models, ...config.models },
    image: { ...DEFAULT_CONFIG.image, ...config.image },
    video: { ...DEFAULT_CONFIG.video, ...config.video },
    tts: { ...DEFAULT_CONFIG.tts, ...config.tts },
    audio: { ...DEFAULT_CONFIG.audio, ...config.audio },
    directories: { ...DEFAULT_CONFIG.directories, ...config.directories },
    prompts: { ...DEFAULT_CONFIG.prompts, ...config.prompts },
  };

  writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
}

export function loadConfigSync(): StoryCanvasConfig | null {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return storyCanvasConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}

export function getApiKey(): string | null {
  const config = loadConfigSync();
  return config?.apiKey ?? process.env.GEMINI_API_KEY ?? null;
}

export function validateConfig(
  config: unknown
): config is StoryCanvasConfig {
  try {
    storyCanvasConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}
