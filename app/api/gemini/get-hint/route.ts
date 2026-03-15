import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_FAST, stripMarkdown } from "../shared";

export async function POST(req: NextRequest) {
  try {
    const { code, question, language } = await req.json();

    const prompt = `The user is solving "${question.title}".
      User Code:
      ${code}

      Provide a short, helpful hint about logic or bugs. 
      Do not give the code solution.`;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    const hint = stripMarkdown(response.text || "Check your logic.");
    return NextResponse.json({ hint });
  } catch (error: any) {
    console.error("Hint generation failed", error);
    return NextResponse.json(
      { hint: "Could not generate hint. Please try again." },
      { status: 500 }
    );
  }
}
