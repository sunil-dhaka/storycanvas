import { existsSync } from "node:fs";
import * as prompts from "../ui/prompts.js";
import {
  printBanner,
  printSuccess,
  printError,
  printStep,
  formatDuration,
} from "../ui/theme.js";
import { loadConfig, configExists } from "../../config/loader.js";
import { runPipeline, type PipelineStage } from "../../core/pipeline.js";
import { VIDEO_MODE_OPTIONS } from "../../config/defaults.js";

interface CreateOptions {
  file?: string;
  gutenberg?: string;
  stages?: string;
  mode?: string;
}

const STAGE_OPTIONS: Array<{
  value: PipelineStage;
  label: string;
  hint: string;
}> = [
  {
    value: "illustrations",
    label: "Generate Illustrations",
    hint: "Create character and scene images",
  },
  {
    value: "narration",
    label: "Generate Narration",
    hint: "Create TTS audio from text",
  },
  {
    value: "video",
    label: "Create Video",
    hint: "Combine images into video or use Veo",
  },
  {
    value: "music",
    label: "Add Background Music",
    hint: "Mix audio tracks",
  },
  {
    value: "metadata",
    label: "Generate YouTube Metadata",
    hint: "Create title, description, tags",
  },
];

export async function create(options: CreateOptions): Promise<void> {
  if (!configExists()) {
    printError("No configuration found. Run 'storycanvas onboard' first.");
    process.exit(1);
  }

  const config = await loadConfig();
  if (!config) {
    printError("Failed to load configuration.");
    process.exit(1);
  }

  printBanner();
  prompts.intro("Create multimedia from text");

  let inputPath = options.file;
  let gutenbergId = options.gutenberg ? parseInt(options.gutenberg, 10) : undefined;

  if (!inputPath && !gutenbergId) {
    const inputType = await prompts.select({
      message: "How would you like to provide the source text?",
      options: [
        { value: "file", label: "Local file", hint: ".txt, .pdf, .epub, .md" },
        {
          value: "gutenberg",
          label: "Project Gutenberg",
          hint: "Download by book ID",
        },
      ],
    });

    if (prompts.isCancel(inputType)) {
      prompts.cancel("Creation cancelled.");
      return;
    }

    if (inputType === "file") {
      const filePath = await prompts.text({
        message: "Enter the path to your file:",
        validate: (value) => {
          if (!value) return "File path is required";
          if (!existsSync(value)) return "File not found";
        },
      });

      if (prompts.isCancel(filePath)) {
        prompts.cancel("Creation cancelled.");
        return;
      }

      inputPath = filePath;
    } else {
      const bookId = await prompts.text({
        message: "Enter the Project Gutenberg book ID:",
        placeholder: "e.g., 74 for Tom Sawyer",
        validate: (value) => {
          const id = parseInt(value, 10);
          if (isNaN(id) || id <= 0) return "Please enter a valid book ID";
        },
      });

      if (prompts.isCancel(bookId)) {
        prompts.cancel("Creation cancelled.");
        return;
      }

      gutenbergId = parseInt(bookId, 10);
    }
  }

  let selectedStages: PipelineStage[] | undefined;

  if (!options.stages) {
    const stagesChoice = await prompts.multiselect({
      message: "Which stages would you like to run?",
      options: STAGE_OPTIONS,
      required: true,
      initialValues: ["illustrations", "video", "music", "metadata"],
    });

    if (prompts.isCancel(stagesChoice)) {
      prompts.cancel("Creation cancelled.");
      return;
    }

    selectedStages = stagesChoice;
  } else {
    selectedStages = options.stages.split(",") as PipelineStage[];
  }

  if (selectedStages.includes("video") && !options.mode) {
    const videoMode = await prompts.select({
      message: "How would you like to create the video?",
      options: VIDEO_MODE_OPTIONS.map((m) => ({
        value: m.value,
        label: m.label,
        hint: m.description,
      })),
    });

    if (prompts.isCancel(videoMode)) {
      prompts.cancel("Creation cancelled.");
      return;
    }

    config.video.mode = videoMode as "slideshow" | "veo";
  }

  prompts.log({ type: "step", message: "Starting pipeline..." });
  prompts.log({
    type: "info",
    message: `Stages: ${selectedStages.join(", ")}`,
  });

  const startTime = Date.now();

  const result = await runPipeline(config, {
    inputPath,
    gutenbergId,
    stages: selectedStages,
  });

  const duration = Date.now() - startTime;

  if (result.success) {
    prompts.log({ type: "success", message: "Pipeline completed!" });
    prompts.log({ type: "info", message: `Duration: ${formatDuration(duration)}` });

    if (result.context.finalVideoPath) {
      prompts.note(
        `Video: ${result.context.finalVideoPath}`,
        "Output"
      );
    } else if (result.context.videoPath) {
      prompts.note(
        `Video: ${result.context.videoPath}`,
        "Output"
      );
    }

    prompts.outro("Done!");
  } else {
    prompts.log({ type: "error", message: "Pipeline completed with errors" });
    result.errors.forEach((err) => {
      prompts.log({ type: "error", message: err });
    });
    process.exit(1);
  }
}
