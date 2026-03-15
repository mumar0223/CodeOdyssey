import React, { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Theme Colors Mapping for Setup Components ---
const themeColors: Record<
  string,
  {
    text: string;
    focusRing: string;
    shadow: string;
    buttonGradient: string;
  }
> = {
  blue: {
    text: "text-blue-400",
    focusRing: "focus:ring-blue-500/50",
    shadow: "shadow-blue-500/20",
    buttonGradient:
      "from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500",
  },
  cyan: {
    text: "text-cyan-400",
    focusRing: "focus:ring-cyan-500/50",
    shadow: "shadow-cyan-500/20",
    buttonGradient:
      "from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500",
  },
  teal: {
    text: "text-teal-400",
    focusRing: "focus:ring-teal-500/50",
    shadow: "shadow-teal-500/20",
    buttonGradient:
      "from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500",
  },
  purple: {
    text: "text-purple-400",
    focusRing: "focus:ring-purple-500/50",
    shadow: "shadow-purple-500/20",
    buttonGradient:
      "from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
  },
  orange: {
    text: "text-orange-400",
    focusRing: "focus:ring-orange-500/50",
    shadow: "shadow-orange-500/20",
    buttonGradient:
      "from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500",
  },
};

// --- 1. Page Wrapper ---
interface SetupPageProps {
  title: ReactNode;
  onCancel?: () => void;
  themeColor: keyof typeof themeColors;
  children?: ReactNode;
  actionButtonText?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

export function SetupPage({
  title,
  onCancel,
  themeColor,
  children,
  actionButtonText,
  onAction,
  actionDisabled,
}: SetupPageProps) {
  const theme = themeColors[themeColor] || themeColors.blue;

  return (
    <div className="pt-24 max-w-xl mx-auto px-6 pb-12 animate-in fade-in slide-in-from-bottom-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-white drop-shadow-lg">
          {title}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-white transition"
          >
            Cancel
          </button>
        )}
      </div>
      <div
        className={`bg-neutral-900/60 backdrop-blur-md p-8 rounded-3xl border border-neutral-800 space-y-6 shadow-2xl relative overflow-hidden ${theme.shadow}`}
      >
        {children}

        {actionButtonText && onAction && (
          <button
            onClick={onAction}
            disabled={actionDisabled}
            className={`w-full py-4 bg-gradient-to-r ${theme.buttonGradient} text-white rounded-xl font-bold text-lg transition shadow-lg mt-4 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50`}
          >
            {actionButtonText}
          </button>
        )}
      </div>
    </div>
  );
}

// --- 2. Field Wrapper (Label + Content) ---
export function SetupField({
  label,
  themeColor,
  children,
  className,
}: {
  label: string;
  themeColor: string;
  children?: ReactNode;
  className?: string;
}) {
  const theme = themeColors[themeColor] || themeColors.blue;
  return (
    <div className={className}>
      <label
        className={`block mb-2 font-medium text-sm uppercase tracking-wide ${theme.text}`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

interface SetupDropdownProps {
  value: string;
  options: string[] | { label: string; value: string }[];
  onSelect: (value: string) => void;
  themeColor?: string;
  placeholder?: string;
}

export function SetupDropdown({
  value,
  options,
  onSelect,
  themeColor = "blue",
  placeholder,
}: SetupDropdownProps) {
  const theme = themeColors[themeColor] || themeColors.blue;
  const dropdownTriggerClass = `w-full flex items-center justify-between bg-black/50 border border-neutral-800 rounded-xl p-4 text-white transition cursor-pointer focus:outline-none focus:ring-2 ${theme.focusRing}`;
  const dropdownContentClass =
    "w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-neutral-700 bg-neutral-900/90 backdrop-blur-xl p-1 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 z-[200]";
  const dropdownItemClass = (isSelected: boolean, themeColor: string) =>
    `cursor-pointer rounded-lg px-3 py-2 text-sm text-white outline-none focus:outline-none focus-visible:outline-none transition-colors data-[highlighted]:bg-white/10 data-[highlighted]:backdrop-blur-md ${isSelected ? `bg-${themeColor}-500/20 backdrop-blur-xl data-[highlighted]:bg-${themeColor}-500/20` : ""}`;
  const displayValue =
    typeof options[0] === "object"
      ? (options as { label: string; value: string }[]).find(
          (o) => o.value === value,
        )?.label || value
      : value;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className={dropdownTriggerClass}>
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={dropdownContentClass}>
        {options.map((opt) => {
          const itemValue = typeof opt === "string" ? opt : opt.value;
          const itemLabel = typeof opt === "string" ? opt : opt.label;
          return (
            <DropdownMenuItem
              key={itemValue}
              onSelect={() => onSelect(itemValue)}
              className={dropdownItemClass(value === itemValue, themeColor)}
            >
              {itemLabel}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- 4. Reusable Input ---
interface SetupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  themeColor: string;
}

export function SetupInput({
  themeColor,
  className,
  ...props
}: SetupInputProps) {
  const theme = themeColors[themeColor] || themeColors.blue;
  return (
    <input
      type="text"
      className={`w-full bg-black/50 border border-neutral-800 rounded-xl p-4 text-white outline-none transition ${theme.focusRing} ${className || ""}`}
      {...props}
    />
  );
}
