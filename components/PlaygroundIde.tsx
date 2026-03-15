"use client";

import React, { useState, useRef } from "react";
import {
  Play,
  Terminal,
  ChevronDown,
  Copy,
  Check,
  Trash2,
  Loader2,
  Code,
  ArrowLeft,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import Link from "next/link";

const LANGUAGES = [
  { label: "Python", value: "python", monacoLang: "python", icon: "🐍", defaultCode: `# Python Playground\nprint("Hello from E2B Sandbox!")\n\n# Try importing heavy libraries:\n# import numpy as np\n# import tensorflow as tf\n# print(f"NumPy version: {np.__version__}")\n# print(f"TensorFlow version: {tf.__version__}")\n` },
  { label: "JavaScript", value: "javascript", monacoLang: "javascript", icon: "⚡", defaultCode: `// JavaScript Playground\nconsole.log("Hello from E2B Sandbox!");\n\nconst fibonacci = (n) => {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n};\n\nconsole.log("Fibonacci(10):", fibonacci(10));\n` },
  { label: "TypeScript", value: "typescript", monacoLang: "typescript", icon: "🔷", defaultCode: `// TypeScript Playground\nconst greet = (name: string): string => {\n  return \`Hello, \${name}! from E2B Sandbox\`;\n};\n\nconsole.log(greet("World"));\n\ninterface Point {\n  x: number;\n  y: number;\n}\n\nconst distance = (a: Point, b: Point): number => {\n  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);\n};\n\nconsole.log("Distance:", distance({ x: 0, y: 0 }, { x: 3, y: 4 }));\n` },
  { label: "Java", value: "java", monacoLang: "java", icon: "☕", defaultCode: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from E2B Sandbox!");\n\n        int[] arr = {5, 3, 8, 1, 9, 2};\n        java.util.Arrays.sort(arr);\n        System.out.println("Sorted: " + java.util.Arrays.toString(arr));\n    }\n}\n` },
  { label: "C++", value: "cpp", monacoLang: "cpp", icon: "⚙️", defaultCode: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    cout << "Hello from E2B Sandbox!" << endl;\n\n    vector<int> v = {5, 3, 8, 1, 9, 2};\n    sort(v.begin(), v.end());\n\n    cout << "Sorted: ";\n    for (int x : v) cout << x << " ";\n    cout << endl;\n\n    return 0;\n}\n` },
];

export default function PlaygroundIde() {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [consoleOutput, setConsoleOutput] = useState("// Output will appear here...\n");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const editorRef = useRef<any>(null);

  const handleLanguageChange = (lang: typeof LANGUAGES[0]) => {
    setSelectedLang(lang);
    setCode(lang.defaultCode);
    setShowDropdown(false);
    setConsoleOutput("// Output will appear here...\n");
  };

  const runCode = async () => {
    setIsRunning(true);
    setConsoleOutput("> Sending to E2B Sandbox...\n");

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang.value,
          code: code,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Execution failed");
      }

      const data = await response.json();

      if (data.run) {
        let output = "";
        if (data.run.stdout) output += data.run.stdout;
        if (data.run.stderr) output += data.run.stderr;
        if (!output.trim()) output = "(No output)\n";

        if (data.run.code !== 0) {
          output += `\n> [EXIT CODE: ${data.run.code}]\n`;
        }

        setConsoleOutput(output);
      } else {
        setConsoleOutput("> Error: Unexpected response from sandbox.\n");
      }
    } catch (e: any) {
      setConsoleOutput(`> Execution failed.\n> ${e.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setConsoleOutput("// Output cleared.\n");
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition">
            <ArrowLeft size={18} />
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <Code size={14} className="text-black" />
            </div>
            <span className="font-bold text-sm hidden sm:inline">CodeOdyssey</span>
          </Link>

          <div className="h-5 w-px bg-neutral-700" />

          <h1 className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Playground
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-500 transition text-sm font-mono"
            >
              <span>{selectedLang.icon}</span>
              <span>{selectedLang.label}</span>
              <ChevronDown size={14} className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => handleLanguageChange(lang)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-800 transition text-sm ${
                        selectedLang.value === lang.value ? "bg-neutral-800 text-emerald-400" : "text-neutral-300"
                      }`}
                    >
                      <span>{lang.icon}</span>
                      <span className="font-medium">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Copy Code"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>

          {/* Run */}
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 rounded-lg text-sm font-bold transition text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {isRunning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} fill="white" />
            )}
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Editor
            height="100%"
            language={selectedLang.monacoLang}
            value={code}
            onChange={(value) => setCode(value || "")}
            onMount={(editor) => { editorRef.current = editor; }}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              renderWhitespace: "selection",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              bracketPairColorization: { enabled: true },
              automaticLayout: true,
            }}
          />
        </div>

        {/* Console Output */}
        <div className="w-[400px] flex flex-col border-l border-neutral-800 bg-[#0d0d0d]">
          {/* Console Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              <Terminal size={14} className="text-emerald-500" />
              Console Output
            </div>
            <button
              onClick={handleClear}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition"
              title="Clear Console"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Console Content */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {isRunning ? (
              <div className="flex items-center gap-3 text-emerald-400">
                <Loader2 size={16} className="animate-spin" />
                <span>Executing in E2B Sandbox...</span>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-neutral-300 leading-relaxed">
                {consoleOutput}
              </pre>
            )}
          </div>

          {/* Status Bar */}
          <div className="px-4 py-2 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-600 font-mono">
            <span>E2B Cloud Sandbox</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-yellow-500 animate-pulse" : "bg-emerald-500"}`} />
              {isRunning ? "Running" : "Ready"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
