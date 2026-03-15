import { GoogleGenAI, Type, Modality } from "@google/genai";

// Shared Gemini client for all API routes
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const MODEL_FAST = "gemini-3-flash-preview";
export const MODEL_SMART = "gemini-3-pro-preview";
export const MODEL_IMAGE = "gemini-2.5-flash-image";
export const MODEL_TTS = "gemini-2.5-flash-preview-tts";

/**
 * Helper to clean JSON strings returned by the model.
 */
export const cleanJsonString = (str: string): string => {
  if (!str) return "[]";
  let cleaned = str.replace(/```json/g, "").replace(/```/g, "");

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = cleaned.lastIndexOf("}") + 1;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = cleaned.lastIndexOf("]") + 1;
  }

  if (startIndex !== -1 && endIndex !== -1) {
    cleaned = cleaned.substring(startIndex, endIndex);
  }

  cleaned = cleaned.trim();
  return cleaned;
};

/**
 * Helper to remove markdown symbols for console output
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/###\s/g, "")
    .replace(/##\s/g, "")
    .replace(/#\s/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
};
