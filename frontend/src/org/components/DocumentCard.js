import { StatusBadge } from "@/org/components/StatusBadge";
import { useLang } from "@/org/context/LangContext";
import { FileText, ExternalLink, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

export function DocumentCard({ doc, isLatest, onEdit, onDelete }) {
  const { t, label } = useLang();
  const obsolete = doc.status === "obsolete";
  return (
    <div data-testid={`document-card-${doc.id}`}
      className="rounded-[10px] border p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", opacity: obsolete ? 0.55 : 1 }}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: "var(--bg)" }}>
          <FileText size={17} strokeWidth={1.5} style={{ color: "var(--ink-muted)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{doc.title}</h3>
            {doc.version && <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{doc.version}</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={doc.status} />
            <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{label(doc.category)}</span>
            {isLatest && !obsolete && (
              <span data-testid={`document-latest-${doc.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                style={{ backgroundColor: "var(--success)1F", color: "var(--success)" }}>
                <CheckCircle2 size={11} />{t("latest_version")}
              </span>
            )}
            {obsolete && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase" style={{ backgroundColor: "var(--danger)1F", color: "var(--danger)" }}>
                {t("obsolete_doc")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {doc.external_link && (
            <a data-testid={`document-link-${doc.id}`} href={doc.external_link} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()} className="rounded-md p-1.5 hover:bg-[var(--bg)]" aria-label="open link">
              <ExternalLink size={15} strokeWidth={1.5} style={{ color: "var(--progress)" }} />
            </a>
          )}
          <button data-testid={`document-delete-${doc.id}`} onClick={() => onDelete(doc.id)} className="rounded-md p-1.5 hover:bg-[var(--bg)]" aria-label="delete">
            <Trash2 size={15} strokeWidth={1.5} style={{ color: "var(--danger)" }} />
          </button>
        </div>
      </div>
      {obsolete && (
        <p data-testid={`document-obsolete-warning-${doc.id}`} className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--danger)" }}>
          <AlertTriangle size={12} strokeWidth={1.75} /> {t("obsolete_warning")}
        </p>
      )}
      {doc.comment && <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>{doc.comment}</p>}
    </div>
  );
}
