import { useMemo } from "react";

export default function StarryBackground() {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      animationDuration: `${Math.random() * 3 + 2}s`,
      animationDelay: `${Math.random() * 2}s`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#020205] overflow-hidden">
      <style>
        {`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                `}
      </style>

      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-[#050510] to-black pointer-events-none" />

      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full shadow-[0_0_2px_#fff]"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.animationDuration} infinite ease-in-out ${star.animationDelay}`,
          }}
        />
      ))}
    </div>
  );
}
