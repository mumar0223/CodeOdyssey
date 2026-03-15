import { NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";

// Helper function to strip messy console outputs (ANSI codes, backspaces, and TF logs)
function cleanOutput(text: string): string {
  if (!text) return "";

  // 1. Strip ANSI escape codes (removes terminal colors and weird symbols)
  let cleaned = text.replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g,
    "",
  );

  // 2. THE FIX: Resolve carriage returns (\r) like a real terminal.
  // This keeps only the final "frame" of the Keras progress bar on one clean line.
  cleaned = cleaned
    .split("\n")
    .map((line) => {
      const parts = line.split("\r");
      return parts[parts.length - 1]; // Keep only the text after the final \r
    })
    .join("\n");

  // 3. Strip backspace characters (removes the weird     squares)
  cleaned = cleaned.replace(/[\x08]/g, "");

  // 4. Filter out any leftover TensorFlow C++ warning lines
  return cleaned
    .split("\n")
    .filter(
      (line) =>
        !line.includes("oneDNN") &&
        !line.includes("This TensorFlow binary is optimized") &&
        !line.includes("absl::InitializeLog") &&
        line.trim() !== "",
    )
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { code, language } = await request.json();

    if (!code || !language) {
      return NextResponse.json(
        { message: "Code and language are required" },
        { status: 400 },
      );
    }

    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { message: "E2B_API_KEY is missing." },
        { status: 500 },
      );
    }

    const langMap: Record<
      string,
      { ext: string; runCmd: (file: string) => string }
    > = {
      javascript: { ext: "js", runCmd: (f) => `node ${f}` },
      typescript: { ext: "ts", runCmd: (f) => `npx tsx ${f}` },
      python: { ext: "py", runCmd: (f) => `python3 ${f}` },
      java: {
        ext: "java",
        runCmd: () => `cd /workspace && javac Main.java && java Main`,
      },
      cpp: {
        ext: "cpp",
        runCmd: () =>
          `g++ /workspace/main.cpp -o /workspace/main && /workspace/main`,
      },
    };

    const config = langMap[language];

    if (!config) {
      return NextResponse.json(
        { message: `Unsupported language: ${language}` },
        { status: 400 },
      );
    }

    const sandbox = await Sandbox.create("code-odyssey-env");

    try {
      let fileName = `/workspace/main.${config.ext}`;
      if (language === "java") {
        fileName = "/workspace/Main.java";
      }

      let finalCodeToRun = code;

      // INJECTION FIX: Invisibly add warning suppressors to the top of Python code
      if (language === "python") {
        finalCodeToRun = `import os\nos.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'\nos.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'\nimport warnings\nwarnings.filterwarnings('ignore')\n\n${code}`;
      }

      // Write code to sandbox (this overwrites previous files, ensuring LeetCode-style clean state for that file)
      await sandbox.files.write(fileName, finalCodeToRun);

      let result;

      try {
        result = await sandbox.commands.run(config.runCmd(fileName), {
          timeoutMs: 0, // Bypass timeout for heavy ML imports
        });
      } catch (err: any) {
        console.error("Execution failed:", err);
        result = err.result || { stdout: "", stderr: err.message, exitCode: 1 };
      }

      // Process and clean the outputs
      const cleanStdout = cleanOutput(result.stdout);
      const cleanStderr = cleanOutput(result.stderr);

      // EXIT CODE FIX: Check the actual system exit code, not just if stderr has text
      const hasFailed = result.exitCode !== 0;

      return NextResponse.json({
        run: {
          stdout: cleanStdout,
          stderr: cleanStderr,
          code: hasFailed ? 1 : 0,
          output: hasFailed ? cleanStderr || cleanStdout : cleanStdout,
        },
      });
    } finally {
      await sandbox.kill();
    }
  } catch (error: any) {
    console.error("Execution Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
