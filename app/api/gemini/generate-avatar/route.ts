import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_IMAGE } from "../shared";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A prompt string is required." },
        { status: 400 }
      );
    }

    const avatarPrompt = `Create a stylized digital avatar portrait for a coding platform user profile.
Style: Clean, modern, vibrant digital art. Square composition, centered face/bust.
The avatar should look professional yet creative, suitable as a profile picture.
User description: ${prompt}
Important: No text, no watermarks, no borders. Just the avatar artwork on a clean background.`;

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: avatarPrompt,
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    // Extract the image from the response parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: "No image generated." },
        { status: 500 }
      );
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        return NextResponse.json({
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }

    return NextResponse.json(
      { error: "No image data in response." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Avatar generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate avatar. Please try again." },
      { status: 500 }
    );
  }
}
