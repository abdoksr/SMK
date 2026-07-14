import { useLang } from "@/org/context/LangContext";
import { PRIORITY_COLOR } from "@/org/lib/i18n";
import { Flag, AlertTriangle, Minus } from "lucide-react";

const ICONS = { normale: Minus, importante: Flag, urgente: AlertTriangle };

export function PriorityBadge({ priority }) {
  const { label } = useLang();
  if (!priority) return null;
  const color = `var(--${PRIORITY_COLOR[priority] || "neutral"})`;
  const Icon = ICONS[priority] || Minus;
  return (
    <span
      data-testid={`priority-badge-${priority}`}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}1F` }}
    >
      <Icon size={12} strokeWidth={2} />
      {label(priority)}
    </span>
  );
}
