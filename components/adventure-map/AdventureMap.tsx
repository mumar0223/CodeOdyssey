import { useRef, useEffect, useState } from "react";
import {
  Lock,
  Trophy,
  Code2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import StarryBackground from "./StarryBackground";
import LevelDetailPopup from "./LevelDetailPopup";
import { RoadmapLevel } from "@/lib/types";

const getProgressFocusIndex = (levels: RoadmapLevel[]) => {
  // First unlocked level (current objective)
  const unlockedIndex = levels.findIndex(l => l.status === "unlocked");
  if (unlockedIndex !== -1) return unlockedIndex;

  // Otherwise last completed
  const completedIndices = levels
    .map((l, i) => (l.status === "completed" ? i : -1))
    .filter(i => i !== -1);

  if (completedIndices.length > 0) {
    return completedIndices[completedIndices.length - 1];
  }

  // Fallback
  return 0;
};

interface AdventureMapProps {
  levels: RoadmapLevel[];
  onLevelSelect: (level: RoadmapLevel) => void;
  onExit: () => void;
  onRegenerate: () => void;
  language: string;
}

export default function AdventureMap({
  levels,
  onLevelSelect,
  onExit,
  onRegenerate,
  language,
}: AdventureMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(
    window.innerHeight || 600,
  );

  // Selection State
  const [focusedIndex, setFocusedIndex] = useState(() =>
    getProgressFocusIndex(levels)
  );
  const [hoverInfo, setHoverInfo] = useState<{
    level: RoadmapLevel;
    rect: DOMRect;
  } | null>(null);

  // Constants for horizontal map layout
  const NODE_SPACING = 300;
  const PADDING_LEFT = window.innerWidth / 2; // Start in center
  const PADDING_RIGHT = window.innerWidth / 5;
  const CONTENT_WIDTH =
    levels.length * NODE_SPACING + PADDING_LEFT + PADDING_RIGHT;

  const completedCount = levels.filter((l) => l.status === "completed").length;
  const progressPercentage = Math.round((completedCount / levels.length) * 100);

  // Robust Resize handler using ResizeObserver
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const h = containerRef.current.clientHeight;
        // Prevent collapsing to 0 height which causes nodes to jump to top
        if (h > 50) {
          setContainerHeight(h);
        }
      }
    };

    // Initial update
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Scroll to focused node logic (Only when buttons are used)
  useEffect(() => {
    if (!containerRef.current) return;

    const { xPixels } = getPosition(focusedIndex);
    const containerWidth = containerRef.current.clientWidth;
    const targetScroll = xPixels - containerWidth / 2;

    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  }, [focusedIndex, containerHeight]);

  useEffect(() => {
    const targetIndex = getProgressFocusIndex(levels);
    setFocusedIndex(targetIndex);
  }, [levels]);

  const getPosition = (index: number) => {
    // Ensure height is reasonable to prevent division by zero or weird positioning
    const effectiveHeight =
      containerHeight > 50 ? containerHeight : window.innerHeight;

    const xPixels = PADDING_LEFT + index * NODE_SPACING - NODE_SPACING / 2;
    const amplitude = effectiveHeight * 0.2;
    const center = effectiveHeight / 2;
    const yOffset = amplitude * Math.sin(index * 0.8);
    const yPixels = center + yOffset;
    return { xPixels, yPixels };
  };

  const handleNext = () => {
    if (focusedIndex < levels.length - 1) {
      setFocusedIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (focusedIndex > 0) {
      setFocusedIndex((prev) => prev - 1);
    }
  };

  // Helper to get current focused rect for the popup without mouse hover
  const getFocusedRect = (): DOMRect | null => {
    if (!containerRef.current) return null;
    const nodeElement = document.getElementById(`node-${focusedIndex}`);
    if (nodeElement) {
      return nodeElement.getBoundingClientRect();
    }
    return null;
  };

  // Force re-render of popup position during scroll
  const [scrollTick, setScrollTick] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTick((t) => t + 1);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const getDifficultyStyles = (difficulty: string, status: string) => {
    if (status === "locked") {
      return "bg-neutral-900 border-neutral-800 text-neutral-600 grayscale cursor-not-allowed";
    }
    switch (difficulty) {
      case "Easy":
        return status === "completed"
          ? "bg-gradient-to-br from-cyan-900 to-blue-900 border-cyan-400 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          : "bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-200 text-white shadow-[0_0_35px_rgba(34,211,238,0.6)] animate-[bounce_3s_infinite]";
      case "Medium":
        return status === "completed"
          ? "bg-gradient-to-br from-amber-900 to-orange-900 border-amber-400 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
          : "bg-gradient-to-br from-amber-600 to-orange-600 border-amber-200 text-white shadow-[0_0_35px_rgba(251,191,36,0.6)] animate-[bounce_3s_infinite]";
      case "Hard":
        return status === "completed"
          ? "bg-gradient-to-br from-red-900 to-rose-900 border-red-400 text-red-100 shadow-[0_0_30px_rgba(248,113,113,0.4)]"
          : "bg-gradient-to-br from-red-600 to-rose-600 border-red-200 text-white shadow-[0_0_35px_rgba(248,113,113,0.6)] animate-[bounce_3s_infinite]";
      default:
        return "bg-neutral-800 border-white text-white";
    }
  };

  const getDifficultyBadgeColor = (difficulty: string, status: string) => {
    if (status === "locked")
      return "bg-neutral-800 text-neutral-500 border-neutral-700";
    switch (difficulty) {
      case "Easy":
        return "bg-cyan-950 text-cyan-300 border-cyan-500/50";
      case "Medium":
        return "bg-amber-950 text-amber-300 border-amber-500/50";
      case "Hard":
        return "bg-red-950 text-red-300 border-red-500/50";
      default:
        return "bg-neutral-800 text-white";
    }
  };

  // Determine what to show in popup (Hover takes precedence, then Focus)
  const activeLevel = hoverInfo ? hoverInfo.level : levels[focusedIndex];
  const activeRect = hoverInfo ? hoverInfo.rect : getFocusedRect();

  return (
    <div className="fixed inset-0 w-full h-full bg-black flex flex-col overflow-hidden select-none z-50">
      {/* Custom Scrollbar Styles */}
      <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                height: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #02040a; 
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #333; 
                border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #555; 
            }
        `}</style>

      {/* Top Controls Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pointer-events-none flex justify-between items-start">
        {/* Left Group: Exit & Language */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={onExit}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-900/30 backdrop-blur border border-neutral-700 hover:bg-white/10 hover:text-white text-neutral-400 transition shadow-xl disabled:hover:bg-white/10"
            title="Exit Map"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="bg-neutral-900/30 backdrop-blur border border-neutral-700 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xl">
            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
              <Code2 size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Language
              </div>
              <div className="text-sm font-bold text-white">{language}</div>
            </div>
          </div>
        </div>

        {/* Center Title */}
        <div className="absolute top-0 left-0 right-0 z-30 p-6 pointer-events-none py-8">
          <h2 className="text-3xl font-black text-white text-center tracking-tight drop-shadow-md opacity-80">
            THE{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              ODYSSEY
            </span>{" "}
            MAP
          </h2>
        </div>

        {/* Right Group: Progress & Regenerate */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="bg-neutral-900/30 backdrop-blur-xl border border-neutral-700 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xl">
            <div className="p-1.5 bg-yellow-500/20 rounded-lg text-yellow-400">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Progress
              </div>
              <div className="text-sm font-bold text-white">
                {completedCount} <span className="text-neutral-500">/</span>{" "}
                {levels.length}
              </div>
            </div>
            <div className="h-1 w-12 bg-neutral-800 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-yellow-500 transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={onRegenerate}
            title="Regenerate Map"
            className="hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(239,68,68,0.2)] transition-all duration-300 bg-neutral-900/30 hover:bg-red-500/10 backdrop-blur text-neutral-400 hover:text-red-400 border border-neutral-700 rounded-2xl px-4 py-2 flex items-center font-bold text-sm gap-3 shadow-xl"
          >
            <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400">
              <RefreshCw size={20} />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span>Regenerate</span>
              <span>Map</span>
            </div>
          </button>
        </div>
      </div>

      {/* Carousel Navigation Buttons */}
      <div className="absolute inset-y-0 left-0 z-20 flex items-center px-4 pointer-events-none">
        <button
          onClick={handlePrev}
          disabled={focusedIndex === 0}
          className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed group"
        >
          <ChevronLeft size={24} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 z-20 flex items-center px-4 pointer-events-none">
        <button
          onClick={handleNext}
          disabled={focusedIndex === levels.length - 1}
          className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-white/10 group"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar scroll-smooth"
      >
        <div
          style={{ width: `${Math.max(CONTENT_WIDTH, 100)}px`, height: "100%" }}
          className="relative"
        >
          <div className="absolute inset-0 z-0">
            <StarryBackground />
          </div>

          <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
            <svg
              className="w-full h-full"
              width={CONTENT_WIDTH}
              height={Math.max(containerHeight, 100)}
            >
              <defs>
                <linearGradient
                  id="pathGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.2" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d={levels
                  .map((_, i) => {
                    const current = getPosition(i);
                    if (i === 0)
                      return `M ${current.xPixels} ${current.yPixels}`;
                    const prev = getPosition(i - 1);
                    const cp1x = prev.xPixels + NODE_SPACING * 0.5;
                    const cp1y = prev.yPixels;
                    const cp2x = current.xPixels - NODE_SPACING * 0.5;
                    const cp2y = current.yPixels;
                    return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.xPixels} ${current.yPixels}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="6"
                strokeDasharray="16 8"
                strokeLinecap="round"
                filter="url(#glow)"
                className="opacity-60 animate-pulse"
              />
            </svg>
          </div>

          {/* Nodes Layer */}
          <div className="absolute inset-0 z-10">
            {levels.map((level, index) => {
              const pos = getPosition(index);
              const isFocused = index === focusedIndex;

              return (
                <div
                  key={level.id}
                  id={`node-${index}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 hover:z-50"
                  style={{ left: `${pos.xPixels}px`, top: `${pos.yPixels}px` }}
                  onMouseEnter={(e) => {
                    setHoverInfo({
                      level,
                      rect: e.currentTarget.getBoundingClientRect(),
                    });
                    // setFocusedIndex(index); <--- REMOVED TO PREVENT AUTO SCROLL
                  }}
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  <div className="relative flex justify-center">
                    <button
                      onClick={() =>
                        level.status !== "locked" && onLevelSelect(level)
                      }
                      disabled={level.status === "locked"}
                      className={`
                                    relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-4 transform transition-all duration-300
                                    ${getDifficultyStyles(level.difficulty, level.status)}
                                    ${isFocused ? "scale-110 z-50" : "hover:scale-110 active:scale-95"}
                                    `}
                    >
                      {level.status === "locked" && <Lock size={28} />}

                      {level.status === "completed" && (
                        <div className="flex flex-col items-center">
                          <div className="flex gap-0.5 -mt-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div>
                          </div>
                          <span className="text-2xl font-black italic">
                            {index + 1}
                          </span>
                        </div>
                      )}

                      {level.status === "unlocked" && (
                        <span className="text-3xl font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {index + 1}
                        </span>
                      )}
                    </button>

                    <div className="absolute -bottom-4 w-20 h-4 bg-black/60 rounded-full blur-md -z-10"></div>

                    <div
                      className={`
                                    absolute -top-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg border whitespace-nowrap z-[60]
                                    ${getDifficultyBadgeColor(level.difficulty, level.status)}
                                `}
                    >
                      {level.difficulty}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Popup - Shows Hover Info (if hovering) OR Focus Info (if navigating buttons) */}
      {activeLevel && activeRect && (
        <LevelDetailPopup level={activeLevel} rect={activeRect} />
      )}
    </div>
  );
}