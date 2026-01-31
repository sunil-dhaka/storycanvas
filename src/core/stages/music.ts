import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PipelineContext, PipelineStageResult } from "../types.js";
import {
  addBackgroundMusic,
  mixAudioTracks,
  addAudioToVideo,
} from "../../services/ffmpeg.js";
import { getSubdirs, listFiles } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";

export async function addMusic(
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!ctx.videoPath || !existsSync(ctx.videoPath)) {
      return {
        success: false,
        message: "No video available for adding music",
      };
    }

    const musicDir = ctx.config.directories.music;

    if (!existsSync(musicDir)) {
      logger.warn(`Music directory not found: ${musicDir}`);
      return {
        success: true,
        message: "No music directory found, skipping background music",
      };
    }

    const musicFiles = listFiles(
      musicDir,
      ctx.config.audio.supportedFormats
    );

    if (musicFiles.length === 0) {
      logger.warn("No music files found in music directory");
      return {
        success: true,
        message: "No music files found, skipping background music",
      };
    }

    const randomIndex = Math.floor(Math.random() * musicFiles.length);
    const selectedMusic = musicFiles[randomIndex];

    logger.step(`Selected background music: ${selectedMusic}`);

    const dirs = getSubdirs(ctx.config.directories.output, ctx.bookTitle);
    const outputPath = join(dirs.video, `${ctx.bookTitle}_final.mp4`);

    let result;

    if (ctx.narrationPath && existsSync(ctx.narrationPath)) {
      logger.step("Mixing narration and background music...");
      result = await mixAudioTracks(
        ctx.videoPath,
        ctx.narrationPath,
        selectedMusic,
        outputPath,
        {
          backgroundVolume: ctx.config.audio.musicVolume,
          narrationVolume: ctx.config.audio.narrationVolume,
        }
      );
    } else {
      logger.step("Adding background music...");
      result = await addBackgroundMusic(
        ctx.videoPath,
        selectedMusic,
        outputPath,
        ctx.config.audio.musicVolume
      );
    }

    if (!result.success) {
      return {
        success: false,
        message: `Failed to add music: ${result.error}`,
      };
    }

    ctx.finalVideoPath = result.path;

    logger.success(`Created final video with music: ${ctx.finalVideoPath}`);

    return {
      success: true,
      message: "Added background music to video",
      data: {
        musicFile: selectedMusic,
        finalVideoPath: ctx.finalVideoPath,
        hasNarration: !!ctx.narrationPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to add music: ${message}`,
    };
  }
}

export async function addNarrationOnly(
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!ctx.videoPath || !existsSync(ctx.videoPath)) {
      return {
        success: false,
        message: "No video available for adding narration",
      };
    }

    if (!ctx.narrationPath || !existsSync(ctx.narrationPath)) {
      return {
        success: true,
        message: "No narration available, skipping",
      };
    }

    logger.step("Adding narration to video...");

    const dirs = getSubdirs(ctx.config.directories.output, ctx.bookTitle);
    const outputPath = join(dirs.video, `${ctx.bookTitle}_narrated.mp4`);

    const result = await addAudioToVideo(
      ctx.videoPath,
      ctx.narrationPath,
      outputPath
    );

    if (!result.success) {
      return {
        success: false,
        message: `Failed to add narration: ${result.error}`,
      };
    }

    ctx.finalVideoPath = result.path;

    logger.success(`Added narration: ${ctx.finalVideoPath}`);

    return {
      success: true,
      message: "Added narration to video",
      data: {
        finalVideoPath: ctx.finalVideoPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to add narration: ${message}`,
    };
  }
}

export function isMusicComplete(ctx: PipelineContext): boolean {
  return !!(ctx.finalVideoPath && existsSync(ctx.finalVideoPath));
}
