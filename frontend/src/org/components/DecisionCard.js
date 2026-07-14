import { useLang } from "@/org/context/LangContext";
import { Gavel, CalendarClock, ArrowUpRight, Trash2 } from "lucide-react";

export function DecisionCard({ decision, projectName, onOpenMeeting, onDelete }) {
  const { t } = useLang();
  return (
    <div data-testid={`decision-card-${decision.id}`}
      className="rounded-[10px] border p-4 shadow-sm" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: "var(--bg)" }}>
          <Gavel size={16} strokeWidth={1.5} style={{ color: "var(--org-accent)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{decision.title}</h3>
          {decision.description && <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>{decision.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {decision.date && <span className="inline-flex items-center gap-1"><CalendarClock size={12} strokeWidth={1.5} />{decision.date}</span>}
            {decision.origin && <span>{decision.origin}</span>}
            {projectName && <span>{projectName}</span>}
            {decision.impact && <span><b style={{ color: "var(--ink)" }}>{t("impact")}:</b> {decision.impact}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {decision.meeting_id && (
            <button data-testid={`decision-meeting-${decision.id}`} onClick={() => onOpenMeeting(decision.meeting_id)}
              className="rounded-md p-1.5 hover:bg-[var(--bg)]" aria-label="open meeting">
              <ArrowUpRight size={15} strokeWidth={1.5} style={{ color: "var(--progress)" }} />
            </button>
          )}
          <button data-testid={`decision-delete-${decision.id}`} onClick={() => onDelete(decision.id)} className="rounded-md p-1.5 hover:bg-[var(--bg)]" aria-label="delete">
            <Trash2 size={15} strokeWidth={1.5} style={{ color: "var(--danger)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
