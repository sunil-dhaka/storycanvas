import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PipelineContext, PipelineStageResult } from "../types.js";
import { generateVideoFromText } from "../../services/veo.js";
import { ensureDir, getSubdirs } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";

export async function createVeoVideo(
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!ctx.textContent || !ctx.bookTitle) {
      return {
        success: false,
        message: "No text content available for video generation",
      };
    }

    const dirs = getSubdirs(ctx.config.directories.output, ctx.bookTitle);
    ensureDir(dirs.video);

    const outputPath = join(dirs.video, `${ctx.bookTitle}_veo.mp4`);

    logger.step("Generating video with Veo AI...");
    logger.info(
      "This may take several minutes depending on content length..."
    );

    const result = await generateVideoFromText(
      ctx.textContent,
      outputPath,
      {
        model: ctx.config.models.video,
        aspectRatio:
          ctx.config.image.aspectRatio === "9:16" ? "9:16" : "16:9",
      },
      ctx.config.models.text
    );

    if (!result.success) {
      return {
        success: false,
        message: `Failed to generate Veo video: ${result.error}`,
      };
    }

    ctx.videoPath = result.path;

    logger.success(`Created Veo video: ${ctx.videoPath}`);

    return {
      success: true,
      message: "Created video with Veo AI",
      data: {
        videoPath: ctx.videoPath,
        model: ctx.config.models.video,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to create Veo video: ${message}`,
    };
  }
}

export function isVeoVideoComplete(ctx: PipelineContext): boolean {
  return !!(ctx.videoPath && existsSync(ctx.videoPath));
}
