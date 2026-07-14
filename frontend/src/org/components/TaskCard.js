import { StatusBadge } from "@/org/components/StatusBadge";
import { PriorityBadge } from "@/org/components/PriorityBadge";
import { useLang } from "@/org/context/LangContext";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { CalendarDays, Folder } from "lucide-react";

export function TaskCard({ task, projectName, onClick, compact = false, showStatus = true }) {
  const { t } = useLang();
  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due && isBefore(startOfDay(due), startOfDay(new Date())) &&
    !["terminee", "annulee"].includes(task.status);

  return (
    <div
      data-testid={`task-card-${task.id}`}
      onClick={onClick}
      className="cursor-pointer rounded-[10px] border p-3.5 shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug" style={{ color: "var(--ink)" }}>
          {task.title}
        </p>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--ink-muted)" }}>
        {showStatus && !compact && <StatusBadge status={task.status} />}
        {projectName && (
          <span className="inline-flex items-center gap-1"><Folder size={12} strokeWidth={1.5} />{projectName}</span>
        )}
        {due && (
          <span className="inline-flex items-center gap-1" style={{ color: overdue ? "var(--danger)" : "var(--ink-muted)" }}>
            <CalendarDays size={12} strokeWidth={1.5} />{format(due, "dd/MM/yyyy")}
          </span>
        )}
      </div>
    </div>
  );
}
