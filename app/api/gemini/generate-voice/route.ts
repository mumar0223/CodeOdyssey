import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_TTS } from "../shared";
import { Modality } from "@google/genai";
import { utapi } from "@/lib/uploadthing-server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, questionId, isAiMl } = body;

    if (!text || !questionId) {
       return NextResponse.json({ error: "Missing text or questionId" }, { status: 400 });
    }

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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    const buffer = Buffer.from(base64Audio, "base64");
    
    const file = new File([buffer], `voice_${questionId}.wav`, { type: "audio/wav" });
    const uploadRes = await utapi.uploadFiles([file]);
    
    if (uploadRes && uploadRes[0] && uploadRes[0].data) {
      const voiceUrl = uploadRes[0].data.url;
      
      // Update the question
      await convex.mutation(api.questions.updateQuestionVoice, {
        questionId: questionId as string,
        voiceUrl: voiceUrl,
        isAiMl: !!isAiMl,
      });

      return NextResponse.json({ voiceUrl, base64Audio });
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  } catch (error: any) {
    console.error("Background voice generation failed", error);
    return NextResponse.json(
      { error: "Failed to generate speech", details: error.message },
      { status: 500 }
    );
  }
}
