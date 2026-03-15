import { useEffect, useState, useRef } from "react";

// --- PERSISTENT SANDBOX STATE (Wait for connection before allowing runs)
import {
  reviewCode,
  speakText,
  decodeAudioData,
  getHint,
  stripMarkdown,
} from "@/services/geminiService";
import {
  Volume2,
  CheckCircle,
  Code,
  Terminal,
  Zap,
  BookOpen,
  X,
  Maximize2,
  GripHorizontal,
  ArrowRight,
  Trophy,
  Search,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Timer as TimerIcon,
  Star,
  Loader2,
  ExternalLink,
  Bot,
  Play,
  Copy,
  Check,
  ClipboardPaste,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { CodeReview, Question, TestCase } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { AnimatedGlowButton } from "./custom-ui/animated-glow-button";

interface AiMlIdeProps {
  question: Question;
  language: string; // Should always be Python ideally
  onBack: () => void;
  onComplete?: () => void;
  storageKey?: string;
  isCustomMode?: boolean;
}

const simpleFormat = (code: string | undefined | null) => {
  if (!code || typeof code !== "string")
    return "# Write your solution here...";
  if (code.includes("\n")) return code;
  return code;
};

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};


const extractPythonImports = (code: string) => {
  const userImports: string[] = [];
  const nonImportLines: string[] = [];

  for (const line of code.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      userImports.push(trimmed);
    } else {
      nonImportLines.push(line);
    }
  }

  return {
    userImports,
    userCodeWithoutImports: nonImportLines.join('\n').trim()
  };
};

const mergePythonImports = (harness: string[], user: string[]) => {
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, ' ');

  const harnessSet = new Set(harness.map(normalize));

  const filteredUser = user.filter(
    i => !harnessSet.has(normalize(i))
  );

  return [...harness, ...filteredUser];
};


// --- HARNESS GENERATOR FOR PYTHON ---
const generatePythonHarness = (userCode: string, testCases: TestCase[]) => {
  const hasHarness = userCode.includes('===== YOUR CODE BELOW =====');

  let cleanUserCode = userCode;
  if (hasHarness) {
    const parts = userCode.split('===== YOUR CODE BELOW =====');
    if (parts.length > 1) {
      cleanUserCode = parts[1].trim();
    }
  }

  // 1. Extract user imports
  const { userImports, userCodeWithoutImports } =
    extractPythonImports(cleanUserCode);

  // 2. Harness imports
  const harnessImports = [
    'import json',
    'import time',
    'from typing import Any'
  ];

  // 3. Merge & dedupe
  const allImports = mergePythonImports(harnessImports, userImports);

  // 4. Build test calls
  const calls = testCases.map((tc, i) => {
    const inputJson = JSON.stringify(tc.input)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    const expectedJson = JSON.stringify(tc.expected)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    return `
    try:
        start_time = time.time()
        args = json.loads('${inputJson}')
        expected = json.loads('${expectedJson}')
        result = solution(*args)
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        time_str = f"{duration_ms:.2f}ms" if duration_ms >= 0.1 else "<0.1ms"

        is_passed = deep_equal(result, expected)
        status = "PASSED" if is_passed else "FAILED"
        print(f"> Test Case ${i + 1}: {status} ({time_str})")
        
        # Format input args to remove outer brackets
        input_str = ", ".join(json.dumps(a) for a in args)

        if is_passed:
            print(f"  Input: {input_str}")
            print(f"  Result: {json.dumps(result)}")
        else:
            print(f"  Input: {input_str}")
            print(f"  Expected: {json.dumps(expected)}")
            print(f"  Actual: {json.dumps(result)}")

    except Exception as e:
        print(f"> Test Case ${i + 1}: ERROR")
        print(f"  {type(e).__name__}: {e}")
    print("")
`;
  }).join('\n');

  // 5. Final assembly
  return `
# region TEST HARNESS - DO NOT MODIFY
${allImports.join('\n')}

def deep_equal(a: Any, b: Any) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    
    if type(a) != type(b):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return abs(a - b) < 1e-9
        return False
    
    if isinstance(a, (bool, int, float, str)):
        if isinstance(a, float) and isinstance(b, float):
            return abs(a - b) < 1e-9
        return a == b
    
    if isinstance(a, (list, tuple)):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))
    
    if isinstance(a, set):
        return a == b
    
    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equal(a[k], b[k]) for k in a.keys())
    
    return a == b
# endregion

${userCodeWithoutImports}

if __name__ == "__main__":
${calls}
`;
};


