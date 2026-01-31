import { z } from "zod";

export const modelConfigSchema = z.object({
  text: z.string().default("gemini-2.5-flash"),
  image: z.string().default("imagen-4.0-fast-generate-001"),
  tts: z.string().default("gemini-2.5-flash-preview-tts"),
  video: z.string().default("veo-3.1-fast"),
});

export const imageConfigSchema = z.object({
  maxCharacterImages: z.number().min(1).max(100).default(30),
  maxSceneImages: z.number().min(1).max(100).default(50),
  aspectRatio: z
    .enum([
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
    ])
    .default("9:16"),
  personGeneration: z
    .enum(["dont_allow", "allow_adult", "allow_all"])
    .default("allow_adult"),
  retryAttempts: z.number().min(1).max(10).default(3),
  retryDelay: z.number().min(1).max(60).default(2),
});

export const videoConfigSchema = z.object({
  mode: z.enum(["slideshow", "veo"]).default("slideshow"),
  fps: z.number().min(0.1).max(60).default(0.5),
  resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
});

export const ttsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  voice: z.string().default("Kore"),
});

export const audioConfigSchema = z.object({
  musicVolume: z.number().min(0).max(1).default(0.3),
  narrationVolume: z.number().min(0).max(1).default(1.0),
  supportedFormats: z
    .array(z.string())
    .default([".mp3", ".m4a", ".wav", ".aac", ".ogg"]),
});

export const directoryConfigSchema = z.object({
  output: z.string().default("./storycanvas-output"),
  music: z.string().default("./music"),
  books: z.string().default("./books"),
});

export const promptsConfigSchema = z.object({
  artStyle: z.string().default(`
Can you define an art style that would fit the story?
Just give us the prompt for the art style that will be added to future prompts.
  `.trim()),

  characterIllustrations: z.string().default(`
Can you describe the main characters and prepare a prompt describing them
with as much detail as possible (use the descriptions from the given text)
so Imagen can generate images of them? Each prompt should be at least 50 words.
  `.trim()),

  chapterIllustrations: z.string().default(`
Now, for each chapter of the book, give me a prompt to illustrate what happens in it.
Be very descriptive, especially of the characters. Be very descriptive and remember to
reuse the character prompts if they appear in the images. Each character should at least
be described with 30 words.
  `.trim()),

  systemInstructions: z.string().default(`
There must be no text on the image, it should not look like a cover page.
It should be a full illustration with no borders, titles, nor description.
Stay family-friendly with uplifting colors.
  `.trim()),

  chatInitialization: z.string().default(`
Here's a book to illustrate using Imagen. Don't say anything for now, instructions will follow.
  `.trim()),

  youtubeMetadata: z.string().default(`
Go through this video file and extract the following information:
1. Description (concise and engaging)
2. Tags (only 3 tags, comma-separated tags in a string)

This is for YouTube upload purposes. Format the response as JSON with keys:
"description", and "tags".
  `.trim()),

  youtubeMetadataWithTitle: z.string().default(`
Go through this video file and extract the following information:
1. Title (engaging, slightly clickbait-y but accurate to content, 60 characters max)
2. Description (concise and engaging)
3. Tags (only 3 tags, comma-separated tags in a string)

The title should be catchy and click-worthy but NOT misleading about the actual video content.
Make it intriguing and appealing but truthful to what's shown in the video.

This is for YouTube upload purposes. Format the response as JSON with keys:
"title", "description", and "tags".
  `.trim()),
});

export const storyCanvasConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  models: modelConfigSchema.default({}),
  image: imageConfigSchema.default({}),
  video: videoConfigSchema.default({}),
  tts: ttsConfigSchema.default({}),
  audio: audioConfigSchema.default({}),
  directories: directoryConfigSchema.default({}),
  prompts: promptsConfigSchema.default({}),
});

export type StoryCanvasConfigInput = z.input<typeof storyCanvasConfigSchema>;
export type StoryCanvasConfigOutput = z.output<typeof storyCanvasConfigSchema>;
