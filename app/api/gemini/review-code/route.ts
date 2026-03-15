import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_FAST, cleanJsonString, stripMarkdown } from "../shared";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { code, question, language } = await req.json();

    const prompt = `Review this ${language} code for "${question.title}". 
      Challenge Type: ${question.challengeType}.
      Constraints: ${question.constraints?.join(", ") || "None"}.
      
      User Code:
      ${code}
      
      Provide:
      1. Score (0-100). (Under 40 if constraints violated).
      2. Feedback (Short summary of what went well and what could be improved).
      3. Key Takeaway (A single, encouraging sentence summarizing the result).
      4. List of changes (originalSnippet, improvedSnippet, explanation).
         - 'improvedSnippet' MUST be a multi-line string with proper indentation (use \\n for newlines). Do NOT put the whole code in one line.
      5. List of "skillsLearned" (3-5 short concepts practiced, e.g. "Recursion", "Time Complexity", "Java Stream API").
      
      Return JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            keyTakeaway: { type: Type.STRING },
            skillsLearned: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalSnippet: { type: Type.STRING },
                  improvedSnippet: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
              },
            },
          },
          required: ["score", "feedback", "keyTakeaway", "changes", "skillsLearned"],
        },
      },
    });

    const cleanedText = cleanJsonString(response.text || "{}");
    const result = JSON.parse(cleanedText);
    if (result.feedback) result.feedback = stripMarkdown(result.feedback);
    if (result.keyTakeaway) result.keyTakeaway = stripMarkdown(result.keyTakeaway);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Code review failed", error);
    return NextResponse.json(
      { error: "Failed to review code", details: error.message },
      { status: 500 }
    );
  }
}
