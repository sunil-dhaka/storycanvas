import { GoogleGenAI } from "@google/genai";
import type { StoryCanvasConfig } from "../core/types.js";

let clientInstance: GoogleGenAI | null = null;

export function initializeClient(apiKey: string): GoogleGenAI {
  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
}

export function getClient(): GoogleGenAI {
  if (!clientInstance) {
    throw new Error(
      "Gemini client not initialized. Call initializeClient first."
    );
  }
  return clientInstance;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello",
    });
    return !!response.text;
  } catch {
    return false;
  }
}

export interface ChatSession {
  sendMessage: (message: string) => Promise<string>;
  sendMessageWithFile: (
    message: string,
    fileUri: string,
    mimeType: string
  ) => Promise<string>;
}

export async function createChatSession(
  model: string,
  systemInstruction?: string
): Promise<ChatSession> {
  const client = getClient();

  const chat = client.chats.create({
    model,
    config: {
      systemInstruction,
    },
  });

  return {
    async sendMessage(message: string): Promise<string> {
      const response = await chat.sendMessage({ message });
      return response.text ?? "";
    },

    async sendMessageWithFile(
      message: string,
      fileUri: string,
      mimeType: string
    ): Promise<string> {
      const response = await chat.sendMessage({
        message: [
          { fileData: { fileUri, mimeType } },
          { text: message },
        ],
      });
      return response.text ?? "";
    },
  };
}

export interface JsonChatSession<T> {
  sendMessage: (message: string) => Promise<T[]>;
  sendMessageWithFile: (
    message: string,
    fileUri: string,
    mimeType: string
  ) => Promise<T[]>;
}

export async function createJsonChatSession<T>(
  model: string,
  systemInstruction?: string
): Promise<JsonChatSession<T>> {
  const client = getClient();

  const chat = client.chats.create({
    model,
    config: {
      responseMimeType: "application/json",
      systemInstruction,
    },
  });

  return {
    async sendMessage(message: string): Promise<T[]> {
      const response = await chat.sendMessage({ message });
      const text = response.text ?? "[]";
      return JSON.parse(text) as T[];
    },

    async sendMessageWithFile(
      message: string,
      fileUri: string,
      mimeType: string
    ): Promise<T[]> {
      const response = await chat.sendMessage({
        message: [
          { fileData: { fileUri, mimeType } },
          { text: message },
        ],
      });
      const text = response.text ?? "[]";
      return JSON.parse(text) as T[];
    },
  };
}

export async function uploadFile(
  filePath: string,
  mimeType: string,
  displayName?: string
): Promise<{ uri: string; mimeType: string }> {
  const client = getClient();
  const { readFileSync } = await import("node:fs");
  const { basename } = await import("node:path");

  const fileData = readFileSync(filePath);
  const name = displayName ?? basename(filePath);

  const uploadResult = await client.files.upload({
    file: new Blob([fileData], { type: mimeType }),
    config: {
      displayName: name,
    },
  });

  if (!uploadResult.uri) {
    throw new Error("Failed to upload file");
  }

  return {
    uri: uploadResult.uri,
    mimeType: uploadResult.mimeType ?? mimeType,
  };
}

export async function generateContent(
  model: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const client = getClient();

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  return response.text ?? "";
}

export async function generateJsonContent<T>(
  model: string,
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const client = getClient();

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction,
    },
  });

  const text = response.text ?? "{}";
  return JSON.parse(text) as T;
}

export async function analyzeVideo(
  model: string,
  videoPath: string,
  prompt: string
): Promise<string> {
  const client = getClient();
  const { readFileSync } = await import("node:fs");

  const videoData = readFileSync(videoPath);

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType: "video/mp4",
          data: videoData.toString("base64"),
        },
      },
      { text: prompt },
    ],
  });

  return response.text ?? "";
}

export async function analyzeVideoJson<T>(
  model: string,
  videoPath: string,
  prompt: string
): Promise<T> {
  const client = getClient();
  const { readFileSync } = await import("node:fs");

  const videoData = readFileSync(videoPath);

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType: "video/mp4",
          data: videoData.toString("base64"),
        },
      },
      { text: prompt },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "{}";
  return JSON.parse(text) as T;
}

export function createConfiguredClient(
  config: StoryCanvasConfig
): GoogleGenAI {
  return initializeClient(config.apiKey);
}
