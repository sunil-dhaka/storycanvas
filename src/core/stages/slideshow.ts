import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PipelineContext, PipelineStageResult } from "../types.js";
import {
  createSyncedSlideshow,
  createSlideshowFromImages,
  getResolution,
} from "../../services/ffmpeg.js";
import { ensureDir, getSubdirs, naturalSort } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";
import type { NarratedScene } from "./narration.js";

export async function createSlideshow(
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!ctx.bookTitle) {
      return {
        success: false,
        message: "No book title available",
      };
    }

    const dirs = getSubdirs(ctx.config.directories.output, ctx.bookTitle);
    ensureDir(dirs.video);

    const outputPath = join(dirs.video, `${ctx.bookTitle}_final.mp4`);

    // Check if we have narrated scenes (image + audio pairs)
    const narratedScenes = (ctx as any).narratedScenes as NarratedScene[] | undefined;

    if (narratedScenes && narratedScenes.length > 0) {
      logger.step(`Creating synced video from ${narratedScenes.length} narrated scenes...`);

      const result = await createSyncedSlideshow(
        narratedScenes.map(s => ({
          imagePath: s.imagePath,
          audioPath: s.audioPath,
        })),
        outputPath,
        {
          resolution: getResolution(ctx.config.video.resolution),
        }
      );

      if (!result.success) {
        return {
          success: false,
          message: `Failed to create synced slideshow: ${result.error}`,
        };
      }

      ctx.videoPath = result.path;
      ctx.finalVideoPath = result.path;

      logger.success(`Created synced video: ${ctx.videoPath}`);

      return {
        success: true,
        message: `Created synced video with ${narratedScenes.length} narrated scenes`,
        data: {
          sceneCount: narratedScenes.length,
          videoPath: ctx.videoPath,
        },
      };
    }

    // Fallback: No narration, create simple slideshow from images
    const allImages = [
      ...ctx.characterImages,
      ...ctx.sceneImages,
    ];

    if (allImages.length === 0) {
      return {
        success: false,
        message: "No images available for slideshow",
      };
    }

    logger.step(`Creating slideshow from ${allImages.length} images (no narration)...`);

    const sortedImages = naturalSort(allImages);

    const result = await createSlideshowFromImages(
      sortedImages,
      outputPath,
      {
        fps: ctx.config.video.fps,
        resolution: getResolution(ctx.config.video.resolution),
      }
    );

    if (!result.success) {
      return {
        success: false,
        message: `Failed to create slideshow: ${result.error}`,
      };
    }

    ctx.videoPath = result.path;

    logger.success(`Created slideshow: ${ctx.videoPath}`);

    return {
      success: true,
      message: `Created slideshow with ${allImages.length} images`,
      data: {
        imageCount: allImages.length,
        videoPath: ctx.videoPath,
        fps: ctx.config.video.fps,
        resolution: ctx.config.video.resolution,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to create slideshow: ${message}`,
    };
  }
}

export function isSlideshowComplete(ctx: PipelineContext): boolean {
  return !!(ctx.videoPath && existsSync(ctx.videoPath));
}
