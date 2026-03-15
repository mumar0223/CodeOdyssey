import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL_FAST, MODEL_SMART, MODEL_IMAGE, cleanJsonString } from "../shared";
import { utapi } from "@/lib/uploadthing-server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function uploadBase64ToUploadThing(dataUrl: string, filename: string) {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return dataUrl;
  
  try {
    const base64Data = dataUrl.split(",")[1];
    const mimeType = dataUrl.split(";")[0].split(":")[1];
    const buffer = Buffer.from(base64Data, "base64");
    
    // Polyfill File for Node.js if needed, or use Blob-like object utapi accepts
    const file = new File([buffer], filename, { type: mimeType });
    const response = await utapi.uploadFiles([file]);
    
    if (response && response[0] && response[0].data) {
      return response[0].data.url;
    }
  } catch (error) {
    console.error("UploadThing upload failed:", error);
  }
  return dataUrl; 
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      language,
      difficulty,
      concept,
      challengeType = "create",
      manualTimeLimit,
      aiMlConfig,
      levelDescription,
    } = body;

    const isAiMl = !!aiMlConfig;
    const effectiveConcept =
      aiMlConfig?.userConcept?.trim()
        ? aiMlConfig.userConcept
        : concept;

    // --- LEVEL DESCRIPTION CONTEXT ---
    let levelContext = "";
    if (levelDescription) {
      levelContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 LEVEL LEARNING OBJECTIVE (HIGHEST PRIORITY - FOLLOW THIS EXACTLY):
"${levelDescription}"

**MANDATORY ALIGNMENT RULE - THIS IS YOUR PRIMARY DIRECTIVE**:
- The question MUST directly teach and test the EXACT skills described in the level description above
- The problem complexity MUST match what the level description indicates
- The coding concepts required MUST align perfectly with the description
- If description says "Python basics with variables", create a pure Python problem about variables (NO libraries)
- If description says "NumPy array manipulation", create a NumPy problem
- If description says "for loops and iteration", the solution MUST use for loops
- READ THE LEVEL DESCRIPTION CAREFULLY and generate a question that PERFECTLY matches it

**THE LEVEL DESCRIPTION IS THE ABSOLUTE TRUTH - FOLLOW IT EXACTLY**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
    }

    // --- TOPIC ENFORCEMENT ---
    const conceptLower = effectiveConcept.toLowerCase();
    let topicGuard = "";
    if (!isAiMl) {
      if (conceptLower.includes("array") || conceptLower.includes("list") || conceptLower.includes("vector")) {
        topicGuard = `\n🔒 TOPIC ENFORCEMENT: Arrays/Lists\n- The function MUST accept a collection (array/list) as input\n- The solution MUST require iteration, indexing, or collection manipulation\n- DO NOT create math-only problems that happen to use arrays\n- The user MUST write code that processes multiple elements\n`;
      } else if (conceptLower.includes("loop") || conceptLower.includes("iteration")) {
        topicGuard = `\n🔒 TOPIC ENFORCEMENT: Loops\n- The solution MUST explicitly require a for loop or while loop\n- DO NOT create problems solvable with a single formula\n- The user MUST practice loop syntax and iteration logic\n`;
      } else if (conceptLower.includes("string")) {
        topicGuard = `\n🔒 TOPIC ENFORCEMENT: Strings\n- The input MUST be a string type\n- The solution MUST involve character manipulation or string operations\n`;
      }
    }

    // --- DIFFICULTY GUIDELINES ---
    let difficultyGuidance = "";
    if (difficulty === "Easy") {
      difficultyGuidance = `
📊 DIFFICULTY LEVEL: EASY (Absolute Beginner)
TARGET AUDIENCE: First-time programmers, high school students, coding bootcamp beginners
PROBLEM CHARACTERISTICS:
✓ Should be solvable in 5-20 lines of simple, straightforward code
✓ Tests ONE basic concept at a time (not multiple concepts)
✓ Requires only basic control structures (if/else, simple loops)
✓ NO complex algorithms or optimization required
✓ Time complexity: O(n) with a single basic loop is the maximum
AVOID FOR EASY: Two-pointer techniques, Complex edge case handling, Algorithm optimization challenges
`;
    } else if (difficulty === "Medium") {
      difficultyGuidance = `
📊 DIFFICULTY LEVEL: MEDIUM (Intermediate)
TARGET AUDIENCE: Programmers with 3-6 months experience
PROBLEM CHARACTERISTICS:
✓ Requires combining 2-3 programming concepts
✓ Should take 20-50 lines of code
✓ May involve nested loops or two-pointer techniques
✓ Requires thinking about multiple edge cases
✓ Time complexity: O(n log n) or O(n²) with optimization possible
`;
    } else {
      difficultyGuidance = `
📊 DIFFICULTY LEVEL: HARD (Advanced)
TARGET AUDIENCE: Experienced programmers, interview preparation
PROBLEM CHARACTERISTICS:
✓ Requires deep algorithmic thinking
✓ May combine multiple data structures and algorithms
✓ Should take 50-100+ lines of well-thought code
✓ Includes tricky edge cases
✓ May require dynamic programming, graph algorithms, or advanced techniques
`;
    }

    // --- TYPE INSTRUCTION ---
    let typeInstruction = "";
    if (isAiMl) {
      typeInstruction = `
Type: AI/ML IMPLEMENTATION. Language: PYTHON ONLY.
${aiMlConfig ? `Library Focus: ${aiMlConfig.library}.` : 'Pure Python (no external libraries).'}
Topic: ${effectiveConcept} ${aiMlConfig ? `(Subtopic: ${aiMlConfig.subTopic})` : ''}.
${aiMlConfig ? `Task: Create a coding challenge using ${aiMlConfig.library}. 'starterCode' must NOT solve the problem.` : `Task: Create a PURE PYTHON problem (no external libraries). 'starterCode' must ONLY contain function definition.`}
`;
    } else {
      if (challengeType === "debug") {
        typeInstruction = `Type: BUG FIXING CHALLENGE. The 'starterCode' MUST contain a COMPLETE, FULL implementation with SPECIFIC BUGS. DO NOT provide an empty function.`;
      } else if (challengeType === "optimize") {
        typeInstruction = `Type: OPTIMIZATION CHALLENGE. The 'starterCode' MUST contain a COMPLETE, FUNCTIONING but INEFFICIENT implementation. DO NOT provide an empty function.`;
      } else if (challengeType === "mixed") {
        typeInstruction = `Type: BUG FIXING + OPTIMIZATION CHALLENGE. The 'starterCode' MUST contain FULL code with BOTH bugs AND inefficiencies.`;
      } else {
        typeInstruction = `Type: IMPLEMENTATION. The 'starterCode' must ONLY contain the function signature.`;
      }
    }

    // --- LANGUAGE SPECIFICS ---
    let functionName = "solution";
    let langSpecifics = "";
    if (language === "Python" || isAiMl) {
      functionName = "solution";
      langSpecifics = difficulty === "Easy"
        ? `🐍 PYTHON - EASY MODE: Use basic loops, conditionals, list operations. No advanced features. Starter: def solution(param1, param2): pass`
        : `🐍 PYTHON - MEDIUM/HARD MODE: All Python features allowed including comprehensions, lambda, collections, enumerate, zip. Starter: def solution(param1: TypeHint) -> ReturnType: pass`;
    } else if (language === "Java") {
      functionName = "solution";
      langSpecifics = `☕ JAVA: Use 'public static' method named 'solution'. All Java standard library allowed.`;
    } else if (language === "C++") {
      functionName = "solution";
      langSpecifics = `⚡ C++: Use standalone function named 'solution'. Include necessary headers.`;
    } else if (language === "TypeScript") {
      functionName = "solution";
      langSpecifics = `📘 TypeScript: Use 'function solution(...)' with type annotations.`;
    } else {
      functionName = "solution";
      langSpecifics = `📜 JavaScript: Use 'function solution(...)'.`;
    }

    const timePrompt = manualTimeLimit
      ? `Target time: ${manualTimeLimit} minutes.`
      : `Determine appropriate 'timeLimit': Easy (5-15 min), Medium (15-30 min), Hard (30-60 min). MAX 60 minutes.`;

    const prompt = `
${challengeType !== 'create' ? `🚨 SPECIAL MODE: ${challengeType.toUpperCase()} CHALLENGE - PROVIDE FULL CODE, NOT EMPTY FUNCTIONS!` : ''}
Generate a ${difficulty} coding question in ${isAiMl ? 'Python' : language}.

${levelContext}
TOPIC: "${effectiveConcept}"
${topicGuard}
${difficultyGuidance}

STRICTLY ADHERE TO TOPIC AND LEVEL DESCRIPTION.
${levelDescription ? 'THE LEVEL DESCRIPTION ABOVE IS THE PRIMARY DIRECTIVE - FOLLOW IT EXACTLY.' : ''}
The question MUST directly teach/test "${effectiveConcept}".

${typeInstruction}
${timePrompt}
${langSpecifics}

CRITICAL REQUIREMENTS:
1. The 'starterCode' MUST define the required function named '${functionName}'
2. 'testCases' as a JSON array of EXACTLY 3 OPEN test cases: { "input": [args], "expected": returnValue }
3. 'hiddenTestCases' as a JSON array of EXACTLY 5 HIDDEN edge-case test cases: { "input": [args], "expected": returnValue }
   - Hidden test cases MUST cover: empty/minimal inputs, boundary values (0, negative, max int), duplicate elements, single-element inputs, and worst-case scenarios
   - These should be the HARDEST test cases that catch common mistakes
4. 'description' with Markdown formatting, LaTeX for math: $E = mc^2$
5. ${challengeType !== 'create' ? 'PROVIDE FULL CODE with bugs/inefficiencies' : 'starterCode MUST BE EMPTY OF LOGIC'}
6. Parameter types in 'starterCode' MUST EXACTLY match ALL 'testCases'

RETURN ONLY RAW JSON:
{
  "title": "string",
  "description": "markdown string",
  "inputFormat": "string",
  "outputFormat": "string",
  "examples": [{ "input": "string", "output": "string", "explanation": "string" }],
  "constraints": ["string"],
  "starterCode": "string",
  "hint": "string",
  "timeLimit": number,
  "penaltyDrop": number,
  "penaltyInterval": number,
  "testCases": [{ "input": [any], "expected": any }],
  "hiddenTestCases": [{ "input": [any], "expected": any }]
}`;

    // Run text + images in parallel
    const textPromise = ai.models.generateContent({
      model: difficulty === "Easy" ? MODEL_FAST : MODEL_SMART,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const artImagePromise = (async () => {
      try {
        const imgPrompt = isAiMl
          ? `Abstract data visualization of ${effectiveConcept}. Neural network nodes, glowing connections, cyan and teal color palette, futuristic data science aesthetic.`
          : `Digital art illustration representing: ${effectiveConcept}. Cyberpunk style, neon lights, dark background, high contrast.`;

        const imgRes = await ai.models.generateContent({
          model: MODEL_IMAGE,
          contents: { parts: [{ text: imgPrompt }] },
          config: { imageConfig: { aspectRatio: "16:9" } },
        });
        const imagePart = imgRes.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        return imagePart?.inlineData
          ? `data:image/jpeg;base64,${imagePart.inlineData.data}`
          : `https://picsum.photos/seed/${effectiveConcept}/800/450`;
      } catch {
        return `https://picsum.photos/seed/${effectiveConcept}/800/450`;
      }
    })();

    const diagramPromise = (async () => {
      try {
        const diagramPrompt = isAiMl
          ? `Mathematical architecture diagram for ${effectiveConcept} algorithm. Minimalist, technical schematic, white background.`
          : `Technical flowchart or data structure diagram for: ${effectiveConcept}. Minimalist, white background, black lines, schematic style.`;

        const imgRes = await ai.models.generateContent({
          model: MODEL_IMAGE,
          contents: { parts: [{ text: diagramPrompt }] },
          config: { imageConfig: { aspectRatio: "16:9" } },
        });
        const imagePart = imgRes.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        return imagePart?.inlineData
          ? `data:image/jpeg;base64,${imagePart.inlineData.data}`
          : "";
      } catch {
        return "";
      }
    })();

    const [textResponse, imageUrl, diagramUrl] = await Promise.all([
      textPromise,
      artImagePromise,
      diagramPromise,
    ]);

    const cleanedText = cleanJsonString(textResponse.text || "{}");
    let questionData;
    try {
      questionData = JSON.parse(cleanedText);
    } catch {
      questionData = {
        title: "Error Generating Question",
        description: "There was an issue parsing the AI response. Please try regenerating the question.",
        starterCode: "# Error: Could not generate valid code.\\n# Please go back and try again.",
        constraints: [],
        examples: [],
        testCases: [],
      };
    }

    // Normalize testCases expected values
    const testCases = questionData.testCases?.map((tc: any) => {
      if (typeof tc.expected === "string") {
        try {
          const parsed = JSON.parse(tc.expected);
          if (typeof parsed === "object" || typeof parsed === "number" || typeof parsed === "boolean") {
            return { ...tc, expected: parsed };
          }
        } catch {}
      }
      return tc;
    });

    // Normalize hiddenTestCases expected values
    const hiddenTestCases = (questionData.hiddenTestCases || []).map((tc: any) => {
      if (typeof tc.expected === "string") {
        try {
          const parsed = JSON.parse(tc.expected);
          if (typeof parsed === "object" || typeof parsed === "number" || typeof parsed === "boolean") {
            return { ...tc, expected: parsed };
          }
        } catch {}
      }
      return tc;
    });

    const safeTimeLimit = Math.min(Math.max(0, questionData.timeLimit || 0), 60);

    const question = {
      ...questionData,
      testCases: testCases || [],
      hiddenTestCases: hiddenTestCases || [],
      imageUrl,
      diagramUrl,
      challengeType,
      timeLimit: manualTimeLimit ?? safeTimeLimit,
      penaltyDrop: questionData.penaltyDrop || 1,
      penaltyInterval: questionData.penaltyInterval || 15,
    };

    // Upload images to UploadThing in the background
    const uploadedImageUrl = await uploadBase64ToUploadThing(question.imageUrl, "concept_art.jpg");
    const uploadedDiagramUrl = await uploadBase64ToUploadThing(question.diagramUrl, "problem_diagram.jpg");

    question.imageUrl = uploadedImageUrl;
    question.diagramUrl = uploadedDiagramUrl;

    // Save to Database
    let dbId = null;
    try {
      if (isAiMl) {
        const res = await convex.mutation(api.questions.saveAiMlQuestion as any, {
          title: question.title,
          difficulty: difficulty,
          topic: effectiveConcept,
          sub_topic: aiMlConfig?.subTopic || "",
          library_focus: aiMlConfig?.library || "",
          description: question.description,
          concept_art_image_url: uploadedImageUrl,
          voice_url: "", // Populated later by background TTS
          python_code: typeof question.starterCode === "string" ? question.starterCode : JSON.stringify(question.starterCode),
          testcases: question.testCases.map((tc: any) => ({ input: JSON.stringify(tc.input), expected: JSON.stringify(tc.expected) })),
          hidden_testcases: question.hiddenTestCases.map((tc: any) => ({ input: JSON.stringify(tc.input), expected: JSON.stringify(tc.expected) })),
          time_limit: question.timeLimit,
          memory_limit: 512,
        });
        dbId = res.id;
      } else {
        const res = await convex.mutation(api.questions.saveGeneratedQuestion as any, {
          title: question.title,
          difficulty: difficulty,
          topic: effectiveConcept,
          description: question.description,
          concept_art_image_url: uploadedImageUrl,
          problem_image_url: uploadedDiagramUrl,
          voice_url: "", // Populated later by background TTS
          input_format: question.inputFormat || "Standard Input",
          output_format: question.outputFormat || "Standard Output",
          constraints: question.constraints || [],
          examples: question.examples || [],
          tags: [effectiveConcept.toLowerCase()],
          starter_code: typeof question.starterCode === "object" ? question.starterCode : { [language]: question.starterCode },
          supported_languages: [language],
          testcases: question.testCases.map((tc: any) => ({ input: JSON.stringify(tc.input), expected: JSON.stringify(tc.expected) })),
          hidden_testcases: question.hiddenTestCases.map((tc: any) => ({ input: JSON.stringify(tc.input), expected: JSON.stringify(tc.expected) })),
          time_limit: question.timeLimit,
          memory_limit: 256,
        });
        dbId = res.id;
      }
      question.dbId = dbId;
    } catch (dbError) {
      console.error("Failed to save generated question to database:", dbError);
    }

    return NextResponse.json(question);
  } catch (error: any) {
    console.error("Question generation failed", error);
    return NextResponse.json(
      { error: "Failed to generate question", details: error.message },
      { status: 500 }
    );
  }
}
