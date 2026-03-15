"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface SkillRadarProps {
  publicId: string;
}

// Default topics for the radar axes
const RADAR_TOPICS = [
  "Arrays",
  "Graphs",
  "Greedy",
  "Dynamic Programming",
  "Math",
  "Strings",
  "Trees",
  "Bit Manipulation",
];

/**
 * SVG Radar Chart showing user skill levels across topics.
 * Data comes from userTopicStats success_rate values.
 */
export function SkillRadar({ publicId }: SkillRadarProps) {
  // @ts-ignore
  const topicStats = useQuery(
    api.topicStats?.getUserTopicStatsByPublicId || (() => []),
    { public_id: publicId }
  );

  // Map topic stats to a lookup
  const statsMap = new Map<string, number>();
  if (topicStats) {
    for (const stat of topicStats) {
      statsMap.set(stat.topic, stat.success_rate);
    }
  }

  // Get values for each axis (default 0% if no data)
  const values = RADAR_TOPICS.map((topic) => statsMap.get(topic) ?? 0);
  const hasData = values.some((v) => v > 0);

  // SVG dimensions
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 110;
  const levels = 5; // concentric rings

  // Calculate point position on radar
  const getPoint = (index: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * index) / RADAR_TOPICS.length - Math.PI / 2;
    const radius = (value / 100) * maxRadius;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  // Generate concentric ring paths
  const ringPaths = Array.from({ length: levels }, (_, level) => {
    const radius = ((level + 1) / levels) * maxRadius;
    return RADAR_TOPICS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / RADAR_TOPICS.length - Math.PI / 2;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
  });

  // Generate data polygon path
  const dataPoints = values.map((v, i) => getPoint(i, v));
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";

  // Generate axis lines
  const axisLines = RADAR_TOPICS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_TOPICS.length - Math.PI / 2;
    return {
      x2: cx + maxRadius * Math.cos(angle),
      y2: cy + maxRadius * Math.sin(angle),
    };
  });

  // Label positions (slightly outside the chart)
  const labelPositions = RADAR_TOPICS.map((topic, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_TOPICS.length - Math.PI / 2;
    const labelRadius = maxRadius + 22;
    return {
      topic,
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
      value: values[i],
    };
  });

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎯</span> Skill Radar
      </h3>

      {!hasData ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          <p className="mb-2">No topic data yet.</p>
          <p className="text-xs text-neutral-600">
            Solve problems across different topics to see your skill radar.
          </p>
        </div>
      ) : (
        <div className="flex justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            {/* Concentric rings */}
            {ringPaths.map((ring, level) => (
              <polygon
                key={level}
                points={ring.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}

            {/* Axis lines */}
            {axisLines.map((line, i) => (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            ))}

            {/* Data polygon - gradient fill */}
            <defs>
              <linearGradient
                id="radarGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="rgba(59,130,246,0.4)" />
                <stop offset="50%" stopColor="rgba(168,85,247,0.3)" />
                <stop offset="100%" stopColor="rgba(236,72,153,0.4)" />
              </linearGradient>
            </defs>
            <path
              d={dataPath}
              fill="url(#radarGradient)"
              stroke="rgba(139,92,246,0.6)"
              strokeWidth="2"
              className="transition-all duration-1000"
            />

            {/* Data points */}
            {dataPoints.map((point, i) => (
              <circle
                key={i}
                cx={point[0]}
                cy={point[1]}
                r={4}
                fill={
                  values[i] >= 70
                    ? "#22c55e"
                    : values[i] >= 40
                      ? "#eab308"
                      : "#ef4444"
                }
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1.5"
                className="transition-all duration-1000"
              />
            ))}

            {/* Labels */}
            {labelPositions.map((label, i) => (
              <g key={i}>
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-neutral-400 text-[9px] font-bold"
                >
                  {label.topic.length > 12
                    ? label.topic.slice(0, 10) + "..."
                    : label.topic}
                </text>
                <text
                  x={label.x}
                  y={label.y + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-[9px] font-mono font-bold ${
                    label.value >= 70
                      ? "fill-green-400"
                      : label.value >= 40
                        ? "fill-yellow-400"
                        : label.value > 0
                          ? "fill-red-400"
                          : "fill-neutral-600"
                  }`}
                >
                  {label.value > 0 ? `${label.value}%` : "-"}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Legend */}
      {hasData && (
        <div className="flex justify-center gap-4 mt-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-neutral-500">70%+ Strong</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-neutral-500">40-69% Average</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-neutral-500">&lt;40% Weak</span>
          </span>
        </div>
      )}
    </div>
  );
}
