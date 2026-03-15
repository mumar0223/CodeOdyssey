import React, { useState } from "react";
import { cn } from "@/lib/utils";

type GlowState = "idle" | "loading";
type GlowMode = "idle" | "loading";

export function AnimatedGlowButton({
  children,
  className,
  containerClassName,
  duration = 16,
  state = "idle",
  mode = "idle",
  ...props
}: React.PropsWithChildren<{
  className?: string;
  containerClassName?: string;
  duration?: number;
  state?: GlowState;
  mode?: GlowMode;
}> &
  React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [isHovered, setIsHovered] = useState(false);

  const isLoading = state === "loading";
  const isActiveGlow = isLoading || isHovered;
  const enableDiagonal = mode === "loading";

  const styleVars = {
    ["--glow-duration" as any]: `${duration}s`,
  };

  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        containerClassName
      )}
      style={styleVars}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Local CSS only */}
      <style>{`
        @keyframes glow-text-cycle {
          0% { color: #4f8cff; }
          33% { color: #7a5cff; }
          66% { color: #ff5fd8; }
          100% { color: #4f8cff; }
        }

        @keyframes diagonal-sweep {
          from { background-position: 0% 50%; }
          to { background-position: 100% 50%; }
        }

        .glow-text-cycle {
          animation: glow-text-cycle calc(var(--glow-duration) * 0.8) linear infinite;
          will-change: color;
        }

        .diagonal-sweep {
          background-size: 200% 200%;
          animation: diagonal-sweep 2.2s linear infinite;
          will-change: background-position, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .glow-text-cycle,
          .diagonal-sweep {
            animation: none;
          }
        }
      `}</style>

      {/* STRONG OUTER GLOW */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={{
          background:
            "radial-gradient(ellipse, rgba(79,140,255,0.9) 0%, rgba(122,92,255,0.4) 50%, transparent 70%)",
          opacity: isActiveGlow ? 0.6 : 0,
          filter: isActiveGlow ? "blur(26px)" : "blur(12px)",
        }}
      />

      {/* BASE RADIAL GLOW (always on) */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={{
          background:
            "radial-gradient(ellipse, rgba(79,140,255,1) 0%, rgba(122,92,255,0.6) 60%, transparent 80%)",
          opacity: isActiveGlow ? 0.45 : 0.18,
          filter: "blur(18px)",
        }}
      />

      {/* DIAGONAL SWEEP (loading mode only) */}
      {enableDiagonal && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 pointer-events-none diagonal-sweep transition-opacity duration-700 ease-out"
          )}
          style={{
            background:
              "linear-gradient(45deg, rgba(255,95,216,0.0), rgba(255,95,216,0.35), rgba(79,140,255,0.0))",
            filter: "blur(14px)",
            opacity: isLoading ? 0.55 : 0,
          }}
        />
      )}

      {/* TEXT / ICON GLOW */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out",
          className
        )}
        style={{
          opacity: isActiveGlow ? 0.6 : 0.35,
          filter: isActiveGlow ? "blur(6px)" : "blur(3px)",
        }}
      >
        {children}
      </span>

      {/* MAIN CONTENT */}
      <span
        className={cn(
          "relative z-10 font-semibold glow-text-cycle",
          className
        )}
      >
        {children}
      </span>
    </button>
  );
}
