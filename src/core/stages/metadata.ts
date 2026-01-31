import { existsSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import type {
  PipelineContext,
  PipelineStageResult,
  YouTubeMetadata,
} from "../types.js";
import { analyzeVideoJson } from "../../services/gemini.js";
import { logger } from "../../utils/logger.js";

export async function generateMetadata(
  ctx: PipelineContext,
  includeTitle: boolean = true
): Promise<PipelineStageResult> {
  try {
    const videoPath = ctx.finalVideoPath ?? ctx.videoPath;

    if (!videoPath || !existsSync(videoPath)) {
      return {
        success: false,
        message: "No video available for metadata generation",
      };
    }

    logger.step("Analyzing video for YouTube metadata...");

    const prompt = includeTitle
      ? ctx.config.prompts.youtubeMetadataWithTitle
      : ctx.config.prompts.youtubeMetadata;

    const metadata = await analyzeVideoJson<YouTubeMetadata>(
      ctx.config.models.text,
      videoPath,
      prompt
    );

    ctx.metadata = metadata;

    const metadataPath = join(
      dirname(videoPath),
      `${basename(videoPath, ".mp4")}_metadata.json`
    );

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    logger.success("Generated YouTube metadata");
    if (metadata.title) {
      logger.info(`Title: ${metadata.title}`);
    }
    logger.info(`Description: ${metadata.description?.slice(0, 100)}...`);
    logger.info(`Tags: ${metadata.tags?.join(", ")}`);

    return {
      success: true,
      message: "Generated YouTube metadata",
      data: {
        metadata,
        metadataPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to generate metadata: ${message}`,
    };
  }
}

export function isMetadataComplete(ctx: PipelineContext): boolean {
  return !!(ctx.metadata && ctx.metadata.description);
}
