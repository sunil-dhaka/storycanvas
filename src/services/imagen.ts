import { getClient } from "./gemini.js";
import { PersonGeneration as SDKPersonGeneration } from "@google/genai";
import type { AspectRatio, PersonGeneration } from "../core/types.js";
import { writeFileSync } from "node:fs";
import { logger } from "../utils/logger.js";

export interface ImageGenerationConfig {
  model: string;
  numberOfImages?: number;
  aspectRatio?: AspectRatio;
  personGeneration?: PersonGeneration;
}

export interface GeneratedImageResult {
  success: boolean;
  path?: string;
  error?: string;
}

function toSDKPersonGeneration(value?: PersonGeneration): SDKPersonGeneration {
  switch (value) {
    case "dont_allow":
      return SDKPersonGeneration.DONT_ALLOW;
    case "allow_all":
      return SDKPersonGeneration.ALLOW_ALL;
    case "allow_adult":
    default:
      return SDKPersonGeneration.ALLOW_ADULT;
  }
}

export async function generateImage(
  prompt: string,
  outputPath: string,
  config: ImageGenerationConfig
): Promise<GeneratedImageResult> {
  const client = getClient();

  try {
    const response = await client.models.generateImages({
      model: config.model,
      prompt,
      config: {
        numberOfImages: config.numberOfImages ?? 1,
        aspectRatio: config.aspectRatio ?? "9:16",
        personGeneration: toSDKPersonGeneration(config.personGeneration),
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      return {
        success: false,
        error: "No images generated",
      };
    }

    const image = response.generatedImages[0];

    if (!image.image?.imageBytes) {
      return {
        success: false,
        error: "No image data in response",
      };
    }

    const imageBuffer = Buffer.from(image.image.imageBytes, "base64");
    writeFileSync(outputPath, imageBuffer);

    return {
      success: true,
      path: outputPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
}

export async function generateImageWithRetry(
  prompt: string,
  outputPath: string,
  config: ImageGenerationConfig,
  retryAttempts: number = 3,
  retryDelay: number = 2
): Promise<GeneratedImageResult> {
  let lastError = "";

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    const result = await generateImage(prompt, outputPath, config);

    if (result.success) {
      return result;
    }

    lastError = result.error ?? "Unknown error";
    logger.warn(`Image generation attempt ${attempt} failed: ${lastError}`);

    if (attempt < retryAttempts) {
      const delay = retryDelay * Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: `Failed after ${retryAttempts} attempts: ${lastError}`,
  };
}

export async function generateNanoBananaImage(
  prompt: string,
  outputPath: string,
  model: string = "gemini-2.5-flash-image"
): Promise<GeneratedImageResult> {
  const client = getClient();

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      return {
        success: false,
        error: "No candidates in response",
      };
    }

    const parts = response.candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      return {
        success: false,
        error: "No parts in response",
      };
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        const imageBuffer = Buffer.from(part.inlineData.data, "base64");
        writeFileSync(outputPath, imageBuffer);
        return {
          success: true,
          path: outputPath,
        };
      }
    }

    return {
      success: false,
      error: "No image data found in response parts",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
}

export function isNanoBananaModel(model: string): boolean {
  return (
    model.includes("flash-image") ||
    model.includes("pro-image") ||
    model === "gemini-2.5-flash-image" ||
    model === "gemini-3-pro-image-preview"
  );
}

export async function generateImageAuto(
  prompt: string,
  outputPath: string,
  config: ImageGenerationConfig,
  retryAttempts: number = 3,
  retryDelay: number = 2
): Promise<GeneratedImageResult> {
  if (isNanoBananaModel(config.model)) {
    return generateNanoBananaImage(prompt, outputPath, config.model);
  }

  return generateImageWithRetry(
    prompt,
    outputPath,
    config,
    retryAttempts,
    retryDelay
  );
}
