import { useLang } from "@/org/context/LangContext";
import { Pin, PinOff, CheckSquare, Gavel, Trash2 } from "lucide-react";

export function NoteCard({ note, onTogglePin, onConvertTask, onConvertDecision, onDelete }) {
  const { t, label } = useLang();
  return (
    <div data-testid={`note-card-${note.id}`}
      className="rounded-[10px] border p-4 shadow-sm" style={{ backgroundColor: "var(--surface)", borderColor: note.pinned ? "var(--org-accent)" : "var(--org-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {note.title && <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{note.title}</h3>}
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{label(note.category)}</span>
        </div>
        <button data-testid={`note-pin-${note.id}`} onClick={() => onTogglePin(note)} aria-label="pin" className="rounded-md p-1 hover:bg-[var(--bg)]">
          {note.pinned ? <Pin size={15} style={{ color: "var(--org-accent)" }} fill="var(--org-accent)" /> : <PinOff size={15} strokeWidth={1.5} style={{ color: "var(--ink-muted)" }} />}
        </button>
      </div>
      {note.content && <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--ink)" }}>{note.content}</p>}
      {note.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.map((tg) => <span key={tg} className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--bg)", color: "var(--ink-muted)" }}>#{tg}</span>)}
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5 border-t pt-3" style={{ borderColor: "var(--org-border)" }}>
        <button data-testid={`note-to-task-${note.id}`} onClick={() => onConvertTask(note)}
          className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-medium hover:bg-[var(--bg)]" style={{ color: "var(--ink)" }}>
          <CheckSquare size={13} strokeWidth={1.5} /> {t("convert_to_task")}
        </button>
        <button data-testid={`note-to-decision-${note.id}`} onClick={() => onConvertDecision(note)}
          className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-medium hover:bg-[var(--bg)]" style={{ color: "var(--ink)" }}>
          <Gavel size={13} strokeWidth={1.5} /> {t("convert_to_decision")}
        </button>
        <button data-testid={`note-delete-${note.id}`} onClick={() => onDelete(note.id)} className="ml-auto rounded-md p-1 hover:bg-[var(--bg)]" aria-label="delete">
          <Trash2 size={14} strokeWidth={1.5} style={{ color: "var(--danger)" }} />
        </button>
      </div>
    </div>
  );
}
