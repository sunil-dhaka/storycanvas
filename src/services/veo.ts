import { getClient } from "./gemini.js";
import { writeFileSync } from "node:fs";
import { logger } from "../utils/logger.js";

export interface VeoConfig {
  model: string;
  aspectRatio?: "16:9" | "9:16";
  duration?: number;
}

export interface VeoResult {
  success: boolean;
  path?: string;
  error?: string;
}

export async function generateVideo(
  prompt: string,
  outputPath: string,
  config: VeoConfig
): Promise<VeoResult> {
  const client = getClient();

  try {
    logger.step(`Generating video with Veo: ${config.model}`);
    logger.debug(`Prompt: ${prompt.slice(0, 100)}...`);

    const response = await client.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        responseModalities: ["VIDEO"],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      return {
        success: false,
        error: "No candidates in Veo response",
      };
    }

    const parts = response.candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      return {
        success: false,
        error: "No parts in Veo response",
      };
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        const videoBuffer = Buffer.from(part.inlineData.data, "base64");
        const videoPath = outputPath.endsWith(".mp4")
          ? outputPath
          : `${outputPath}.mp4`;

        writeFileSync(videoPath, videoBuffer);

        return {
          success: true,
          path: videoPath,
        };
      }
    }

    return {
      success: false,
      error: "No video data found in response",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
}

export async function generateVideoFromText(
  text: string,
  outputPath: string,
  config: VeoConfig,
  summaryModel: string = "gemini-2.5-flash"
): Promise<VeoResult> {
  const client = getClient();

  try {
    logger.step("Generating video prompt from text...");

    const summaryResponse = await client.models.generateContent({
      model: summaryModel,
      contents: `
Create a detailed video generation prompt based on this text.
The prompt should describe visual scenes, characters, actions, and mood
that would work well for an AI video generator.
Keep it under 500 words but be descriptive.

Text:
${text.slice(0, 10000)}
      `.trim(),
    });

    const videoPrompt = summaryResponse.text ?? text.slice(0, 1000);
    logger.debug(`Generated video prompt: ${videoPrompt.slice(0, 200)}...`);

    return generateVideo(videoPrompt, outputPath, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to generate video from text: ${message}`,
    };
  }
}

export async function generateVideoScenes(
  scenes: string[],
  outputDir: string,
  config: VeoConfig
): Promise<{ success: boolean; paths: string[]; errors: string[] }> {
  const paths: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const outputPath = `${outputDir}/scene_${String(i + 1).padStart(3, "0")}.mp4`;

    logger.step(`Generating video for scene ${i + 1}/${scenes.length}`);

    const result = await generateVideo(scene, outputPath, config);

    if (result.success && result.path) {
      paths.push(result.path);
    } else {
      errors.push(`Scene ${i + 1}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    paths,
    errors,
  };
}

export function isVeoModel(model: string): boolean {
  return model.startsWith("veo-");
}
