import React from "react";
import { cn } from "@/lib/utils";

export function AnimatedGlowTextBadge({
  children,
  className,
  containerClassName,
  as: Tag = "div",
  duration = 16,
  ...props
}: React.PropsWithChildren<{
  as?: React.ElementType;
  className?: string;
  containerClassName?: string;
  duration?: number;
}> &
  React.HTMLAttributes<HTMLElement>) {
  const styleVars = {
    ["--glow-duration" as any]: `${duration}s`,
  };

  return (
    <Tag
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        containerClassName
      )}
      style={styleVars}
      {...props}
    >
      {/* 🔥 CSS injected locally – no global file */}
      <style>{`
        @keyframes glow-bg {
          0% {
            background: radial-gradient(ellipse,
              rgba(79,140,255,0.9) 0%,
              rgba(79,140,255,0.5) 40%,
              rgba(79,140,255,0.2) 70%,
              transparent 100%);
          }
          33% {
            background: radial-gradient(ellipse,
              rgba(122,92,255,0.9) 0%,
              rgba(122,92,255,0.5) 40%,
              rgba(122,92,255,0.2) 70%,
              transparent 100%);
          }
          66% {
            background: radial-gradient(ellipse,
              rgba(255,95,216,0.9) 0%,
              rgba(255,95,216,0.5) 40%,
              rgba(255,95,216,0.2) 70%,
              transparent 100%);
          }
          100% {
            background: radial-gradient(ellipse,
              rgba(79,140,255,0.9) 0%,
              rgba(79,140,255,0.5) 40%,
              rgba(79,140,255,0.2) 70%,
              transparent 100%);
          }
        }

        @keyframes glow-text {
          0% { color: #4f8cff; }
          33% { color: #7a5cff; }
          66% { color: #ff5fd8; }
          100% { color: #4f8cff; }
        }

        .glow-bg {
          animation: glow-bg var(--glow-duration) linear infinite;
          will-change: background, filter;
        }

        .glow-text {
          animation: glow-text calc(var(--glow-duration) * 0.8) linear infinite;
          will-change: color, filter;
        }
      `}</style>

      {/* Outermost glow */}
      <span
        aria-hidden
        className="absolute glow-bg"
        style={{
          inset: "0px",
          filter: "blur(24px)",
          opacity: 0.5,
        }}
      />

      {/* Middle glow */}
      <span
        aria-hidden
        className="absolute glow-bg"
        style={{
          inset: "25px",
          filter: "blur(18px)",
          opacity: 0.5,
          animationDuration: `calc(var(--glow-duration) * 0.9)`,
        }}
      />

      {/* Inner glow */}
      <span
        aria-hidden
        className="absolute glow-bg"
        style={{
          inset: "0px",
          filter: "blur(12px)",
          opacity: 0.5,
          animationDuration: `calc(var(--glow-duration) * 0.85)`,
        }}
      />

      {/* Outer text glow */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center select-none glow-text",
          className
        )}
        style={{
          filter: "blur(8px)",
          opacity: 0.5,
          animationDuration: `calc(var(--glow-duration) * 0.95)`,
        }}
      >
        {children}
      </span>

      {/* Inner text glow */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center select-none glow-text",
          className
        )}
        style={{
          filter: "blur(3px)",
          opacity: 0.5,
          animationDuration: `calc(var(--glow-duration) * 0.88)`,
        }}
      >
        {children}
      </span>

      {/* Main text */}
      <span
        className={cn(
          "relative z-10 font-semibold glow-text",
          className
        )}
        style={{
          animationDuration: `calc(var(--glow-duration) * 0.8)`,
        }}
      >
        {children}
      </span>
    </Tag>
  );
}
