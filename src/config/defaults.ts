import type { StoryCanvasConfig } from "../core/types.js";

export const DEFAULT_CONFIG: Omit<StoryCanvasConfig, "apiKey"> = {
  models: {
    text: "gemini-2.5-flash",
    image: "imagen-4.0-fast-generate-001",
    tts: "gemini-2.5-flash-preview-tts",
    video: "veo-3.1-fast",
  },
  image: {
    maxCharacterImages: 30,
    maxSceneImages: 50,
    aspectRatio: "9:16",
    personGeneration: "allow_adult",
    retryAttempts: 3,
    retryDelay: 2,
  },
  video: {
    mode: "slideshow",
    fps: 0.5,
    resolution: "1080p",
  },
  tts: {
    enabled: true,
    voice: "Kore",
  },
  audio: {
    musicVolume: 0.3,
    narrationVolume: 1.0,
    supportedFormats: [".mp3", ".m4a", ".wav", ".aac", ".ogg"],
  },
  directories: {
    output: "./storycanvas-output",
    music: "./music",
    books: "./books",
  },
  prompts: {
    artStyle: `
Can you define an art style that would fit the story?
Just give us the prompt for the art style that will be added to future prompts.
    `.trim(),

    characterIllustrations: `
Can you describe the main characters and prepare a prompt describing them
with as much detail as possible (use the descriptions from the given text)
so Imagen can generate images of them? Each prompt should be at least 50 words.
    `.trim(),

    chapterIllustrations: `
Now, for each chapter of the book, give me a prompt to illustrate what happens in it.
Be very descriptive, especially of the characters. Be very descriptive and remember to
reuse the character prompts if they appear in the images. Each character should at least
be described with 30 words.
    `.trim(),

    systemInstructions: `
There must be no text on the image, it should not look like a cover page.
It should be a full illustration with no borders, titles, nor description.
Stay family-friendly with uplifting colors.
    `.trim(),

    chatInitialization: `
Here's a book to illustrate using Imagen. Don't say anything for now, instructions will follow.
    `.trim(),

    youtubeMetadata: `
Go through this video file and extract the following information:
1. Description (concise and engaging)
2. Tags (only 3 tags, comma-separated tags in a string)

This is for YouTube upload purposes. Format the response as JSON with keys:
"description", and "tags".
    `.trim(),

    youtubeMetadataWithTitle: `
Go through this video file and extract the following information:
1. Title (engaging, slightly clickbait-y but accurate to content, 60 characters max)
2. Description (concise and engaging)
3. Tags (only 3 tags, comma-separated tags in a string)

The title should be catchy and click-worthy but NOT misleading about the actual video content.
Make it intriguing and appealing but truthful to what's shown in the video.

This is for YouTube upload purposes. Format the response as JSON with keys:
"title", "description", and "tags".
    `.trim(),
  },
};

export const MODEL_OPTIONS = {
  text: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recommended)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  image: [
    {
      value: "imagen-4.0-fast-generate-001",
      label: "Imagen 4.0 Fast (Recommended)",
    },
    { value: "imagen-4.0-ultra-generate-001", label: "Imagen 4.0 Ultra" },
    { value: "imagen-4.0-generate-001", label: "Imagen 4.0 Standard" },
    { value: "gemini-2.5-flash-image", label: "Nano Banana (Gemini native)" },
    {
      value: "gemini-3-pro-image-preview",
      label: "Nano Banana Pro (Professional)",
    },
  ],
  tts: [
    {
      value: "gemini-2.5-flash-preview-tts",
      label: "Gemini 2.5 Flash TTS (Recommended)",
    },
    { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS" },
  ],
  video: [
    { value: "veo-3.1-fast", label: "Veo 3.1 Fast (Recommended)" },
    { value: "veo-3.1", label: "Veo 3.1 (Higher quality)" },
  ],
};

export const ASPECT_RATIO_OPTIONS = [
  { value: "9:16", label: "9:16 (Vertical/Shorts)" },
  { value: "16:9", label: "16:9 (Landscape/YouTube)" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:3", label: "4:3 (Classic)" },
  { value: "3:4", label: "3:4 (Portrait)" },
];

export const RESOLUTION_OPTIONS = [
  { value: "1080p", label: "1080p (Recommended)" },
  { value: "720p", label: "720p (Faster)" },
  { value: "4k", label: "4K (Highest quality)" },
];

export const VIDEO_MODE_OPTIONS = [
  {
    value: "slideshow",
    label: "Image Slideshow",
    description: "Generate images and combine into video",
  },
  {
    value: "veo",
    label: "Veo AI Video",
    description: "Generate video directly with Veo 3.1",
  },
];
