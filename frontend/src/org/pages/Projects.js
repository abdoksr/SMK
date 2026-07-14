import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { ProjectCard } from "@/org/components/ProjectCard";
import { EmptyState } from "@/org/components/EmptyState";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { Plus, FolderKanban, X, Loader2 } from "lucide-react";

function Select({ testId, value, onChange, children }) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[8px] border px-3 py-2 text-sm outline-none"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}
    >
      {children}
    </select>
  );
}

export default function Projects() {
  const { t, label } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const type = params.get("type") || "";
  const [dialog, setDialog] = useState(false);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params);
    val ? next.set(key, val) : next.delete(key);
    setParams(next);
  };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", status, type],
    queryFn: async () => {
      const q = {};
      if (status) q.status = status;
      if (type) q.type = type;
      return (await api.get("/projects", { params: q })).data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("projects")}</h1>
        <button
          data-testid="new-project-btn"
          onClick={() => setDialog(true)}
          className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "var(--org-accent)" }}
        >
          <Plus size={16} /> {t("new_project")}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Select testId="filter-status" value={status} onChange={(v) => setFilter("status", v)}>
          <option value="">{t("all_statuses")}</option>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </Select>
        <Select testId="filter-type" value={type} onChange={(v) => setFilter("type", v)}>
          <option value="">{t("all_types")}</option>
          {PROJECT_TYPES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t("no_projects")}
          description={t("no_projects_desc")}
          action={
            <button data-testid="empty-new-project" onClick={() => setDialog(true)}
              className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--org-accent)" }}>
              <Plus size={16} /> {t("new_project")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} delay={i * 0.03} onClick={() => navigate(`/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {dialog && <NewProjectDialog onClose={() => setDialog(false)} onCreated={(id) => { qc.invalidateQueries({ queryKey: ["projects"] }); navigate(`/projects/${id}`); }} />}
    </div>
  );
}

function NewProjectDialog({ onClose, onCreated }) {
  const { t, label } = useLang();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("architecture");
  const [templateId, setTemplateId] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await api.get("/project-templates")).data,
  });

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/projects", {
      name, client_name: client || null, type,
      template_id: templateId || null,
    })).data,
    onSuccess: (data) => { toast.success(t("created")); onCreated(data.id); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[10px] border p-6 shadow-lg"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("new_project")}</h2>
          <button data-testid="close-dialog" onClick={onClose} aria-label="close"><X size={18} style={{ color: "var(--ink-muted)" }} /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("project_name")}</label>
            <input data-testid="project-name-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-[var(--org-accent)]"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("client")}</label>
            <input data-testid="project-client-input" value={client} onChange={(e) => setClient(e.target.value)}
              className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-[var(--org-accent)]"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("filter_type")}</label>
            <select data-testid="project-type-select" value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
              {PROJECT_TYPES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("from_template")}</label>
            <select data-testid="project-template-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
              <option value="">{t("blank_project")}</option>
              {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button data-testid="cancel-project" onClick={onClose}
            className="rounded-[8px] border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
            {t("cancel")}
          </button>
          <button data-testid="submit-project" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: "var(--org-accent)" }}>
            {mutation.isPending && <Loader2 size={15} className="animate-spin" />}
            {t("create_project")}
          </button>
        </div>
      </div>
    </div>
  );
}
