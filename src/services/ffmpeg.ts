import Ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { existsSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import { logger } from "../utils/logger.js";
import { naturalSort } from "../utils/files.js";

function findFfmpeg(): string | null {
  if (ffmpegStatic && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }

  try {
    const systemFfmpeg = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
    if (systemFfmpeg && existsSync(systemFfmpeg)) {
      return systemFfmpeg;
    }
  } catch {
    // System ffmpeg not found
  }

  return null;
}

const ffmpegPath = findFfmpeg();
if (ffmpegPath) {
  Ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface SlideshowConfig {
  fps: number;
  resolution: { width: number; height: number };
}

export interface AudioMixConfig {
  backgroundVolume: number;
  narrationVolume: number;
}

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

export function getResolution(
  resolution: string
): { width: number; height: number } {
  return RESOLUTION_MAP[resolution] ?? RESOLUTION_MAP["1080p"];
}

export async function createSlideshow(
  imageDir: string,
  outputPath: string,
  config: SlideshowConfig
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    const imageFiles = getImageFiles(imageDir);

    if (imageFiles.length === 0) {
      resolve({
        success: false,
        error: "No image files found in directory",
      });
      return;
    }

    logger.step(`Creating slideshow from ${imageFiles.length} images...`);

    const inputPattern = createInputPattern(imageFiles);

    const command = Ffmpeg();

    command
      .input(inputPattern)
      .inputOptions([`-framerate ${config.fps}`])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        `-vf scale=${config.resolution.width}:${config.resolution.height}:force_original_aspect_ratio=decrease,pad=${config.resolution.width}:${config.resolution.height}:(ow-iw)/2:(oh-ih)/2`,
      ])
      .output(outputPath)
      .on("start", (cmd) => {
        logger.debug(`FFmpeg command: ${cmd}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          logger.debug(`Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        resolve({
          success: true,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      })
      .run();
  });
}

export async function createSlideshowFromImages(
  imagePaths: string[],
  outputPath: string,
  config: SlideshowConfig
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    if (imagePaths.length === 0) {
      resolve({
        success: false,
        error: "No image paths provided",
      });
      return;
    }

    logger.step(`Creating slideshow from ${imagePaths.length} images...`);

    const command = Ffmpeg();

    const frameDuration = 1 / config.fps;
    for (const imagePath of imagePaths) {
      command.input(imagePath).inputOptions([`-loop 1`, `-t ${frameDuration}`]);
    }

    const filterComplex = imagePaths
      .map(
        (_, i) =>
          `[${i}:v]scale=${config.resolution.width}:${config.resolution.height}:force_original_aspect_ratio=decrease,pad=${config.resolution.width}:${config.resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
      )
      .join(";");

    const concatInputs = imagePaths.map((_, i) => `[v${i}]`).join("");
    const fullFilter = `${filterComplex};${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[outv]`;

    command
      .complexFilter(fullFilter)
      .outputOptions(["-map [outv]", "-c:v libx264", "-pix_fmt yuv420p"])
      .output(outputPath)
      .on("start", (cmd) => {
        logger.debug(`FFmpeg command: ${cmd}`);
      })
      .on("end", () => {
        resolve({
          success: true,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      })
      .run();
  });
}

export async function addBackgroundMusic(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  volume: number = 0.3
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    logger.step("Adding background music...");

    Ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v copy",
        "-c:a aac",
        `-filter_complex [1:a]volume=${volume}[a1];[0:a][a1]amix=inputs=2:duration=first[aout]`,
        "-map 0:v",
        "-map [aout]",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => {
        resolve({
          success: true,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      })
      .run();
  });
}

export async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    logger.step("Adding audio to video...");

    Ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions(["-c:v copy", "-c:a aac", "-map 0:v", "-map 1:a", "-shortest"])
      .output(outputPath)
      .on("end", () => {
        resolve({
          success: true,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      })
      .run();
  });
}

export async function mixAudioTracks(
  videoPath: string,
  narrationPath: string,
  musicPath: string,
  outputPath: string,
  config: AudioMixConfig
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    logger.step("Mixing audio tracks...");

    Ffmpeg()
      .input(videoPath)
      .input(narrationPath)
      .input(musicPath)
      .outputOptions([
        "-c:v copy",
        "-c:a aac",
        `-filter_complex [1:a]volume=${config.narrationVolume}[narr];[2:a]volume=${config.backgroundVolume}[music];[narr][music]amix=inputs=2:duration=first[aout]`,
        "-map 0:v",
        "-map [aout]",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => {
        resolve({
          success: true,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      })
      .run();
  });
}

export async function concatenateVideos(
  videoPaths: string[],
  outputPath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  return new Promise((resolve) => {
    if (videoPaths.length === 0) {
      resolve({
        success: false,
        error: "No video paths provided",
      });
      return;
    }

    logger.step(`Concatenating ${videoPaths.length} videos...`);

    const command = Ffmpeg();

    for (const videoPath of videoPaths) {
      command.input(videoPath);
    }

    const filterInputs = videoPaths.map((_, i) => `[${i}:v][${i}:a]`).join("");
    const filterComplex = `${filterInputs}concat=n=${videoPaths.length}:v=1:a=1[outv][outa]`;

    command
      .complexFilter(filterComplex)
      .outputOptions(["-map [outv]", "-map [outa]", "-c:v libx264", "-c:a aac"])
      .output(outputPath)
      .on("end", () => {
        resolve({
          success: true,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      })
      .run();
  });
}

export async function getVideoDuration(
  videoPath: string
): Promise<number | null> {
  return new Promise((resolve) => {
    Ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(metadata.format.duration ?? null);
    });
  });
}

export function checkFfmpeg(): boolean {
  return !!ffmpegPath;
}

function getImageFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const extensions = [".png", ".jpg", ".jpeg", ".webp"];
  const files = readdirSync(dir)
    .filter((file) => {
      const ext = extname(file).toLowerCase();
      return extensions.includes(ext);
    })
    .map((file) => join(dir, file));

  return naturalSort(files);
}

function createInputPattern(imageFiles: string[]): string {
  return imageFiles[0];
}

export interface SyncedScene {
  imagePath: string;
  audioPath: string;
}

export interface SyncedSlideshowConfig {
  resolution: { width: number; height: number };
}

export async function getAudioDuration(audioPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    Ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(metadata.format.duration ?? null);
    });
  });
}

async function createSegment(
  imagePath: string,
  audioPath: string,
  outputPath: string,
  resolution: { width: number; height: number }
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    Ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop 1"])
      .input(audioPath)
      .outputOptions([
        `-vf scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
        "-c:v libx264",
        "-c:a aac",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve({ success: true }))
      .on("error", (err) => resolve({ success: false, error: err.message }))
      .run();
  });
}

