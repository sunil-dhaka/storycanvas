import { join } from "node:path";
import type { PipelineContext, PipelineStageResult } from "../types.js";
import { generateJsonContent } from "../../services/gemini.js";
import { generateSpeech } from "../../services/tts.js";
import { ensureDir, getSubdirs } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";
import type { GeneratedScene } from "./illustration.js";

export interface NarratedScene {
  imagePath: string;
  audioPath: string;
  narration: string;
  type: "character" | "scene";
  index: number;
}

interface NarrationSegment {
  sceneIndex: number;
  narration: string;
}

export async function generateNarration(
  ctx: PipelineContext
): Promise<PipelineStageResult> {
  try {
    if (!ctx.config.tts.enabled) {
      return {
        success: true,
        message: "TTS narration is disabled",
      };
    }

    const generatedScenes = (ctx as any).generatedScenes as GeneratedScene[] | undefined;

    if (!generatedScenes || generatedScenes.length === 0) {
      return {
        success: false,
        message: "No scenes available. Run illustrations stage first.",
      };
    }

    const dirs = getSubdirs(ctx.config.directories.output, ctx.bookTitle);
    ensureDir(dirs.audio);

    logger.step("Generating cohesive story narrative...");

    const sceneDescriptions = generatedScenes.map((scene, idx) => {
      const label = scene.type === "character"
        ? `Character ${scene.index + 1}`
        : `Scene ${scene.index + 1}`;
      return `${idx + 1}. [${label}] ${scene.promptDescription}`;
    }).join("\n");

    const bookExcerpt = ctx.textContent?.slice(0, 15000) || "";

    const narrativePrompt = `
You are a master storyteller creating a cohesive audio narration for a visual story.

The story is based on this book:
---
${bookExcerpt}
---

The visual story has ${generatedScenes.length} images shown in this order:
${sceneDescriptions}

Write a SINGLE COHESIVE NARRATIVE that flows smoothly across all images like a documentary or audiobook.
Each segment should:
- Flow naturally from the previous segment (use transitions, connective phrases)
- Be 2-4 sentences (~30-50 words) per image
- Build the story arc with rising tension, climax, and resolution
- Sound like a professional narrator telling one continuous story
- Avoid starting each segment with the same pattern

The narration should feel like ONE story being told, not separate disconnected descriptions.

Return a JSON array where each object has:
- "sceneIndex": the 1-based index from the list above
- "narration": the spoken text for that image

Example format:
[
  {"sceneIndex": 1, "narration": "In a world where darkness lurks in every shadow..."},
  {"sceneIndex": 2, "narration": "But there was one who dared to stand against it..."}
]
`.trim();

    const narrativeResult = await generateJsonContent<NarrationSegment[]>(
      ctx.config.models.text,
      narrativePrompt
    );

    if (!Array.isArray(narrativeResult) || narrativeResult.length === 0) {
      return {
        success: false,
        message: "Failed to generate narrative script",
      };
    }

    const narrationMap = new Map<number, string>();
    for (const segment of narrativeResult) {
      if (segment.sceneIndex && segment.narration) {
        narrationMap.set(segment.sceneIndex, segment.narration);
      }
    }

    logger.success(`Generated narrative with ${narrationMap.size} segments`);
    logger.step(`Converting narrative to audio...`);

    const narratedScenes: NarratedScene[] = [];
    const errors: string[] = [];

    for (let i = 0; i < generatedScenes.length; i++) {
      const scene = generatedScenes[i];
      const narrationText = narrationMap.get(i + 1);

      if (!narrationText || narrationText.trim().length === 0) {
        logger.warn(`Scene ${i + 1} has no narration, skipping`);
        continue;
      }

      const audioFilename = `narration_${String(i + 1).padStart(2, "0")}.wav`;
      const audioPath = join(dirs.audio, audioFilename);

      logger.step(`Generating audio ${i + 1}/${generatedScenes.length}...`);

      const result = await generateSpeech(narrationText, audioPath, {
        model: ctx.config.models.tts,
        voice: ctx.config.tts.voice,
      });

      if (result.success && result.path) {
        narratedScenes.push({
          imagePath: scene.imagePath,
          audioPath: result.path,
          narration: narrationText,
          type: scene.type,
          index: scene.index,
        });
        logger.success(`Generated: ${audioFilename}`);
      } else {
        errors.push(`Scene ${i + 1}: ${result.error}`);
        logger.warn(`Failed: ${audioFilename} - ${result.error}`);
      }
    }

    if (narratedScenes.length === 0) {
      return {
        success: false,
        message: `Failed to generate any audio: ${errors.join(", ")}`,
      };
    }

    (ctx as any).narratedScenes = narratedScenes;

    logger.success(`Generated ${narratedScenes.length} audio narrations`);

    return {
      success: true,
      message: `Generated cohesive narrative for ${narratedScenes.length} scenes`,
      data: {
        totalScenes: generatedScenes.length,
        generatedAudio: narratedScenes.length,
        errors: errors.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to generate narration: ${message}`,
    };
  }
}

export function isNarrationComplete(ctx: PipelineContext): boolean {
  const narratedScenes = (ctx as any).narratedScenes as NarratedScene[] | undefined;
  return !!(narratedScenes && narratedScenes.length > 0);
}
