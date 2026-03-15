
import React, { useEffect, useMemo, useState } from "react";

type ThemeColor = "blue" | "cyan" | "teal" | "purple" | "orange" | "green";
type CSSVars = React.CSSProperties & {
  [key: `--${string}`]: string;
};

/* ------------------ Words → Theme ------------------ */
const TYPING_WORDS: Record<string, ThemeColor> = {
  "Coding.": "blue",
  "Machine Learning.": "cyan",
  "Neural Networks.": "teal",
  "Optimizing.": "purple",
  "Systems.": "blue",
  "Algorithms.": "cyan",
  "Debugging.": "orange",
  "Logic.": "green",
};

/* ------------------ Theme → Glow Vars ------------------ */
const GLOW_VARS: Record<ThemeColor, CSSVars> = {
  blue: {
    "--glow-text": "#60a5fa",
    "--glow-strong": "rgba(96,165,250,0.5)",
    "--glow-medium": "rgba(96,165,250,0.3)",
    "--glow-soft": "rgba(96,165,250,0.15)",
  },
  cyan: {
    "--glow-text": "#22d3ee",
    "--glow-strong": "rgba(34,211,238,0.5)",
    "--glow-medium": "rgba(34,211,238,0.3)",
    "--glow-soft": "rgba(34,211,238,0.15)",
  },
  teal: {
    "--glow-text": "#2dd4bf",
    "--glow-strong": "rgba(45,212,191,0.5)",
    "--glow-medium": "rgba(45,212,191,0.3)",
    "--glow-soft": "rgba(45,212,191,0.15)",
  },
  purple: {
    "--glow-text": "#c084fc",
    "--glow-strong": "rgba(192,132,252,0.5)",
    "--glow-medium": "rgba(192,132,252,0.3)",
    "--glow-soft": "rgba(192,132,252,0.15)",
  },
  orange: {
    "--glow-text": "#fb923c",
    "--glow-strong": "rgba(251,146,60,0.5)",
    "--glow-medium": "rgba(251,146,60,0.3)",
    "--glow-soft": "rgba(251,146,60,0.15)",
  },
  green: {
    "--glow-text": "#4ade80",
    "--glow-strong": "rgba(74,222,128,0.5)",
    "--glow-medium": "rgba(74,222,128,0.3)",
    "--glow-soft": "rgba(74,222,128,0.15)",
  },
};


/* ------------------ Component ------------------ */
export default function Typewriter({ prefix }: { prefix: string }) {
  const entries = useMemo(() => Object.entries(TYPING_WORDS), []);
  const words = entries.map(([w]) => w);

  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  const currentWord = words[index];
  const currentTheme = entries[index][1];

  /* Cursor blink */
  useEffect(() => {
    const t = setTimeout(() => setBlink((b) => !b), 500);
    return () => clearTimeout(t);
  }, [blink]);

  /* Typing logic */
  useEffect(() => {
    if (subIndex === currentWord.length + 1 && !reverse) {
      const t = setTimeout(() => setReverse(true), 2500);
      return () => clearTimeout(t);
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const t = setTimeout(
      () => setSubIndex((i) => i + (reverse ? -1 : 1)),
      reverse ? 50 : 100
    );

    return () => clearTimeout(t);
  }, [subIndex, reverse, currentWord, words.length]);

  return (
    <span className="inline-block break-words whitespace-normal max-w-full">
      {/* 🔥 Local glow CSS */}
      <style>{`
        @keyframes word-glow {
          0% {
            text-shadow:
              0 0 6px var(--glow-soft),
              0 0 12px var(--glow-medium),
              0 0 24px var(--glow-strong);
          }
          50% {
            text-shadow:
              0 0 10px var(--glow-soft),
              0 0 20px var(--glow-medium),
              0 0 36px var(--glow-strong);
          }
          100% {
            text-shadow:
              0 0 6px var(--glow-soft),
              0 0 12px var(--glow-medium),
              0 0 24px var(--glow-strong);
          }
        }

        .typewriter-glow {
          color: var(--glow-text);
          animation: word-glow 3.5s ease-in-out infinite;
        }
      `}</style>

      {prefix}{" "}
      <span
        className="typewriter-glow"
        style={GLOW_VARS[currentTheme]}
      >
        {currentWord.substring(0, subIndex)}
      </span>

      <span
        className={`inline-block w-[2px] h-[0.8em] ml-1 align-baseline bg-white ${
          blink ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
