import { ChevronRight, LucideIcon } from "lucide-react";

export type ThemeColor =
  | "blue"
  | "cyan"
  | "teal"
  | "purple"
  | "orange"
  | "green";

interface ModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  themeColor: ThemeColor;
  buttonText: string;
  onClick: () => void;
}

const colorStyles: Record<
  ThemeColor,
  {
    border: string;
    hoverBorder: string;
    hoverShadow: string;
    iconBg: string;
    iconGhost: string;
    iconShadow: string;
    buttonText: string;
    gradientFrom: string;
    gradientVia: string;
    gradientTo: string;
  }
> = {
  blue: {
    border: "border-blue-500/30",
    hoverBorder: "hover:border-blue-400",
    hoverShadow: "hover:shadow-[0_0_60px_rgba(59,130,246,0.3)]",
    iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
    iconGhost: "text-blue-500/5",
    iconShadow: "shadow-blue-500/20",
    buttonText: "text-blue-400",
    gradientFrom: "from-blue-600/0",
    gradientVia: "via-blue-600/0",
    gradientTo: "to-blue-600/10",
  },

  cyan: {
    border: "border-cyan-500/30",
    hoverBorder: "hover:border-cyan-400",
    hoverShadow: "hover:shadow-[0_0_60px_rgba(34,211,238,0.3)]",
    iconBg: "bg-gradient-to-br from-cyan-500 to-teal-600",
    iconGhost: "text-cyan-500/5",
    iconShadow: "shadow-cyan-500/20",
    buttonText: "text-cyan-400",
    gradientFrom: "from-cyan-600/0",
    gradientVia: "via-cyan-600/0",
    gradientTo: "to-cyan-600/10",
  },

  teal: {
    border: "border-teal-500/30",
    hoverBorder: "hover:border-teal-400",
    hoverShadow: "hover:shadow-[0_0_60px_rgba(45,212,191,0.3)]",
    iconBg: "bg-gradient-to-br from-teal-500 to-emerald-600",
    iconGhost: "text-teal-500/5",
    iconShadow: "shadow-teal-500/20",
    buttonText: "text-teal-400",
    gradientFrom: "from-teal-600/0",
    gradientVia: "via-teal-600/0",
    gradientTo: "to-teal-600/10",
  },

  purple: {
    border: "border-purple-500/30",
    hoverBorder: "hover:border-purple-400",
    hoverShadow: "hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]",
    iconBg: "bg-gradient-to-br from-purple-500 to-pink-600",
    iconGhost: "text-purple-500/5",
    iconShadow: "shadow-purple-500/20",
    buttonText: "text-purple-400",
    gradientFrom: "from-purple-600/0",
    gradientVia: "via-purple-600/0",
    gradientTo: "to-purple-600/10",
  },

  orange: {
    border: "border-orange-500/30",
    hoverBorder: "hover:border-orange-400",
    hoverShadow: "hover:shadow-[0_0_60px_rgba(249,115,22,0.3)]",
    iconBg: "bg-gradient-to-br from-orange-500 to-red-600",
    iconGhost: "text-orange-500/5",
    iconShadow: "shadow-orange-500/20",
    buttonText: "text-orange-400",
    gradientFrom: "from-orange-600/0",
    gradientVia: "via-orange-600/0",
    gradientTo: "to-orange-600/10",
  },

  green: {
    border: "border-green-500/30",
    hoverBorder: "hover:border-green-400",
    hoverShadow: "hover:shadow-[0_0_60px_rgba(34,197,94,0.3)]",
    iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
    iconGhost: "text-green-500/5",
    iconShadow: "shadow-green-500/20",
    buttonText: "text-green-400",
    gradientFrom: "from-green-600/0",
    gradientVia: "via-green-600/0",
    gradientTo: "to-green-600/10",
  },
};

export function ModeCard({
  title,
  description,
  icon: Icon,
  themeColor,
  buttonText,
  onClick,
}: ModeCardProps) {
  const styles = colorStyles[themeColor];

  return (
    <div
      onClick={onClick}
      className={`group relative bg-neutral-900/60 backdrop-blur-md p-8 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-2 overflow-hidden ${styles.border} ${styles.hoverBorder} ${styles.hoverShadow}`}
    >
      {/* Hover gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.gradientFrom} ${styles.gradientVia} ${styles.gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />

      {/* Large background icon */}
      <div
        className={`absolute -right-6 -top-6 ${styles.iconGhost} transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 pointer-events-none`}
      >
        <Icon size={180} />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Small icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${styles.iconShadow} ${styles.iconBg}`}
        >
          <Icon size={32} className="text-white" />
        </div>

        {/* Title */}
        <h3
          className={`text-2xl font-black mb-3 text-white group-hover:${styles.buttonText} transition-colors`}
        >
          {title}
        </h3>

        {/* Description */}
        <p className="text-neutral-400 mb-8 text-sm leading-relaxed font-medium flex-grow">
          {description}
        </p>

        {/* Button */}
        <div
          className={`inline-flex items-center gap-2 font-bold ${styles.buttonText}`}
        >
          {buttonText}
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}