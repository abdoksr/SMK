import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { DocumentCard } from "@/org/components/DocumentCard";
import { EmptyState } from "@/org/components/EmptyState";
import { PrimaryBtn } from "@/org/components/kit";
import { DocumentDialog } from "@/org/components/DocumentDialog";
import { DOCUMENT_CATEGORIES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";

export default function Documents({ embeddedProjectId }) {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState(embeddedProjectId || "");
  const [open, setOpen] = useState(false);

  const effProject = embeddedProjectId || projectId;

  const { data: projects = [] } = useQuery({ queryKey: ["projects-min"], queryFn: async () => (await api.get("/projects")).data });
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", effProject, category],
    queryFn: async () => {
      const q = {};
      if (effProject) q.project_id = effProject;
      if (category) q.category = category;
      return (await api.get("/documents", { params: q })).data;
    },
  });

  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  // Per (title, project) couple, only the most recent non-obsolete doc is the "latest version".
  const latestIds = useMemo(() => {
    const groups = {};
    docs.forEach((d) => {
      const key = `${d.title}||${d.project_id || ""}`;
      (groups[key] = groups[key] || []).push(d);
    });
    const ids = new Set();
    Object.values(groups).forEach((list) => {
      const active = list.filter((d) => !["obsolete", "archive"].includes(d.status));
      if (active.length) {
        active.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        ids.add(active[0].id);
      }
    });
    return ids;
  }, [docs]);

  const del = useMutation({
    mutationFn: (id) => api.delete(`/documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success(t("deleted")); },
  });

  return (
    <div className={embeddedProjectId ? "" : "mx-auto max-w-5xl"}>
      {!embeddedProjectId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("documents")}</h1>
          <PrimaryBtn testId="new-document-btn" onClick={() => setOpen(true)}><Plus size={16} /> {t("new_document")}</PrimaryBtn>
        </div>
      )}
      {embeddedProjectId && (
        <div className="mb-4 flex justify-end"><PrimaryBtn testId="new-document-btn" onClick={() => setOpen(true)}><Plus size={16} /> {t("new_document")}</PrimaryBtn></div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        {!embeddedProjectId && (
          <select data-testid="filter-doc-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
            <option value="">{t("all_projects")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select data-testid="filter-doc-category" value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
          <option value="">{t("all_categories")}</option>
          {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
      </div>

      {isLoading ? <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
        : docs.length === 0 ? <EmptyState icon={FileText} title={t("no_documents")} description={t("no_documents_desc")} />
        : (
          <div className="flex flex-col gap-3">
            {docs.map((d) => <DocumentCard key={d.id} doc={d} isLatest={latestIds.has(d.id)} onDelete={del.mutate} />)}
          </div>
        )}

      {open && <DocumentDialog defaultProject={effProject} onClose={() => setOpen(false)}
        onCreated={() => { qc.invalidateQueries({ queryKey: ["documents"] }); setOpen(false); }} />}
    </div>
  );
}
