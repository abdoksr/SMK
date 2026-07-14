import { useLang } from "@/org/context/LangContext";
import { STATUS_COLOR } from "@/org/lib/i18n";
import { CircleDot, Loader, PauseCircle, Ban, CheckCircle2, Circle, Search } from "lucide-react";

const ICONS = {
  prospect: Search, a_demarrer: Circle, en_cours: Loader, en_attente: PauseCircle,
  bloque: Ban, termine: CheckCircle2, archive: Circle,
  non_commencee: Circle, bloquee: Ban, terminee: CheckCircle2,
  a_faire: Circle, a_verifier: CircleDot, annulee: Ban,
};

export function StatusBadge({ status, size = "sm" }) {
  const { label } = useLang();
  if (!status) return null;
  const color = `var(--${STATUS_COLOR[status] || "neutral"})`;
  const Icon = ICONS[status] || Circle;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wide ${
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
      style={{ color, backgroundColor: `${color}1F` }}
    >
      <Icon size={12} strokeWidth={2} />
      {label(status)}
    </span>
  );
}
