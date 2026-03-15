import { useMemo } from "react";

// Helper to generate last 365 days
function generateCalendar() {
  const days = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      count: 0,
    });
  }
  return days;
}

export function ActivityHeatmap({ submissions }: { submissions: any[] }) {
  const calendar = useMemo(() => {
    const cal = generateCalendar();
    if (!submissions) return cal;

    const counts: Record<string, number> = {};
    submissions.forEach((sub) => {
      const d = new Date(sub.submitted_at).toISOString().split("T")[0];
      counts[d] = (counts[d] || 0) + 1;
    });

    return cal.map((day) => ({
      ...day,
      count: counts[day.date] || 0,
    }));
  }, [submissions]);

  // 5-tier GitHub style colors
  const getColor = (count: number) => {
    if (count === 0) return "bg-white/5 border-white/10";
    if (count <= 2) return "bg-green-500/30 border-green-500/40";
    if (count <= 5) return "bg-green-500/50 border-green-500/60";
    if (count <= 10) return "bg-green-500/75 border-green-500/80";
    return "bg-green-400 border-green-300";
  };

  // Split into weeks (cols)
  const weeks = [];
  let currentWeek = [];
  for (let i = 0; i < calendar.length; i++) {
    currentWeek.push(calendar[i]);
    if (currentWeek.length === 7 || i === calendar.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return (
    <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        Activity
      </h3>
      <div className="flex gap-1 overflow-x-auto pb-4 custom-scrollbar">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((day, dIdx) => (
              <div
                key={dIdx}
                title={`${day.count} submissions on ${day.date}`}
                className={`w-3 h-3 rounded-sm border ${getColor(day.count)} transition-all hover:scale-125 hover:z-10`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-neutral-400 justify-end">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
        <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/40" />
        <div className="w-3 h-3 rounded-sm bg-green-500/50 border border-green-500/60" />
        <div className="w-3 h-3 rounded-sm bg-green-500/75 border border-green-500/80" />
        <div className="w-3 h-3 rounded-sm bg-green-400 border border-green-300" />
        <span>More</span>
      </div>
    </div>
  );
}

