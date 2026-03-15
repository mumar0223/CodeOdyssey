import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_TTS } from "../shared";
import { Modality } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Fenrir" },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // Return the base64 audio — client will decode it
    return NextResponse.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("TTS failed", error);
    return NextResponse.json(
      { error: "Failed to generate speech", details: error.message },
      { status: 500 }
    );
  }
}
