import { Timer, TimerOff } from "lucide-react";

type TimerMode = "auto" | "manual" | "off";

interface TimerSelectorProps {
  mode: TimerMode;
  minutes: number;
  onModeChange: (mode: TimerMode) => void;
  onMinutesChange: (minutes: number) => void;
  themeColor: string;
  label?: string;
}

const themeColors: Record<string, { text: string, bg: string }> = {
  blue: { text: "text-blue-400", bg: "bg-blue-600" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-600" },
  teal: { text: "text-teal-400", bg: "bg-teal-600" },
  purple: { text: "text-purple-400", bg: "bg-purple-600" },
  orange: { text: "text-orange-400", bg: "bg-orange-600" },
  green: { text: "text-green-400", bg: "bg-green-600" },
};

export function TimerSelector({
  mode,
  minutes,
  onModeChange,
  onMinutesChange,
  themeColor,
  label = "Time Limit"
}: TimerSelectorProps) {
  const theme = themeColors[themeColor] || themeColors.blue;

  return (
    <div className="bg-black/30 p-4 rounded-xl border border-neutral-800">
      <div className="flex items-center justify-between mb-4">
        <label className={`${theme.text} font-medium text-sm uppercase tracking-wide flex items-center gap-2`}>
          <Timer size={14} /> {label}
        </label>
        <div className="flex bg-black/50 rounded-lg p-1 border border-neutral-700">
          <button
            onClick={() => onModeChange("auto")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'auto' ? `${theme.bg} text-white` : "text-neutral-500 hover:text-neutral-300"}`}
          >
            AI Auto
          </button>
          <button
            onClick={() => onModeChange("manual")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'manual' ? `${theme.bg} text-white` : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Custom
          </button>
          <button
            onClick={() => onModeChange("off")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${mode === 'off' ? `${theme.bg} text-white` : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <TimerOff size={12} /> Off
          </button>
        </div>
      </div>
      
      {mode === 'manual' && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <input
            type="number"
            min="5"
            max="120"
            value={minutes}
            onChange={(e) => onMinutesChange(parseInt(e.target.value) || 20)}
            className={`w-20 bg-black/50 border border-neutral-700 rounded-lg p-2 text-center text-white font-mono outline-none focus:ring-2 focus:ring-${themeColor}-500/50`}
          />
          <span className="text-sm text-neutral-400">Minutes</span>
        </div>
      )}
      
      {mode === 'auto' && (
        <p className="text-xs text-neutral-500">AI will determine the time limit based on task complexity.</p>
      )}
    </div>
  );
}