export async function createSyncedSlideshow(
  scenes: SyncedScene[],
  outputPath: string,
  config: SyncedSlideshowConfig
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (scenes.length === 0) {
    return {
      success: false,
      error: "No scenes provided",
    };
  }

  logger.step(`Creating synced slideshow from ${scenes.length} scenes...`);

  const { writeFileSync, unlinkSync } = await import("node:fs");
  const { dirname, resolve } = await import("node:path");
  const absoluteOutput = resolve(outputPath);
  const outputDir = dirname(absoluteOutput);
  const segmentPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const segmentPath = resolve(join(outputDir, `_segment_${String(i).padStart(3, "0")}.mp4`));

    logger.step(`Creating segment ${i + 1}/${scenes.length}...`);

    const result = await createSegment(
      resolve(scene.imagePath),
      resolve(scene.audioPath),
      segmentPath,
      config.resolution
    );

    if (!result.success) {
      for (const p of segmentPaths) {
        try { unlinkSync(p); } catch {}
      }
      return {
        success: false,
        error: `Failed to create segment ${i + 1}: ${result.error}`,
      };
    }

    segmentPaths.push(segmentPath);
  }

  logger.step("Concatenating segments...");

  const concatListPath = resolve(join(outputDir, "_concat_list.txt"));
  const concatContent = segmentPaths.map((p) => `file '${p}'`).join("\n");
  writeFileSync(concatListPath, concatContent);

  const concatResult = await new Promise<{ success: boolean; error?: string }>((resolvePromise) => {
    Ffmpeg()
      .input(concatListPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .output(absoluteOutput)
      .on("end", () => resolvePromise({ success: true }))
      .on("error", (err) => resolvePromise({ success: false, error: err.message }))
      .run();
  });

  try { unlinkSync(concatListPath); } catch {}
  for (const p of segmentPaths) {
    try { unlinkSync(p); } catch {}
  }

  if (!concatResult.success) {
    return {
      success: false,
      error: `Failed to concatenate segments: ${concatResult.error}`,
    };
  }

  return {
    success: true,
    path: absoluteOutput,
  };
}
