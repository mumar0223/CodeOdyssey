import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_FAST, cleanJsonString } from "../shared";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { language, experience, goals, isAiMlMode } = await req.json();

    let prompt = "";

    if (isAiMlMode) {
      prompt = `Create a specialized AI/ML learning roadmap (7-15 levels) using PYTHON ONLY.
      User Experience: ${experience}.
      Focus Area: ${goals}.
      
      🔴 CRITICAL MANDATORY RULE FOR ALL EXPERIENCE LEVELS:
      
      **REGARDLESS of experience level (even if Advanced/Expert), the roadmap MUST start with 1-2 Python fundamentals levels.**
      
      These initial levels are REQUIRED to teach the core Python functions and syntax that will be used in later AI/ML levels:
      - Level 1: Python basics (variables, data types, basic operations, if/else)
      - Level 2: Python data structures (lists, dictionaries, list comprehensions, basic loops)
      
      WHY THIS IS MANDATORY:
      - Users need to understand Python syntax before using libraries
      - Concepts like list comprehensions, lambda functions, and dictionary operations are ESSENTIAL for NumPy/Pandas
      - Even advanced users benefit from a quick Python syntax refresher in the context of data science
      
      STRUCTURE (MANDATORY):
      1. **Levels 1-2: PURE PYTHON FUNDAMENTALS** (NO libraries - teach Python features needed for ML)
         - Variables, data types, basic operations
         - Lists, dicts, comprehensions, functions
         - These levels prepare users for library-based coding
      
      2. **Level 3+: Library Fundamentals** (if Beginner/Intermediate)
         - NumPy basics, Pandas basics, data preprocessing
         - OR skip to advanced if user is Expert
      
      3. **Later Levels: Core Concepts of ${goals}**
         - Actual ML/AI algorithms and applications
         - Advanced implementations
      
      IMPORTANT: Each level's 'description' should clearly specify:
      - What EXACT skill will be taught
      - Whether it uses pure Python or a specific library
      - What Python concepts are being practiced
      
      Example good descriptions:
      - "Master Python list operations and comprehensions for data manipulation" (Pure Python, no imports)
      - "Learn NumPy array creation and indexing to prepare for matrix operations" (NumPy library)

      Return a JSON array only.`;
    } else {
      prompt = `Create a coding learning roadmap with between 7 and 20 levels (adapt count based on goal complexity) for a user who knows ${language}, has ${experience} experience, and wants to learn: ${goals}. 
      The levels should progress from easy to hard.
      
      CRITICAL: Each level's 'description' must be DETAILED and SPECIFIC about what coding skill or concept that level teaches. This description will directly guide the generation of coding questions for that level.
      
      Example good description: "Learn to iterate through arrays using for loops and access elements by index to solve basic traversal problems"
      Example bad description: "Arrays" (too vague)
      
      Return a JSON array only.`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              skillsGained: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: {
                type: Type.STRING,
                enum: ["Easy", "Medium", "Hard"],
              },
              concept: { type: Type.STRING },
            },
            required: [
              "id",
              "title",
              "description",
              "skillsGained",
              "difficulty",
              "concept",
            ],
          },
        },
      },
    });

    const cleanedText = cleanJsonString(response.text || "[]");
    const data = JSON.parse(cleanedText);

    if (!Array.isArray(data)) {
      return NextResponse.json([]);
    }

    const roadmap = data.map((level: any, index: number) => ({
      ...level,
      status: index === 0 ? "unlocked" : "locked",
    }));

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Roadmap generation failed", error);
    return NextResponse.json([], { status: 500 });
  }
}