export default function AiMlIde({
  question,
  language,
  onBack,
  onComplete,
  storageKey,
  isCustomMode,
}: AiMlIdeProps) {
  // State
  const [code, setCode] = useState(simpleFormat(question?.starterCode));
  const [consoleOutput, setConsoleOutput] = useState<string>(
    "// AI/ML Verification Console ready...",
  );
  const [review, setReview] = useState<CodeReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [activeTab, setActiveTab] = useState<"problem" | "review">("problem");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Sandbox state no longer needed (instantly created on run)

  const [latestHint, setLatestHint] = useState<string | null>(null);

  // Audio Logic
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const editorRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Stats
  const [submissionStats, setSubmissionStats] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(question.timeLimit * 60);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Layout
  const [leftPanelWidth, setLeftPanelWidth] = useState(40);
  const [consoleHeight, setConsoleHeight] = useState(300); // Taller for manual inputs
  const [showProblem, setShowProblem] = useState(true);
  const [showConsole, setShowConsole] = useState(true);

  // Image Viewer
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Background Audio Generation & Fetching
  useEffect(() => {
    let isMounted = true;
    const initAudio = async () => {
      if (audioBufferRef.current) return;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioCtxRef.current;

        if (question.voiceUrl) {
          const res = await fetch(question.voiceUrl);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuffer);
          if (isMounted) audioBufferRef.current = buffer;
        } else if (question.dbId) {
          const textToSpeak = `${question.title}. ${question.description}`;
          const res = await fetch("/api/gemini/generate-voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              text: textToSpeak, 
              questionId: question.dbId, 
              isAiMl: true 
            })
          });
          const data = await res.json();
          if (data.base64Audio && isMounted) {
            const binaryString = atob(data.base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const buffer = await decodeAudioData(bytes, ctx);
            if (isMounted) audioBufferRef.current = buffer;
          }
        }
      } catch (err) {
        console.error("Background voice prep failed", err);
      }
    };

    initAudio();

    return () => { isMounted = false; };
  }, [question]);



  // Persistence
  useEffect(() => {
    setCode(simpleFormat(question?.starterCode));
  }, [question]);

  useEffect(() => {
    if (!timerActive) return;
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      if (question.timeLimit > 0) {
        if (secondsRemaining > 0) setSecondsRemaining((prev) => prev - 1);
        else setOvertimeSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, secondsRemaining, question.timeLimit]);



  // --- EXECUTION ENGINE ---
  const runCode = async () => {
    setShowConsole(true);
    setIsRunning(true);

    // Prepare Harness with User Code
    const sourceFile = question.testCases
      ? generatePythonHarness(code, question.testCases)
      : code;

    try {
      setConsoleOutput("> Executing in Sandbox...\n");
      const response = await fetch('/api/execute', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "python",
          code: sourceFile
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Execution failed");
      }

      const data = await response.json();

      let outputLog = "";

      if (data.run) {
        const rawOutput = data.run.stdout + data.run.stderr;
        outputLog = rawOutput;

        if (data.run.code !== 0) {
          outputLog += `\n> [SANDBOX ERROR] (Exit Code: ${data.run.code})\n`;
        }

        // Check passed count from harness output
        const passedCount = (rawOutput.match(/> Test Case \d+: PASSED/g) || []).length;
        if (question.testCases && question.testCases.length > 0) {
          outputLog += `\n> Summary: ${passedCount}/${question.testCases.length} Tests Passed.\n`;
        }
      } else {
        outputLog = `> Error: Failed to connect to Sandbox.\n> Message: Unknown error structure`;
      }

      setConsoleOutput(outputLog);

    } catch (e: any) {
      setConsoleOutput(`> Sandbox execution failed.\n> ${e.message}\n`);
    }

    setIsRunning(false);
  };

  const handleManualReview = async () => {
    setIsReviewing(true);
    try {
      const result = await reviewCode(code, question, language);
      setReview(result);
    } catch (error) {
      setConsoleOutput(
        (prev) => prev + "\n> AI Review Failed. Please try again.",
      );
    } finally {
      setIsReviewing(false);
    }
  };

  const handleHint = async () => {
    setIsGettingHint(true);
    setShowConsole(true);

    setConsoleOutput((prev) => prev + "\n> AI is analyzing your code...");
    try {
      const hint = await getHint(code, question, language);
      setConsoleOutput((prev) => prev + `\n> AI HINT: ${hint}\n`);
      setLatestHint(hint);
    } catch (e) {
      setConsoleOutput((prev) => prev + `\n> Error: Could not retrieve hint.\n`);
    } finally {
      setIsGettingHint(false);
    }
  };

  const handleOpenColab = () => {
    navigator.clipboard.writeText(code).then(() => {
      setConsoleOutput(prev => prev + "\n> Code copied! Opening Google Colab...");
      setShowConsole(true);
      window.open("https://colab.research.google.com/#create=true", "_blank");
    }).catch(() => setConsoleOutput(prev => prev + "\n> Failed to copy code."));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setTimerActive(false);
    try {
      const result = await reviewCode(code, question, language);
      const rawEfficiency = result.score;
      let calculatedPenalty = 0;
      if (question.timeLimit > 0 && overtimeSeconds > 0 && question.penaltyInterval > 0) {
        calculatedPenalty = Math.floor(overtimeSeconds / question.penaltyInterval) * question.penaltyDrop;
      }
      const finalScore = Math.max(0, rawEfficiency - calculatedPenalty);
      const linesOfCode = code.split("\n").filter((line) => line.trim().length > 0).length;

      setSubmissionStats({
        finalScore,
        rawEfficiency,
        timePenalty: calculatedPenalty,
        linesOfCode,
        timeTakenFormatted: formatTime(elapsedTime),
      });
      setReview(result);
      // Always show the modal, regardless of score
      setShowSuccessModal(true);

      // We might want to prepare the UI for review if they fail
      if (finalScore < 70) {
        setActiveTab("review");
        setShowProblem(true);
        setTimerActive(true);
      }
    } catch (error) {
      setConsoleOutput((prev) => prev + "\n> AI Analysis Failed.");
      setTimerActive(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => { setShowSuccessModal(false); if (onComplete) onComplete(); else onBack(); };

  const handleSpeak = async () => {
    if (isLoadingAudio) return;

    // Initialize Context if needed
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const ctx = audioCtxRef.current;

    // Case 1: Playing -> Pause
    if (isPlaying) {
      if (ctx.state === 'running') {
        await ctx.suspend();
        setIsPlaying(false);
      }
      return;
    }

    // Case 2: Paused -> Resume
    if (ctx.state === 'suspended' && audioBufferRef.current) {
      await ctx.resume();
      setIsPlaying(true);
      return;
    }

    // Case 3: Stopped/Finished/Empty -> Start
    try {
      // Check buffer
      if (!audioBufferRef.current) {
        setIsLoadingAudio(true);
        const textToSpeak = `${question.title}. ${question.description}`;
        
        if (question.voiceUrl) {
          const res = await fetch(question.voiceUrl);
          const arrayBuffer = await res.arrayBuffer();
          audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
        } else {
          // Fallback if background task didn't finish
          const audioBytes = await speakText(textToSpeak);
          audioBufferRef.current = await decodeAudioData(audioBytes, ctx);
        }
        setIsLoadingAudio(false);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current!;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      setIsPlaying(true);
    } catch (e) {
      console.error("Audio playback error", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    }
  };

  const openImageViewer = (url: string) => {
    setViewImage(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const closeImageViewer = () => setViewImage(null);
  const handleImageDoubleTap = () => {
    setZoom((prev) => (prev === 1 ? 2.5 : 1));
    setPan({ x: 0, y: 0 });
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleDragLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      const newWidth = (moveEvent.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleDragConsole = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = consoleHeight;
    const handleMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = startHeight + delta;
      if (newHeight > 50 && newHeight < window.innerHeight * 0.6) {
        setConsoleHeight(newHeight);
      }
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const getMonacoLanguage = (lang: string) => {
    const normalized = lang.toLowerCase();
    switch (normalized) {
      case "c++": return "cpp";
      case "python": return "python";
      case "java": return "java";
      case "typescript": return "typescript";
      case "c#": return "csharp";
      default: return "javascript";
    }
  };

  const isSuccess = submissionStats && submissionStats.finalScore >= 70;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden relative">
      {/* Fullscreen Image Viewer */}
      {viewImage && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 flex gap-4 z-50">
            <div className="flex bg-neutral-800 rounded-lg p-1">
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))} className="p-2 hover:bg-neutral-700 rounded transition"><ZoomOut size={20} /></button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 hover:bg-neutral-700 rounded transition"><RotateCcw size={20} /></button>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="p-2 hover:bg-neutral-700 rounded transition"><ZoomIn size={20} /></button>
            </div>
            <button onClick={closeImageViewer} className="p-3 bg-neutral-800 rounded-full hover:bg-red-600 transition"><X size={24} /></button>
          </div>
          <div
            className={`w-full h-full flex items-center justify-center overflow-hidden ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
            onDoubleClick={handleImageDoubleTap}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img src={viewImage} alt="Full View" className="max-w-[90%] max-h-[90%] object-contain transition-transform duration-200 ease-out select-none" draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
          </div>
        </div>
      )}

      {/* Success/Failure Modal */}
      {showSuccessModal && review && submissionStats && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isSuccess ? "from-teal-500 to-cyan-500" : "from-red-500 to-orange-500"}`}></div>
            <div className="text-center mb-6">
              <div className={`animate-bounce-slow inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border ${isSuccess ? "bg-teal-500/20 text-teal-400 border-teal-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                {isSuccess ? <Trophy size={40} /> : <AlertTriangle size={40} />}
              </div>
              <h2 className="text-4xl font-black text-white mb-2">{isSuccess ? "Model Trained!" : "Training Failed"}</h2>
              <p className="text-neutral-400">{isSuccess ? "You've mastered this AI concept." : "Score below threshold. Check the review."}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 p-4 rounded-xl border border-neutral-700 text-center col-span-2 md:col-span-1 flex flex-col justify-center">
                <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1 tracking-wider">Success Score</div>
                <div className={`text-3xl font-black ${isSuccess ? "text-white" : "text-red-400"}`}>{submissionStats.finalScore}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800 text-center flex flex-col justify-center">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Code Efficiency</div>
                <div className="text-xl font-bold text-blue-400">{submissionStats.rawEfficiency}%</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800 text-center flex flex-col justify-center">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Time Taken</div>
                <div className={`text-sm font-bold ${submissionStats.timePenalty > 0 ? "text-red-400" : "text-green-400"}`}>{submissionStats.timeTakenFormatted}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800 text-center flex flex-col justify-center">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Conciseness</div>
                <div className="text-lg font-bold text-neutral-300">{submissionStats.linesOfCode} <span className="text-[10px] font-normal text-neutral-500">LOC</span></div>
              </div>
            </div>

            {/* Key Takeaway */}
            <div className="bg-neutral-950/50 rounded-xl border border-neutral-800 p-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase mb-2">
                <CheckCircle size={14} className={isSuccess ? "text-green-500" : "text-yellow-500"} /> Key Takeaway
              </div>
              <p className="text-neutral-300 text-sm leading-relaxed">
                {review.keyTakeaway}
              </p>
            </div>

            {/* What You Learned */}
            <div className="bg-neutral-800/20 rounded-xl p-5 border border-neutral-800/50 mb-8">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Star size={14} className="text-yellow-400" /> What You Learned
              </h3>
              <div className="flex flex-wrap gap-2">
                {review.skillsLearned?.map((skill, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-xs border ${i % 2 === 0
                    ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                    : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    }`}>
                    {skill}
                  </span>
                )) || <span className="text-neutral-500 text-xs">Analysis incomplete</span>}
                <span className="px-3 py-1 bg-neutral-800 text-neutral-400 rounded-full text-xs border border-neutral-700">{language}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowSuccessModal(false)} className="flex-1 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition">Review Code</button>
              {isSuccess ? (
                <button onClick={handleNext} className="flex-[2] py-4 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 transition flex items-center justify-center gap-2">
                  {isCustomMode ? "Next Challenge" : "Continue Journey"} <ArrowRight size={18} />
                </button>
              ) : (
                <button onClick={() => setShowSuccessModal(false)} className="flex-[2] py-4 bg-red-600/20 text-red-200 border border-red-500/30 rounded-xl font-bold hover:bg-red-600/30 transition flex items-center justify-center gap-2">
                  Try Again <RotateCcw size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-neutral-400 hover:text-white transition">← Back</button>
          <span className="font-mono text-sm bg-neutral-800 px-2 py-1 rounded text-teal-400 border border-neutral-700">Python</span>
          <div className="flex items-center gap-4">
            <h1 className="font-bold truncate max-w-xs md:max-w-md border-r border-neutral-700 pr-4">{question?.title || "Loading..."}</h1>
            <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1 rounded border ${secondsRemaining === 0 && question.timeLimit > 0 ? "bg-red-900/30 border-red-500/30 text-red-400 animate-pulse" : "bg-neutral-800 border-neutral-700 text-green-400"}`}>
              <TimerIcon size={14} />
              {question.timeLimit === 0 ? <span>{formatTime(elapsedTime)}</span> : (secondsRemaining > 0 ? <span>{formatTime(secondsRemaining)}</span> : <span>-{formatTime(overtimeSeconds)}</span>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleOpenColab} className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/20 rounded text-xs font-bold transition">
            <ExternalLink size={14} /> Open Colab
          </button>
          <div className="w-px h-6 bg-neutral-700 mx-1"></div>

          <button onClick={() => setShowProblem(!showProblem)} className={`p-2 rounded hover:bg-neutral-800 transition ${!showProblem ? "text-blue-400" : "text-neutral-400"}`} title="Toggle Problem Panel"><BookOpen size={18} /></button>
          <button onClick={() => setShowConsole(!showConsole)} className={`p-2 rounded hover:bg-neutral-800 transition ${!showConsole ? "text-green-400" : "text-neutral-400"}`} title="Toggle Console"><Terminal size={18} /></button>
          <div className="w-px h-6 bg-neutral-700 mx-2 self-center"></div>

          <button onClick={runCode} disabled={isRunning} className="flex items-center gap-2 px-6 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-sm font-bold transition text-white border border-neutral-700 disabled:opacity-50">
            {isRunning ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : "Run"}
          </button>

          <button onClick={handleSubmit} disabled={isSubmitting || isReviewing} className="flex items-center gap-2 px-6 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-bold transition disabled:opacity-50 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]">
            {isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={16} />} Submit
          </button>
          <AnimatedGlowButton onClick={handleHint} disabled={isReviewing || isSubmitting} state={isGettingHint ? "loading" : "idle"} mode="loading" containerClassName={`px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-white/5 backdrop-blur text-neutral-400 hover:text-white ${isGettingHint ? "animate-pulse" : ""}`}>
            <Zap size={16} />
          </AnimatedGlowButton>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {showProblem && question && (
          <div className="flex flex-col border-r border-neutral-800 bg-neutral-900/30" style={{ width: `${leftPanelWidth}%` }}>
            <div className="flex border-b border-neutral-800">
              <button onClick={() => setActiveTab("problem")} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "problem" ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/10" : "text-neutral-400 hover:bg-neutral-800"}`}>Problem</button>
              <button onClick={() => setActiveTab("review")} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "review" ? "border-b-2 border-purple-500 text-purple-400 bg-purple-500/10" : "text-neutral-400 hover:bg-neutral-800"}`}>AI Review</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
              {activeTab === "problem" ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold">{question.title}</h2>
                    <button
                      onClick={handleSpeak}
                      disabled={isLoadingAudio}
                      className={`p-2 rounded-full transition ${isPlaying
                        ? "bg-blue-500/20 text-blue-400 animate-pulse border border-blue-500/30"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                    >
                      {isLoadingAudio ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                    </button>
                  </div>
                  {question.imageUrl && <div className="relative group rounded-xl w-full"><img src={question.imageUrl} alt="Concept Art" className="w-full h-64 object-cover" /></div>}
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-neutral-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ className, children, ...props }) {
                          return (
                            <code
                              className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {question.description}
                    </ReactMarkdown>

                    {question.diagramUrl && (
                      <div
                        className="relative group rounded-xl overflow-hidden border border-neutral-700 bg-black/40 w-full my-6 cursor-zoom-in hover:border-neutral-500 transition-all"
                        onClick={() => openImageViewer(question.diagramUrl!)}
                      >
                        <img
                          src={question.diagramUrl}
                          alt="Structure Diagram"
                          className="w-full h-64 object-contain bg-white/5 p-4"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize2 className="text-white drop-shadow-md" size={32} />
                        </div>
                      </div>
                    )}

                    <h3 className="text-base font-semibold text-white mt-6">Formats</h3>

                    <div className="bg-neutral-800/50 p-3 rounded border border-neutral-700 font-mono text-xs">
                      <div>
                        <span className="text-blue-400">In:</span>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p({ children }) {
                              return <span>{children}</span>;
                            },
                            code({ className, children, ...props }) {
                              return (
                                <code
                                  className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {question.inputFormat}
                        </ReactMarkdown>
                      </div>

                      <div className="mt-1">
                        <span className="text-green-400">Out:</span>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p({ children }) {
                              return <span>{children}</span>;
                            },
                            code({ className, children, ...props }) {
                              return (
                                <code
                                  className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {question.outputFormat}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-white mt-4">Constraints</h3>

                    <ul className="list-disc pl-5 text-neutral-400 text-xs">
                      {question.constraints &&
                        question.constraints.map((c, i) => (
                          <li key={i}>
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                code({ className, children, ...props }) {
                                  return (
                                    <code
                                      className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {c}
                            </ReactMarkdown>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center mb-6"><button onClick={handleManualReview} disabled={isReviewing} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50">{isReviewing ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Search size={18} />}{review ? "Re-Analyze Code" : "Analyze Code"}</button></div>
                  <div className="flex items-center gap-4 bg-neutral-800/30 p-4 rounded-xl border border-neutral-800"><div className={`text-4xl font-black ${review ? (review.score > 80 ? "text-green-400" : review.score > 50 ? "text-yellow-400" : "text-red-400") : "text-neutral-600"}`}>{review ? review.score : "0"}</div><div className="flex-1"><div className="flex justify-between text-xs text-neutral-400 mb-1"><span>Code Efficiency Score</span><span>{review ? `${review.score}/100` : "-"}</span></div><div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${review && review.score > 80 ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: review ? `${review.score}%` : "0%" }} /></div></div></div>
                  <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20"><h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2 text-sm"><CheckCircle size={14} /> Feedback</h3><p className="text-blue-100 text-xs leading-relaxed">{review ? stripMarkdown(review.feedback) : "Click 'Analyze Code' to get AI feedback."}</p></div>
                  <div className="space-y-4"><h3 className="font-bold text-white flex items-center gap-2 text-sm"><Code size={14} /> Recommended Changes</h3>{review && review.changes && review.changes.length > 0 ? (review.changes.map((change, idx) => (<div key={idx} className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden flex flex-col"><div className="bg-neutral-800 px-3 py-2 text-xs text-neutral-300 font-medium flex gap-2 items-center"><AlertTriangle size={12} className="text-yellow-500" />{change.explanation}</div><div className="grid grid-cols-1 md:grid-cols-2 text-[10px] md:text-xs font-mono"><div className="bg-red-900/20 p-3 border-r border-neutral-800"><div className="text-red-400 mb-1 uppercase text-[9px] font-bold tracking-wider">Original</div><pre className="whitespace-pre-wrap break-all text-red-100/70">{change.originalSnippet}</pre></div><div className="bg-green-900/20 p-3"><div className="text-green-400 mb-1 uppercase text-[9px] font-bold tracking-wider">Suggested</div><pre className="whitespace-pre-wrap break-all text-green-100">{change.improvedSnippet}</pre></div></div></div>))) : (<div className="text-center py-8 text-neutral-600 text-xs italic border border-dashed border-neutral-800 rounded-lg">{review ? "No specific code changes recommended. Good job!" : "Analysis pending..."}</div>)}</div>
                </div>
              )}
            </div>
          </div>
        )}
        {showProblem && <div className="w-1 bg-neutral-800 hover:bg-blue-500 cursor-col-resize transition-colors z-10" onMouseDown={handleDragLeft} />}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="python"
              defaultValue={simpleFormat(question?.starterCode)}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 24,
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                folding: true,
                showFoldingControls: 'always',
                foldingStrategy: 'indentation',
                foldingHighlight: true,
                autoClosingBrackets: 'always',
                autoIndent: 'full',
                formatOnPaste: true,
                formatOnType: true,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: "on",
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                initializedRef.current = true;
              }}
              onChange={(value) => {
                if (value !== undefined) {
                  setCode(value);
                }
              }}
            />
          </div>
          {showConsole && (
            <div className="bg-black border-t border-neutral-700 flex flex-col z-10 shadow-up relative" style={{ height: `${consoleHeight}px` }}>
              <div className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-20 hover:bg-blue-500/50 transition-colors" onMouseDown={handleDragConsole} />
              <div className="h-8 bg-neutral-900 flex items-center justify-between px-4 text-xs font-mono text-neutral-400 border-b border-neutral-800 select-none">
                <div className="flex items-center"><Terminal size={12} className="mr-2" /> CONSOLE OUTPUT</div>
                <div className="flex items-center gap-2"><GripHorizontal size={12} className="text-neutral-600" /><button onClick={() => setShowConsole(false)} className="hover:text-white"><X size={12} /></button></div>
              </div>

              <div className="flex-1 p-3 font-mono text-xs md:text-sm text-green-400/90 overflow-y-auto whitespace-pre-wrap selection:bg-green-900/30">
                {consoleOutput}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}