/**
 * Gemini Service — Thin client wrappers.
 *
 * All heavy AI logic now lives in Next.js API routes under /api/gemini/*.
 * These wrappers keep the same function signatures so existing consumers
 * (CodeIde, ArenaIde, AiMlIde, page.tsx) work without any changes.
 */

import { Question, RoadmapLevel, CodeReview, ChallengeType } from "@/lib/types";

// ─── Helpers (still client-side, no secret keys) ─────────────

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

/**
 * Helper to decode raw PCM audio data from Gemini TTS
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// ─── API Wrappers ────────────────────────────────────────────

/**
 * Generates a structured roadmap based on user assessment.
 */
export const generateRoadmap = async (
  language: string,
  experience: string,
  goals: string,
  isAiMlMode: boolean = false,
): Promise<RoadmapLevel[]> => {
  try {
    const res = await fetch("/api/gemini/generate-roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, experience, goals, isAiMlMode }),
    });

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Roadmap generation failed", error);
    return [];
  }
};

/**
 * Generates a structured coding question.
 */
export const generateQuestion = async (
  language: string,
  difficulty: string,
  concept: string,
  challengeType: ChallengeType = "create",
  manualTimeLimit?: number,
  aiMlConfig?: {
    library: string;
    subTopic: string;
    userConcept?: string;
  },
  levelDescription?: string,
): Promise<Question> => {
  try {
    const res = await fetch("/api/gemini/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        difficulty,
        concept,
        challengeType,
        manualTimeLimit,
        aiMlConfig,
        levelDescription,
      }),
    });

    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (error) {
    console.error("Question generation failed", error);
    return {
      title: "Error Generating Question",
      description: "There was an issue. Please try again.",
      inputFormat: "",
      outputFormat: "",
      examples: [],
      constraints: [],
      starterCode: "// Error",
      hint: "",
      challengeType: "create",
      timeLimit: 0,
      penaltyDrop: 1,
      penaltyInterval: 15,
      testCases: [],
    };
  }
};

/**
 * Gets a hint for the user's current code.
 */
export const getHint = async (
  code: string,
  question: Question,
  language: string,
): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/get-hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, question, language }),
    });

    if (!res.ok) return "Check your logic.";
    const data = await res.json();
    return data.hint || "Check your logic.";
  } catch {
    return "Check your logic.";
  }
};

/**
 * Reviews user code and provides structured feedback.
 */
export const reviewCode = async (
  code: string,
  question: Question,
  language: string,
): Promise<CodeReview> => {
  const res = await fetch("/api/gemini/review-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, question, language }),
  });

  if (!res.ok) throw new Error("Review failed");
  return await res.json();
};

/**
 * Generates speech audio from text (TTS).
 * Returns raw PCM bytes for client-side AudioBuffer decoding.
 */
export const speakText = async (text: string): Promise<Uint8Array> => {
  const res = await fetch("/api/gemini/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error("No audio generated");
  const data = await res.json();

  if (!data.audio) throw new Error("No audio generated");

  // Convert base64 to Uint8Array
  const binaryString = atob(data.audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};