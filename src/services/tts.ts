import { getClient } from "./gemini.js";
import { writeFileSync } from "node:fs";
import { logger } from "../utils/logger.js";

export interface TTSConfig {
  model: string;
  voice: string;
}

export interface TTSResult {
  success: boolean;
  path?: string;
  error?: string;
}

export async function generateSpeech(
  text: string,
  outputPath: string,
  config: TTSConfig
): Promise<TTSResult> {
  const client = getClient();

  try {
    const response = await client.models.generateContent({
      model: config.model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voice,
            },
          },
        },
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      return {
        success: false,
        error: "No candidates in TTS response",
      };
    }

    const parts = response.candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      return {
        success: false,
        error: "No parts in TTS response",
      };
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        const audioBuffer = Buffer.from(part.inlineData.data, "base64");
        const wavPath = outputPath.endsWith(".wav")
          ? outputPath
          : `${outputPath}.wav`;

        const wavBuffer = convertPcmToWav(audioBuffer, 24000, 16, 1);
        writeFileSync(wavPath, wavBuffer);

        return {
          success: true,
          path: wavPath,
        };
      }
    }

    return {
      success: false,
      error: "No audio data found in response",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
}

function convertPcmToWav(
  pcmData: Buffer,
  sampleRate: number,
  bitsPerSample: number,
  channels: number
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

export async function generateNarration(
  chapters: string[],
  outputDir: string,
  config: TTSConfig
): Promise<{ success: boolean; paths: string[]; errors: string[] }> {
  const paths: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapterText = chapters[i];
    const outputPath = `${outputDir}/narration_${String(i + 1).padStart(3, "0")}.wav`;

    logger.step(`Generating narration for chapter ${i + 1}/${chapters.length}`);

    const result = await generateSpeech(chapterText, outputPath, config);

    if (result.success && result.path) {
      paths.push(result.path);
    } else {
      errors.push(`Chapter ${i + 1}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    paths,
    errors,
  };
}

export function splitTextIntoChunks(
  text: string,
  maxChunkLength: number = 4000
): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
