export * from "./core/types.js";
export * from "./core/pipeline.js";

export * from "./config/schema.js";
export * from "./config/defaults.js";
export * from "./config/loader.js";

export * from "./services/gemini.js";
export * from "./services/imagen.js";
export {
  generateSpeech,
  splitTextIntoChunks,
  type TTSResult,
} from "./services/tts.js";
export * from "./services/veo.js";
export {
  getResolution,
  createSlideshowFromImages,
  addBackgroundMusic,
  addAudioToVideo,
  mixAudioTracks,
  concatenateVideos,
  getVideoDuration,
  checkFfmpeg,
  type SlideshowConfig,
  type AudioMixConfig,
} from "./services/ffmpeg.js";

export * from "./core/stages/input.js";
export * from "./core/stages/gutenberg.js";
export * from "./core/stages/illustration.js";
export {
  generateNarration as generateNarrationStage,
  isNarrationComplete,
} from "./core/stages/narration.js";
export {
  createSlideshow as createSlideshowStage,
  isSlideshowComplete,
} from "./core/stages/slideshow.js";
export * from "./core/stages/veo-video.js";
export * from "./core/stages/music.js";
export * from "./core/stages/metadata.js";

export * from "./utils/files.js";
export * from "./utils/parsers.js";
export * from "./utils/logger.js";
