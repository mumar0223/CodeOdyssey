import { RoadmapLevel } from "@/lib/types";
import { CheckCircle, MapPin } from "lucide-react";

export default function LevelDetailPopup({
  level,
  rect,
}: {
  level: RoadmapLevel;
  rect: DOMRect;
}) {
  const viewportHeight = window.innerHeight;
  const showAbove = rect.top > viewportHeight / 2;

  const getHeaderColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-cyan-400";
      case "Medium":
        return "text-amber-400";
      case "Hard":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div
      className="fixed z-[101] w-72 pointer-events-none animate-in fade-in zoom-in-95 duration-300"
      style={{
        left: `${rect.left + rect.width / 2}px`,
        top: showAbove ? "auto" : `${rect.bottom + 24}px`,
        bottom: showAbove ? `${viewportHeight - rect.top + 24}px` : "auto",
        transform: "translateX(-50%)",
      }}
    >
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl backdrop-blur-md">
        {/* Arrow Indicator */}
        <div
          className={`
                    absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-neutral-900 backdrop-blur-2xl border-l border-t border-neutral-700 transform rotate-45
                    ${showAbove ? "-bottom-2 border-l-0 border-t-0 border-r border-b" : "-top-2"}
                `}
        ></div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
            <div
              className={`flex items-center gap-2 text-xs font-mono uppercase font-bold ${getHeaderColor(level.difficulty)}`}
            >
              <MapPin size={14} /> Level {level.id}
            </div>
            {level.status === "completed" && (
              <CheckCircle size={14} className="text-emerald-500" />
            )}
          </div>

          <h3 className="text-base font-bold text-white mb-2 leading-tight">
            {level.title}
          </h3>
          <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
            {level.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {level.skillsGained.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-medium text-neutral-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}