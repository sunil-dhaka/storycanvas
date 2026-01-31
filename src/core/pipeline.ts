import type {
  PipelineContext,
  PipelineStageResult,
  StoryCanvasConfig,
} from "./types.js";
import { initializeClient } from "../services/gemini.js";
import { processInput } from "./stages/input.js";
import { downloadBook } from "./stages/gutenberg.js";
import { generateIllustrations } from "./stages/illustration.js";
import { generateNarration } from "./stages/narration.js";
import { createSlideshow } from "./stages/slideshow.js";
import { createVeoVideo } from "./stages/veo-video.js";
import { addMusic } from "./stages/music.js";
import { generateMetadata } from "./stages/metadata.js";
import { logger } from "../utils/logger.js";

export type PipelineStage =
  | "input"
  | "gutenberg"
  | "illustrations"
  | "narration"
  | "video"
  | "music"
  | "metadata";

export interface PipelineOptions {
  stages?: PipelineStage[];
  inputPath?: string;
  gutenbergId?: number;
  catalogPath?: string;
}

const DEFAULT_STAGES: PipelineStage[] = [
  "illustrations",
  "narration",
  "video",
  "music",
  "metadata",
];

export function createContext(config: StoryCanvasConfig): PipelineContext {
  return {
    config,
    bookTitle: "",
    bookPath: "",
    textContent: "",
    outputDir: "",
    characterImages: [],
    sceneImages: [],
  };
}

export async function runPipeline(
  config: StoryCanvasConfig,
  options: PipelineOptions
): Promise<{ success: boolean; context: PipelineContext; errors: string[] }> {
  const ctx = createContext(config);
  const errors: string[] = [];

  initializeClient(config.apiKey);

  logger.step("Starting StoryCanvas pipeline...");

  let inputResult: PipelineStageResult;

  if (options.inputPath) {
    inputResult = await processInput(options.inputPath, ctx);
  } else if (options.gutenbergId) {
    inputResult = await downloadBook(
      options.gutenbergId,
      ctx,
      options.catalogPath
    );
  } else {
    return {
      success: false,
      context: ctx,
      errors: ["No input specified. Provide either --file or --gutenberg"],
    };
  }

  if (!inputResult.success) {
    errors.push(inputResult.message);
    return { success: false, context: ctx, errors };
  }

  const stages = options.stages ?? DEFAULT_STAGES;

  for (const stage of stages) {
    const result = await runStage(stage, ctx);

    if (!result.success) {
      errors.push(result.message);
      logger.error(`Stage '${stage}' failed: ${result.message}`);
    } else {
      logger.success(`Stage '${stage}' completed: ${result.message}`);
    }
  }

  const success = errors.length === 0;

  if (success) {
    logger.success("Pipeline completed successfully!");
    if (ctx.finalVideoPath) {
      logger.info(`Final video: ${ctx.finalVideoPath}`);
    }
  } else {
    logger.warn(`Pipeline completed with ${errors.length} error(s)`);
  }

  return { success, context: ctx, errors };
}

async function runStage(
  stage: PipelineStage,
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  logger.step(`Running stage: ${stage}`);

  switch (stage) {
    case "illustrations":
      return generateIllustrations(ctx);

    case "narration":
      return generateNarration(ctx);

    case "video":
      if (ctx.config.video.mode === "veo") {
        return createVeoVideo(ctx);
      }
      return createSlideshow(ctx);

    case "music":
      return addMusic(ctx);

    case "metadata":
      return generateMetadata(ctx);

    default:
      return {
        success: false,
        message: `Unknown stage: ${stage}`,
      };
  }
}

export async function runSingleStage(
  stage: PipelineStage,
  config: StoryCanvasConfig,
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  initializeClient(config.apiKey);
  return runStage(stage, ctx);
}
