export interface StoryCanvasConfig {
  apiKey: string;
  models: ModelConfig;
  image: ImageConfig;
  video: VideoConfig;
  tts: TTSConfig;
  audio: AudioConfig;
  directories: DirectoryConfig;
  prompts: PromptsConfig;
}

export interface ModelConfig {
  text: string;
  image: string;
  tts: string;
  video: string;
}

export interface ImageConfig {
  maxCharacterImages: number;
  maxSceneImages: number;
  aspectRatio: AspectRatio;
  personGeneration: PersonGeneration;
  retryAttempts: number;
  retryDelay: number;
}

export interface VideoConfig {
  mode: VideoMode;
  fps: number;
  resolution: VideoResolution;
}

export interface TTSConfig {
  enabled: boolean;
  voice: string;
}

export interface AudioConfig {
  musicVolume: number;
  narrationVolume: number;
  supportedFormats: string[];
}

export interface DirectoryConfig {
  output: string;
  music: string;
  books: string;
}

export interface PromptsConfig {
  artStyle: string;
  characterIllustrations: string;
  chapterIllustrations: string;
  systemInstructions: string;
  chatInitialization: string;
  youtubeMetadata: string;
  youtubeMetadataWithTitle: string;
}

export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export type PersonGeneration = "dont_allow" | "allow_adult" | "allow_all";

export type VideoMode = "slideshow" | "veo";

export type VideoResolution = "720p" | "1080p" | "4k";

export interface PipelineContext {
  config: StoryCanvasConfig;
  bookTitle: string;
  bookPath: string;
  textContent: string;
  outputDir: string;
  artStyle?: string;
  characterImages: string[];
  sceneImages: string[];
  narrationPath?: string;
  videoPath?: string;
  finalVideoPath?: string;
  metadata?: YouTubeMetadata;
}

export interface PipelineStageResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface YouTubeMetadata {
  title?: string;
  description: string;
  tags: string[];
}

export interface ImagePrompt {
  prompt: string;
  type: "character" | "scene";
  index: number;
}

export interface GeneratedImage {
  path: string;
  prompt: string;
  type: "character" | "scene";
  index: number;
}

export interface TTSVoice {
  name: string;
  description?: string;
}

export const TTS_VOICES: TTSVoice[] = [
  { name: "Kore", description: "Recommended default voice" },
  { name: "Zephyr" },
  { name: "Puck" },
  { name: "Charon" },
  { name: "Fenrir" },
  { name: "Leda" },
  { name: "Orus" },
  { name: "Aoede" },
  { name: "Callirrhoe" },
  { name: "Autonoe" },
  { name: "Enceladus" },
  { name: "Iapetus" },
  { name: "Umbriel" },
  { name: "Algieba" },
  { name: "Despina" },
  { name: "Erinome" },
  { name: "Algenib" },
  { name: "Rasalgethi" },
  { name: "Laomedeia" },
  { name: "Achernar" },
  { name: "Alnilam" },
  { name: "Schedar" },
  { name: "Gacrux" },
  { name: "Pulcherrima" },
  { name: "Achird" },
  { name: "Zubenelgenubi" },
  { name: "Vindemiatrix" },
  { name: "Sadachbia" },
  { name: "Sadaltager" },
  { name: "Sulafat" },
];

export const MODELS = {
  text: {
    flash: "gemini-2.5-flash",
    pro: "gemini-2.5-pro",
  },
  image: {
    imagenFast: "imagen-4.0-fast-generate-001",
    imagenUltra: "imagen-4.0-ultra-generate-001",
    imagenStandard: "imagen-4.0-generate-001",
    nanoBanana: "gemini-2.5-flash-image",
    nanoBananaPro: "gemini-3-pro-image-preview",
  },
  tts: {
    flash: "gemini-2.5-flash-preview-tts",
    pro: "gemini-2.5-pro-preview-tts",
  },
  video: {
    veo: "veo-3.1",
    veoFast: "veo-3.1-fast",
  },
} as const;
