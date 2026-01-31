import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  PipelineContext,
  PipelineStageResult,
} from "../types.js";
import { generateJsonContent, generateContent } from "../../services/gemini.js";
import { generateImageAuto, type ImageGenerationConfig } from "../../services/imagen.js";
import { ensureDir, getSubdirs } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";

interface ImagePromptData {
  prompt: string;
  description: string;
}

export interface GeneratedScene {
  imagePath: string;
  promptDescription: string;
  type: "character" | "scene";
  index: number;
}

export async function generateIllustrations(
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!ctx.textContent || !ctx.bookTitle) {
      return {
        success: false,
        message: "No text content available for illustration",
      };
    }

    const dirs = getSubdirs(ctx.config.directories.output, ctx.bookTitle);
    ctx.outputDir = join(ctx.config.directories.output, ctx.bookTitle);

    const textSample = ctx.textContent.slice(0, 30000);

    logger.step("Generating art style for the book...");

    const artStylePrompt = `
Based on this book excerpt, define an art style that would fit the story.
Give me just the prompt for the art style (1-2 sentences) that will be added to future image prompts.
Be specific about colors, mood, and visual style.

Book excerpt:
${textSample.slice(0, 5000)}
    `.trim();

    ctx.artStyle = await generateContent(
      ctx.config.models.text,
      artStylePrompt
    );

    if (!ctx.artStyle) {
      ctx.artStyle = "Detailed digital illustration, cinematic lighting, rich colors";
    }

    logger.success(`Art style: ${ctx.artStyle.slice(0, 100)}...`);

    logger.step("Generating character illustrations...");

    const characterPrompt = `
You are creating a visual story from this book. For each main character, provide:
1. "prompt": A detailed image generation prompt (50+ words) describing their appearance for an AI image generator
2. "description": A brief description (1 sentence) of who this character is and their role in the story

Limit to 5 main characters maximum.

Return a JSON array with "prompt" and "description" fields.
Example: [{"prompt": "A tall elderly wizard with long grey beard, wearing tattered grey robes...", "description": "Gandalf, the wise wizard who guides the fellowship on their quest."}]

Book text:
${textSample}
    `.trim();

    const characterData = await generateJsonContent<ImagePromptData[]>(
      ctx.config.models.text,
      characterPrompt
    );

    logger.step("Generating scene illustrations...");

    const scenePrompt = `
You are creating a visual story from this book. Create 10 key scenes that tell the story visually.
For each scene, provide:
1. "prompt": A detailed image generation prompt (30+ words) describing the scene for an AI image generator
2. "description": A brief description (1-2 sentences) of what is happening in this scene and why it matters

Scenes should be in story order to create a coherent visual narrative arc.

Return a JSON array with "prompt" and "description" fields.
Example: [{"prompt": "A dark forest clearing at midnight with twisted trees...", "description": "The hero enters the forbidden forest, leaving behind the safety of the village."}]

Book text:
${textSample}
    `.trim();

    const sceneData = await generateJsonContent<ImagePromptData[]>(
      ctx.config.models.text,
      scenePrompt
    );

    const safeCharacterData = Array.isArray(characterData) ? characterData : [];
    const safeSceneData = Array.isArray(sceneData) ? sceneData : [];

    logger.info(`Got ${safeCharacterData.length} characters, ${safeSceneData.length} scenes`);

    const imageConfig: ImageGenerationConfig = {
      model: ctx.config.models.image,
      aspectRatio: ctx.config.image.aspectRatio,
      personGeneration: ctx.config.image.personGeneration,
      numberOfImages: 1,
    };

    const generatedScenes: GeneratedScene[] = [];

    const characterResults = await generateImagesFromPrompts(
      safeCharacterData.slice(0, ctx.config.image.maxCharacterImages),
      "character",
      dirs.characters,
      ctx.artStyle,
      imageConfig,
      ctx.config.image.retryAttempts,
      ctx.config.image.retryDelay
    );
    generatedScenes.push(...characterResults);
    ctx.characterImages = characterResults.map(s => s.imagePath);

    const sceneResults = await generateImagesFromPrompts(
      safeSceneData.slice(0, ctx.config.image.maxSceneImages),
      "scene",
      dirs.scenes,
      ctx.artStyle,
      imageConfig,
      ctx.config.image.retryAttempts,
      ctx.config.image.retryDelay
    );
    generatedScenes.push(...sceneResults);
    ctx.sceneImages = sceneResults.map(s => s.imagePath);

    // Store scenes with narration in context for later stages
    (ctx as any).generatedScenes = generatedScenes;

    const trackingPath = join(ctx.outputDir, `${ctx.bookTitle}_prompts.json`);
    writeFileSync(
      trackingPath,
      JSON.stringify(
        {
          artStyle: ctx.artStyle,
          scenes: generatedScenes,
        },
        null,
        2
      )
    );

    const totalImages = generatedScenes.length;
    logger.success(`Generated ${totalImages} illustrations with narration`);

    return {
      success: true,
      message: `Generated ${totalImages} illustrations with narration`,
      data: {
        characterImages: ctx.characterImages.length,
        sceneImages: ctx.sceneImages.length,
        trackingPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to generate illustrations: ${message}`,
    };
  }
}

async function generateImagesFromPrompts(
  items: ImagePromptData[],
  type: "character" | "scene",
  outputDir: string,
  artStyle: string,
  config: ImageGenerationConfig,
  retryAttempts: number,
  retryDelay: number
): Promise<GeneratedScene[]> {
  const results: GeneratedScene[] = [];

  ensureDir(outputDir);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item?.prompt) continue;

    const index = String(i + 1).padStart(2, "0");
    const filename = `${type}_${index}.png`;
    const outputPath = join(outputDir, filename);

    logger.step(`Generating ${type} ${i + 1}/${items.length}...`);

    const fullPrompt = `${artStyle}\n\n${item.prompt}`;

    const result = await generateImageAuto(
      fullPrompt,
      outputPath,
      config,
      retryAttempts,
      retryDelay
    );

    if (result.success && result.path) {
      results.push({
        imagePath: result.path,
        promptDescription: item.description || item.prompt,
        type,
        index: i,
      });
      logger.success(`Generated: ${filename}`);
    } else {
      logger.warn(`Failed to generate ${filename}: ${result.error}`);
    }
  }

  return results;
}

export function isIllustrationComplete(ctx: PipelineContext): boolean {
  return (
    ctx.characterImages.length > 0 ||
    ctx.sceneImages.length > 0
  );
}
