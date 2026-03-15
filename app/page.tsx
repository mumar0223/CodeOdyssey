"use client";

import AdventureMap from "@/components/adventure-map/AdventureMap";
import AiMlIde from "@/components/AiMlIde";
import CodeIde from "@/components/CodeIde";
import { AnimatedGlowTextBadge } from "@/components/custom-ui/animated-glow-badge";
import { ModeCard } from "@/components/custom-ui/ModeCard";
import {
  SetupDropdown,
  SetupField,
  SetupInput,
  SetupPage,
} from "@/components/custom-ui/SetupComponents";
import { TimerSelector } from "@/components/custom-ui/TimerSelector";
import AnimatedBackground from "@/components/effects/AnimatedBackground";
import Typewriter from "@/components/effects/Typewriter";
import { ArenaList } from "@/components/home/ArenaList";
import { GlobalLeaderboardPreview } from "@/components/home/GlobalLeaderboardPreview";
import { FeaturedChallenges } from "@/components/home/FeaturedChallenges";
import { TopicTabs } from "@/components/home/TopicTabs";
import { WeakTopicBanner } from "@/components/home/WeakTopicBanner";
import LoadingScreen from "@/components/LoadingScreen";
import {
  AI_LIBRARIES,
  EXPERIENCE_LEVELS,
  ML_DOMAINS,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants";
import {
  ChallengeType,
  Question,
  RoadmapLevel,
  UserAssessment,
} from "@/lib/types";
import { generateQuestion, generateRoadmap } from "@/services/geminiService";
import {
  BrainCircuit,
  Bug,
  Code,
  Cpu,
  Network,
  Zap,
  Map,
  User,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

// Application Screen State
enum Screen {
  HOME,
  MODE_GAME_SETUP,
  MODE_GAME_MAP,
  MODE_CUSTOM_SETUP,
  MODE_DEBUG_SETUP,
  MODE_AIML_SETUP,
  MODE_AIML_ROADMAP_SETUP,
  IDE,
}

type RoadmapType = "adventure" | "aiml";

export default function App() {
  const { data: sessionData, isPending: isSessionLoading } = useSession();
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [loading, setLoading] = useState(false);

  // Separate Roadmaps
  const [adventureRoadmap, setAdventureRoadmap] = useState<RoadmapLevel[]>([]);
  const [aiMlRoadmap, setAiMlRoadmap] = useState<RoadmapLevel[]>([]);
  const [activeRoadmapType, setActiveRoadmapType] =
    useState<RoadmapType>("adventure");

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentLevelId, setCurrentLevelId] = useState<number | null>(null);
  const [userLang, setUserLang] = useState("JavaScript");
  const [isScrolled, setIsScrolled] = useState(false);

  // Track if current mode is ML/AI based for special IDE features
  const [isAiMode, setIsAiMode] = useState(false);

  // Assessment State (Adventure)
  const [assessment, setAssessment] = useState<UserAssessment>({
    experience: EXPERIENCE_LEVELS[0],
    goals: "",
    preferredLanguage: "JavaScript",
  });

  // Custom Mode State
  const [customConfig, setCustomConfig] = useState({
    difficulty: "Medium",
    concept: "Array Manipulation",
  });

  // Debug/Optimize Mode State
  const [debugConfig, setDebugConfig] = useState({
    difficulty: "Medium",
    mode: "debug",
    topic: "API Logic",
  });

  // AI/ML Practice Mode State
  const [aiMlConfig, setAiMlConfig] = useState<{
    domainId: string;
    subTopic: string;
    library: string;
    difficulty: string;
    userConcept: string;
    timerMode: "auto" | "manual" | "off";
    timeLimit: number;
  }>({
    domainId: "ml",
    subTopic: "Linear Regression",
    library: "Scikit-learn",
    difficulty: "Medium",
    userConcept: "",
    timerMode: "auto",
    timeLimit: 30,
  });

  // AI/ML Roadmap State (Deep Dive)
  const [aiMlRoadmapConfig, setAiMlRoadmapConfig] = useState({
    domainId: "ml",
    subTopic: "All Topics",
    library: "Scikit-learn",
    experience: EXPERIENCE_LEVELS[0],
    goals: "",
  });

  // Timer Config (Shared across custom/debug modes)
  const [timerConfig, setTimerConfig] = useState({
    mode: "auto" as "auto" | "manual" | "off",
    minutes: 20,
  });

  const requireAuth = (action: () => void) => {
    if (isSessionLoading) return;
    if (!sessionData?.user) {
      router.push("/login");
    } else {
      action();
    }
  };

  // --- Scroll Effect ---
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Handlers ---

  const handleRegenerateRequest = () => {
    if (activeRoadmapType === "adventure") {
      setScreen(Screen.MODE_GAME_SETUP);
    } else {
      setScreen(Screen.MODE_AIML_ROADMAP_SETUP);
    }
  };

  const startRoadmapGeneration = async () => {
    setLoading(true);
    setUserLang(assessment.preferredLanguage);
    setIsAiMode(false);
    try {
      const levels = await generateRoadmap(
        assessment.preferredLanguage,
        assessment.experience,
        assessment.goals,
        false,
      );

      if (levels && levels.length > 0) {
        setAdventureRoadmap(levels);
        setActiveRoadmapType("adventure");
        setScreen(Screen.MODE_GAME_MAP);
      } else {
        alert("AI generated an empty roadmap. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("AI failed to generate roadmap.");
    } finally {
      setLoading(false);
    }
  };

  const startAiMlRoadmapGeneration = async () => {
    setLoading(true);
    setUserLang("Python");
    setIsAiMode(true);
    try {
      const domainLabel =
        ML_DOMAINS.find((d) => d.id === aiMlRoadmapConfig.domainId)?.label ||
        "Machine Learning";
      const subTopicText =
        aiMlRoadmapConfig.subTopic === "All Topics"
          ? ""
          : ` focusing specifically on ${aiMlRoadmapConfig.subTopic}`;
      const goals = `Master ${domainLabel}${subTopicText} using ${aiMlRoadmapConfig.library}. ${aiMlRoadmapConfig.goals}`;

      const levels = await generateRoadmap(
        "Python",
        aiMlRoadmapConfig.experience,
        goals,
        true,
      );

      if (levels && levels.length > 0) {
        setAiMlRoadmap(levels);
        setActiveRoadmapType("aiml");
        setScreen(Screen.MODE_GAME_MAP);
      } else {
        alert("AI generated an empty AI/ML roadmap.");
      }
    } catch (e) {
      console.error(e);
      alert("AI failed to generate roadmap.");
    } finally {
      setLoading(false);
    }
  };

  const loadLevel = async (level: RoadmapLevel) => {
    setLoading(true);
    setCurrentLevelId(level.id);

    const isAiMlLevel = activeRoadmapType === "aiml";
    setIsAiMode(isAiMlLevel);
    const effectiveLang = isAiMlLevel ? "Python" : userLang;
    try {
      const q = await generateQuestion(
        effectiveLang,
        level.difficulty,
        level.concept,
        "create",
        undefined,
        isAiMlLevel
          ? { library: aiMlRoadmapConfig.library, subTopic: level.concept }
          : undefined,
        level.description, // Pass level description for context
      );

      if (!q || !q.title) throw new Error("Invalid question generated");

      setCurrentQuestion(q);
      setScreen(Screen.IDE);
    } catch (e) {
      console.error(e);
      alert("Failed to generate level content.");
    } finally {
      setLoading(false);
    }
  };

  const startCustomMode = async () => {
    setLoading(true);
    setCurrentLevelId(null);
    setIsAiMode(false);
    try {
      const timeLimitArg =
        timerConfig.mode === "off"
          ? 0
          : timerConfig.mode === "manual"
            ? timerConfig.minutes
            : undefined;
      const q = await generateQuestion(
        userLang,
        customConfig.difficulty,
        customConfig.concept,
        "create",
        timeLimitArg,
      );
      setCurrentQuestion(q);
      setScreen(Screen.IDE);
    } catch (e) {
      alert("Failed to generate question.");
    } finally {
      setLoading(false);
    }
  };

  const startAiMlPracticeMode = async () => {
    setLoading(true);
    setCurrentLevelId(null);
    setUserLang("Python");
    setIsAiMode(true);
    try {
      const timeLimitArg =
        aiMlConfig.timerMode === "off"
          ? 0
          : aiMlConfig.timerMode === "manual"
            ? aiMlConfig.timeLimit
            : undefined;
      const domainLabel =
        ML_DOMAINS.find((d) => d.id === aiMlConfig.domainId)?.label ||
        "Machine Learning";

      const q = await generateQuestion(
        "Python",
        aiMlConfig.difficulty,
        domainLabel,
        "create",
        timeLimitArg,
        {
          library: aiMlConfig.library,
          subTopic: aiMlConfig.subTopic,
          userConcept: aiMlConfig.userConcept,
        },
      );
      setCurrentQuestion(q);
      setScreen(Screen.IDE);
    } catch (e) {
      alert("Failed to generate AI/ML question.");
    } finally {
      setLoading(false);
    }
  };

  const startAutoMode = async () => {
    setLoading(true);
    setCurrentLevelId(null);
    const isAiMl = Math.random() < 0.3;
    setIsAiMode(isAiMl);

    if (isAiMl) {
      setUserLang("Python");
      const rDomain = ML_DOMAINS[Math.floor(Math.random() * ML_DOMAINS.length)];
      const rSub =
        rDomain.subtopics[Math.floor(Math.random() * rDomain.subtopics.length)];
      const rLib =
        AI_LIBRARIES[Math.floor(Math.random() * AI_LIBRARIES.length)];

      try {
        const q = await generateQuestion(
          "Python",
          "Medium",
          rDomain.label,
          "create",
          undefined,
          { library: rLib, subTopic: rSub },
        );
        setCurrentQuestion(q);
        setScreen(Screen.IDE);
      } catch (e) {
        startStandardAutoMode();
      } finally {
        setLoading(false);
      }
    } else {
      startStandardAutoMode();
    }
  };

  const startStandardAutoMode = async () => {
    const langToUse = assessment.preferredLanguage || "JavaScript";
    setUserLang(langToUse);
    setIsAiMode(false);
    const diffs = ["Easy", "Medium", "Hard"];
    const concepts = [
      "Dynamic Programming",
      "Graph Theory",
      "String Manipulation",
      "Recursion",
      "Bitwise Operations",
      "Sorting",
      "Hash Maps",
    ];
    const rDiff = diffs[Math.floor(Math.random() * diffs.length)];
    const rConcept = concepts[Math.floor(Math.random() * concepts.length)];

    try {
      const q = await generateQuestion(langToUse, rDiff, rConcept, "create");
      setCurrentQuestion(q);
      setScreen(Screen.IDE);
    } catch (e) {
      alert("Failed to generate auto question.");
    } finally {
      setLoading(false);
    }
  };

  const startDebugMode = async () => {
    setLoading(true);
    setCurrentLevelId(null);
    setIsAiMode(false);
    try {
      const timeLimitArg =
        timerConfig.mode === "off"
          ? 0
          : timerConfig.mode === "manual"
            ? timerConfig.minutes
            : undefined;
      const q = await generateQuestion(
        userLang,
        debugConfig.difficulty,
        debugConfig.topic,
        debugConfig.mode as ChallengeType,
        timeLimitArg,
      );
      setCurrentQuestion(q);
      setScreen(Screen.IDE);
    } catch (e) {
      alert("Failed to generate debug challenge.");
    } finally {
      setLoading(false);
    }
  };

  const startQuickDebugMode = async () => {
    setLoading(true);
    setCurrentLevelId(null);
    setIsAiMode(false);
    const modes: ChallengeType[] = ["debug", "optimize"];
    const rMode = modes[Math.floor(Math.random() * modes.length)];
    const diffs = ["Medium", "Hard"];
    const rDiff = diffs[Math.floor(Math.random() * diffs.length)];
    try {
      const q = await generateQuestion(
        userLang,
        rDiff,
        "Backend System Logic",
        rMode,
      );
      setCurrentQuestion(q);
      setScreen(Screen.IDE);
    } catch (e) {
      alert("Failed to generate quick debug challenge.");
    } finally {
      setLoading(false);
    }
  };

  const handleLevelComplete = () => {
    if (screen === Screen.IDE && currentLevelId !== null) {
      const targetRoadmap =
        activeRoadmapType === "adventure" ? adventureRoadmap : aiMlRoadmap;
      const setTargetRoadmap =
        activeRoadmapType === "adventure"
          ? setAdventureRoadmap
          : setAiMlRoadmap;
      const updatedRoadmap = targetRoadmap.map((level) => {
        if (level.id === currentLevelId) {
          return { ...level, status: "completed" as const };
        }
        return level;
      });
      const nextIdx = updatedRoadmap.findIndex((l) => l.status === "locked");
      if (nextIdx !== -1) {
        updatedRoadmap[nextIdx].status = "unlocked";
      }
      setTargetRoadmap(updatedRoadmap);
      setScreen(Screen.MODE_GAME_MAP);
    } else {
      setScreen(Screen.HOME);
    }
  };

  if (loading) return <LoadingScreen />;

  if (screen === Screen.IDE && currentQuestion) {
    const prefix = activeRoadmapType === "adventure" ? "adventure" : "aiml";
    const effectiveLang =
      currentLevelId !== null && activeRoadmapType === "aiml"
        ? "Python"
        : userLang;

    // Fix: Only use AI IDE if isAiMode is explicitly true, OR if we are playing a specific AI/ML Roadmap level.
    // We ignore activeRoadmapType if we are in a standalone mode (currentLevelId === null) to prevent persistent "Deep Dive" state from hijacking custom modes.
    const useAiIde =
      isAiMode || (activeRoadmapType === "aiml" && currentLevelId !== null);

    if (useAiIde) {
      return (
        <AiMlIde
          question={currentQuestion}
          language="Python"
          onBack={() =>
            setScreen(
              currentLevelId !== null ? Screen.MODE_GAME_MAP : Screen.HOME,
            )
          }
          onComplete={handleLevelComplete}
          storageKey={
            currentLevelId !== null
              ? `codeOdyssey_level_${prefix}_${currentLevelId}_Python`
              : undefined
          }
          isCustomMode={currentLevelId === null}
        />
      );
    }

    // Standard IDE
    return (
      <CodeIde
        question={currentQuestion}
        language={effectiveLang}
        onBack={() =>
          setScreen(
            currentLevelId !== null ? Screen.MODE_GAME_MAP : Screen.HOME,
          )
        }
        onComplete={handleLevelComplete}
        storageKey={
          currentLevelId !== null
            ? `codeOdyssey_level_${prefix}_${currentLevelId}_${effectiveLang}`
            : undefined
        }
        isCustomMode={currentLevelId === null}
      />
    );
  }

  if (screen === Screen.MODE_GAME_MAP) {
    const levels =
      activeRoadmapType === "adventure" ? adventureRoadmap : aiMlRoadmap;
    return (
      <AdventureMap
        levels={levels}
        onLevelSelect={loadLevel}
        onExit={() => setScreen(Screen.HOME)}
        onRegenerate={handleRegenerateRequest}
        language={activeRoadmapType === "aiml" ? "Python" : userLang}
      />
    );
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/20 overflow-x-hidden relative">
      <AnimatedBackground />

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] py-6 px-10 flex justify-between items-center transition-all duration-500 ease-in-out ${isScrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "bg-transparent border-transparent"}`}
      >
        <div className="flex items-center gap-2 text-2xl font-black tracking-tighter select-none">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Code size={20} className="text-black" />
          </div>
          CodeOdyssey
        </div>
        <div className="flex gap-4">
          {screen === Screen.HOME && adventureRoadmap.length > 0 && (
            <button
              onClick={() => {
                setActiveRoadmapType("adventure");
                setUserLang(assessment.preferredLanguage);
                setScreen(Screen.MODE_GAME_MAP);
              }}
              className="flex items-center hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(59,130,246,0.3)] gap-2 text-blue-400 hover:text-blue-300 transition font-bold text-sm bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 hover:bg-blue-500/20"
            >
              <Map size={16} /> Resume Adventure
            </button>
          )}
          {screen === Screen.HOME && aiMlRoadmap.length > 0 && (
            <button
              onClick={() => {
                setActiveRoadmapType("aiml");
                setUserLang("Python");
                setScreen(Screen.MODE_GAME_MAP);
              }}
              className="flex items-center hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(34,211,238,0.3)] gap-2 text-cyan-400 hover:text-cyan-300 transition font-bold text-sm bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 hover:bg-cyan-500/20"
            >
              <Network size={16} /> Resume Deep Dive
            </button>
          )}
          {screen === Screen.HOME && (
            <Link
              href="/playground"
              className="flex items-center hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(16,185,129,0.2)] gap-2 text-emerald-400 hover:text-emerald-300 transition font-bold text-sm bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              <Terminal size={16} /> Playground
            </Link>
          )}
          {screen === Screen.HOME && (
            <Link
              href={
                sessionData?.user ? `/user/${sessionData.user.id}` : "/login"
              }
              className="flex items-center hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] gap-2 text-white hover:text-neutral-200 transition font-bold text-sm bg-white/10 px-4 py-2 rounded-full border border-white/20 hover:bg-white/20"
            >
              <User size={16} />{" "}
              {sessionData?.user ? sessionData.user.name || "Profile" : "Login"}
            </Link>
          )}
          {screen !== Screen.HOME && (
            <button
              onClick={() => setScreen(Screen.HOME)}
              className="text-neutral-400 hover:text-white transition font-medium text-sm"
            >
              Exit Mode
            </button>
          )}
        </div>
      </nav>

      {/* Home Screen */}
      {screen === Screen.HOME && (
        <div className="min-h-screen w-full flex flex-col items-center pt-32 pb-20 px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-neutral-400 text-xs font-mono tracking-widest mb-6 backdrop-blur">
              <AnimatedGlowTextBadge
                containerClassName="rounded-full"
                className="flex items-center space-x-2"
              >
                <span>Powered by Gemini 3</span>
              </AnimatedGlowTextBadge>
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight text-white leading-tight drop-shadow-2xl">
              <Typewriter prefix="Master" />
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                The AI Way.
              </span>
            </h1>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              An adaptive, AI-driven learning platform.
            </p>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              From programming fundamentals to ML, DL, and AI.
            </p>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              Every challenge is unique, every review intelligent.
            </p>
          </div>

          <div className="w-full max-w-7xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150">
              <ModeCard
                title="Adventure Mode"
                description="Embark on a personalized journey. The AI crafts a dynamic skill tree that evolves as you grow."
                icon={Map}
                themeColor="blue"
                buttonText={
                  adventureRoadmap.length > 0
                    ? "Resume Journey"
                    : "Start Journey"
                }
                onClick={() =>
                  requireAuth(() => {
                    if (adventureRoadmap.length > 0) {
                      setActiveRoadmapType("adventure");
                      setUserLang(assessment.preferredLanguage);
                      setScreen(Screen.MODE_GAME_MAP);
                    } else {
                      setScreen(Screen.MODE_GAME_SETUP);
                    }
                  })
                }
              />

              <ModeCard
                title="Deep Dive Journey"
                description="Go deep, not wide. An AI-guided roadmap from ML fundamentals to advanced deep learning mastery."
                icon={Network}
                themeColor="cyan"
                buttonText={
                  aiMlRoadmap.length > 0 ? "Resume Path" : "Initialize Path"
                }
                onClick={() =>
                  requireAuth(() => {
                    if (aiMlRoadmap.length > 0) {
                      setActiveRoadmapType("aiml");
                      setUserLang("Python");
                      setScreen(Screen.MODE_GAME_MAP);
                    } else {
                      setScreen(Screen.MODE_AIML_ROADMAP_SETUP);
                    }
                  })
                }
              />

              <ModeCard
                title="Neural Nexus"
                description="Hands-on ML and deep learning practice. Train, tweak, and reason through Python-based challenges."
                icon={BrainCircuit}
                themeColor="teal"
                buttonText="Train Model"
                onClick={() =>
                  requireAuth(() => setScreen(Screen.MODE_AIML_SETUP))
                }
              />

              <ModeCard
                title="Custom Sandbox"
                description="Total control. Choose the language, focus area, and difficulty — the AI builds challenges around you."
                icon={Cpu}
                themeColor="purple"
                buttonText="Create Challenge"
                onClick={() =>
                  requireAuth(() => setScreen(Screen.MODE_CUSTOM_SETUP))
                }
              />

              <ModeCard
                title="Bug Bash"
                description="Hunt bugs in real backend code. Debug, refactor, and optimize like a production engineer."
                icon={Bug}
                themeColor="orange"
                buttonText="Fix Now"
                onClick={() =>
                  requireAuth(() => setScreen(Screen.MODE_DEBUG_SETUP))
                }
              />

              <ModeCard
                title="Quick Match"
                description="No setup, no waiting. Jump into a randomized challenge for a fast daily brain workout."
                icon={Zap}
                themeColor="green"
                buttonText="Start Now"
                onClick={() => requireAuth(startAutoMode)}
              />
            </div>

            {/* New sections added for gamified multiplayer arena */}
            <ArenaList />
            <div className="grid lg:grid-cols-2 gap-8 mt-12 w-full">
              <GlobalLeaderboardPreview />
              <FeaturedChallenges userId={sessionData?.user?.id} />
            </div>
            <TopicTabs />
            <WeakTopicBanner userId={sessionData?.user?.id} />
          </div>
        </div>
      )}

      {/* Adventure Mode Setup */}
      {screen === Screen.MODE_GAME_SETUP && (
        <SetupPage
          title="Setup Your Adventure"
          themeColor="blue"
          onCancel={
            adventureRoadmap.length > 0
              ? () => {
                  setActiveRoadmapType("adventure");
                  setUserLang(assessment.preferredLanguage);
                  setScreen(Screen.MODE_GAME_MAP);
                }
              : undefined
          }
          actionButtonText="Generate Roadmap"
          onAction={startRoadmapGeneration}
        >
          <SetupField label="Experience" themeColor="blue">
            <SetupDropdown
              value={assessment.experience}
              options={EXPERIENCE_LEVELS}
              onSelect={(val) =>
                setAssessment({ ...assessment, experience: val })
              }
              themeColor="blue"
            />
          </SetupField>
          <SetupField label="Language" themeColor="blue">
            <SetupDropdown
              value={assessment.preferredLanguage}
              options={SUPPORTED_LANGUAGES}
              onSelect={(val) =>
                setAssessment({ ...assessment, preferredLanguage: val })
              }
              themeColor="blue"
            />
          </SetupField>
          <SetupField label="Goals" themeColor="blue">
            <SetupInput
              themeColor="blue"
              placeholder="e.g. Master Recursion..."
              value={assessment.goals}
              onChange={(e) =>
                setAssessment({ ...assessment, goals: e.target.value })
              }
            />
          </SetupField>
        </SetupPage>
      )}

      {/* AI/ML Roadmap Setup */}
      {screen === Screen.MODE_AIML_ROADMAP_SETUP && (
        <SetupPage
          title={
            <span>
              <span className="text-cyan-400">Deep Dive</span> Journey
            </span>
          }
          themeColor="cyan"
          onCancel={
            aiMlRoadmap.length > 0
              ? () => {
                  setActiveRoadmapType("aiml");
                  setUserLang("Python");
                  setScreen(Screen.MODE_GAME_MAP);
                }
              : undefined
          }
          actionButtonText="Generate Path"
          onAction={startAiMlRoadmapGeneration}
        >
          <div className="grid grid-cols-2 gap-4">
            <SetupField label="Domain" themeColor="cyan">
              <SetupDropdown
                value={aiMlRoadmapConfig.domainId}
                options={ML_DOMAINS.map((d) => ({
                  label: d.label,
                  value: d.id,
                }))}
                onSelect={(val) =>
                  setAiMlRoadmapConfig({
                    ...aiMlRoadmapConfig,
                    domainId: val,
                    subTopic: "All Topics",
                  })
                }
                themeColor="cyan"
              />
            </SetupField>
            <SetupField label="Library" themeColor="cyan">
              <SetupDropdown
                value={aiMlRoadmapConfig.library}
                options={AI_LIBRARIES}
                onSelect={(val) =>
                  setAiMlRoadmapConfig({ ...aiMlRoadmapConfig, library: val })
                }
                themeColor="cyan"
              />
            </SetupField>
          </div>

          <SetupField label="Focus Topic" themeColor="cyan">
            <SetupDropdown
              value={aiMlRoadmapConfig.subTopic}
              options={[
                "All Topics",
                ...(ML_DOMAINS.find((d) => d.id === aiMlRoadmapConfig.domainId)
                  ?.subtopics || []),
              ]}
              onSelect={(val) =>
                setAiMlRoadmapConfig({ ...aiMlRoadmapConfig, subTopic: val })
              }
              themeColor="cyan"
            />
          </SetupField>

          <SetupField label="Experience Level" themeColor="cyan">
            <SetupDropdown
              value={aiMlRoadmapConfig.experience}
              options={EXPERIENCE_LEVELS}
              onSelect={(val) =>
                setAiMlRoadmapConfig({ ...aiMlRoadmapConfig, experience: val })
              }
              themeColor="cyan"
            />
            <p className="text-xs text-neutral-500 mt-2">
              Beginners start with NumPy/Pandas fundamentals.
            </p>
          </SetupField>

          <SetupField label="Learning Goal (Optional)" themeColor="cyan">
            <SetupInput
              themeColor="cyan"
              placeholder="e.g. Build a stock predictor..."
              value={aiMlRoadmapConfig.goals}
              onChange={(e) =>
                setAiMlRoadmapConfig({
                  ...aiMlRoadmapConfig,
                  goals: e.target.value,
                })
              }
            />
          </SetupField>
        </SetupPage>
      )}

      {/* AI/ML Practice Setup */}
      {screen === Screen.MODE_AIML_SETUP && (
        <SetupPage
          title={
            <span>
              <span className="text-teal-400">Neural</span> Nexus
            </span>
          }
          themeColor="teal"
          actionButtonText="Start Training"
          onAction={startAiMlPracticeMode}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SetupField label="Domain" themeColor="teal">
              <SetupDropdown
                value={aiMlConfig.domainId}
                options={ML_DOMAINS.map((d) => ({
                  label: d.label,
                  value: d.id,
                }))}
                onSelect={(val) =>
                  setAiMlConfig({
                    ...aiMlConfig,
                    domainId: val,
                    subTopic:
                      ML_DOMAINS.find((d) => d.id === val)?.subtopics[0] || "",
                  })
                }
                themeColor="teal"
              />
            </SetupField>
            <SetupField label="Difficulty" themeColor="teal">
              <SetupDropdown
                value={aiMlConfig.difficulty}
                options={["Easy", "Medium", "Hard"]}
                onSelect={(val) =>
                  setAiMlConfig({ ...aiMlConfig, difficulty: val })
                }
                themeColor="teal"
              />
            </SetupField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SetupField label="Library" themeColor="teal">
              <SetupDropdown
                value={aiMlConfig.library}
                options={AI_LIBRARIES}
                onSelect={(val) =>
                  setAiMlConfig({ ...aiMlConfig, library: val })
                }
                themeColor="teal"
              />
            </SetupField>
            <SetupField label="Sub-Topic" themeColor="teal">
              <SetupDropdown
                value={aiMlConfig.subTopic}
                options={
                  ML_DOMAINS.find((d) => d.id === aiMlConfig.domainId)
                    ?.subtopics || []
                }
                onSelect={(val) =>
                  setAiMlConfig({ ...aiMlConfig, subTopic: val })
                }
                themeColor="teal"
              />
            </SetupField>
          </div>

          <SetupField label="Specific Concept (Optional)" themeColor="teal">
            <SetupInput
              themeColor="teal"
              placeholder="e.g. Backpropagation, Gradient Descent..."
              value={aiMlConfig.userConcept}
              onChange={(e) =>
                setAiMlConfig({ ...aiMlConfig, userConcept: e.target.value })
              }
            />
            <p className="text-xs text-neutral-500 mt-2">
              Leave empty to let AI pick a concept from the Sub-Topic.
            </p>
          </SetupField>

          <TimerSelector
            mode={aiMlConfig.timerMode}
            minutes={aiMlConfig.timeLimit}
            onModeChange={(m) => setAiMlConfig({ ...aiMlConfig, timerMode: m })}
            onMinutesChange={(m) =>
              setAiMlConfig({ ...aiMlConfig, timeLimit: m })
            }
            themeColor="teal"
          />
        </SetupPage>
      )}

      {/* Custom Setup */}
      {screen === Screen.MODE_CUSTOM_SETUP && (
        <SetupPage
          title="Custom Challenge"
          themeColor="purple"
          actionButtonText="Generate Question"
          onAction={startCustomMode}
        >
          <div className="grid grid-cols-2 gap-4">
            <SetupField label="Language" themeColor="purple">
              <SetupDropdown
                value={userLang}
                options={SUPPORTED_LANGUAGES}
                onSelect={setUserLang}
                themeColor="purple"
              />
            </SetupField>
            <SetupField label="Difficulty" themeColor="purple">
              <SetupDropdown
                value={customConfig.difficulty}
                options={["Easy", "Medium", "Hard"]}
                onSelect={(val) =>
                  setCustomConfig({ ...customConfig, difficulty: val })
                }
                themeColor="purple"
              />
            </SetupField>
          </div>
          <SetupField label="Concept" themeColor="purple">
            <SetupInput
              themeColor="purple"
              value={customConfig.concept}
              onChange={(e) =>
                setCustomConfig({ ...customConfig, concept: e.target.value })
              }
            />
          </SetupField>
          <TimerSelector
            mode={timerConfig.mode}
            minutes={timerConfig.minutes}
            onModeChange={(m) => setTimerConfig({ ...timerConfig, mode: m })}
            onMinutesChange={(m) =>
              setTimerConfig({ ...timerConfig, minutes: m })
            }
            themeColor="purple"
          />
        </SetupPage>
      )}

      {/* Debug Setup */}
      {screen === Screen.MODE_DEBUG_SETUP && (
        <SetupPage
          title="Bug Bash & Optimize"
          themeColor="orange"
          // Custom Action Buttons rendered as children for this specific case
        >
          <div className="space-y-4">
            <SetupField label="Challenge Mode" themeColor="orange">
              <SetupDropdown
                value={debugConfig.mode}
                options={[
                  { value: "debug", label: "Bug Fixing" },
                  { value: "optimize", label: "Optimization" },
                  { value: "mixed", label: "Both (Fix & Optimize)" },
                ]}
                onSelect={(val) =>
                  setDebugConfig({ ...debugConfig, mode: val })
                }
                themeColor="orange"
              />
            </SetupField>
            <div className="grid grid-cols-2 gap-4">
              <SetupField label="Language" themeColor="orange">
                <SetupDropdown
                  value={userLang}
                  options={SUPPORTED_LANGUAGES}
                  onSelect={setUserLang}
                  themeColor="orange"
                />
              </SetupField>
              <SetupField label="Difficulty" themeColor="orange">
                <SetupDropdown
                  value={debugConfig.difficulty}
                  options={["Easy", "Medium", "Hard"]}
                  onSelect={(val) =>
                    setDebugConfig({ ...debugConfig, difficulty: val })
                  }
                  themeColor="orange"
                />
              </SetupField>
            </div>
          </div>
          <SetupField label="Focus Topic" themeColor="orange">
            <SetupInput
              themeColor="orange"
              placeholder="e.g. API Endpoints, Database Queries..."
              value={debugConfig.topic}
              onChange={(e) =>
                setDebugConfig({ ...debugConfig, topic: e.target.value })
              }
            />
          </SetupField>
          <TimerSelector
            mode={timerConfig.mode}
            minutes={timerConfig.minutes}
            onModeChange={(m) => setTimerConfig({ ...timerConfig, mode: m })}
            onMinutesChange={(m) =>
              setTimerConfig({ ...timerConfig, minutes: m })
            }
            themeColor="orange"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={startQuickDebugMode}
              className="group relative backdrop-blur-md flex-1 py-4 px-8 rounded-xl border border-orange-500/30 text-white font-bold text-lg flex items-center justify-center gap-2 cursor-pointer overflow-hidden transition-all duration-300 hover:border-orange-400 hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(249,115,22,0.3)] bg-transparent"
            >
              <Zap size={18} /> Quick Fix
            </button>
            <button
              onClick={startDebugMode}
              className="flex-[2] py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-orange-900/20 hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(249,115,22,0.3)]"
            >
              Start Challenge
            </button>
          </div>
        </SetupPage>
      )}
    </div>
  );
}
