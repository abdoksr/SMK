import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { DecisionCard } from "@/org/components/DecisionCard";
import { EmptyState } from "@/org/components/EmptyState";
import { Modal, Field, TextArea, SelectField, PrimaryBtn, GhostBtn } from "@/org/components/kit";
import { toast } from "sonner";
import { Plus, Gavel } from "lucide-react";

export default function Decisions({ embeddedProjectId }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(embeddedProjectId || "");
  const [open, setOpen] = useState(false);
  const eff = embeddedProjectId || projectId;

  const { data: projects = [] } = useQuery({ queryKey: ["projects-min"], queryFn: async () => (await api.get("/projects")).data });
  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ["decisions", eff],
    queryFn: async () => (await api.get("/decisions", { params: eff ? { project_id: eff } : {} })).data,
  });
  const projectName = (id) => projects.find((p) => p.id === id)?.name;
  const del = useMutation({
    mutationFn: (id) => api.delete(`/decisions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["decisions"] }); toast.success(t("deleted")); },
  });

  return (
    <div className={embeddedProjectId ? "" : "mx-auto max-w-4xl"}>
      <div className={`mb-6 flex flex-wrap items-center ${embeddedProjectId ? "justify-end" : "justify-between"} gap-3`}>
        {!embeddedProjectId && <h1 className="text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("decisions")}</h1>}
        <PrimaryBtn testId="new-decision-btn" onClick={() => setOpen(true)}><Plus size={16} /> {t("new_decision")}</PrimaryBtn>
      </div>

      {!embeddedProjectId && (
        <div className="mb-6">
          <select data-testid="filter-decision-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
            <option value="">{t("all_projects")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {isLoading ? <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
        : decisions.length === 0 ? <EmptyState icon={Gavel} title={t("no_decisions")} description={t("no_decisions_desc")} />
        : (
          <div className="flex flex-col gap-3">
            {decisions.map((d) => <DecisionCard key={d.id} decision={d} projectName={projectName(d.project_id)}
              onOpenMeeting={() => navigate("/meetings")} onDelete={del.mutate} />)}
          </div>
        )}

      {open && <DecisionDialog projects={projects} defaultProject={eff} onClose={() => setOpen(false)}
        onCreated={() => { qc.invalidateQueries({ queryKey: ["decisions"] }); setOpen(false); }} />}
    </div>
  );
}

function DecisionDialog({ projects, defaultProject, onClose, onCreated }) {
  const { t } = useLang();
  const [form, setForm] = useState({ title: "", description: "", project_id: defaultProject || "", origin: "", impact: "", date: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api.post("/decisions", { ...form, project_id: form.project_id || null, date: form.date || null }),
    onSuccess: () => { toast.success(t("created")); onCreated(); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });
  return (
    <Modal open onClose={onClose} title={t("new_decision")} testId="decision-dialog"
      footer={<><GhostBtn testId="cancel-decision" onClick={onClose}>{t("cancel")}</GhostBtn>
        <PrimaryBtn testId="submit-decision" disabled={!form.title.trim() || mut.isPending} onClick={() => mut.mutate()}>{t("create")}</PrimaryBtn></>}>
      <Field label={t("title")} testId="decision-title-input" value={form.title} onChange={set("title")} autoFocus />
      <TextArea label={t("description")} testId="decision-description-input" value={form.description} onChange={set("description")} />
      <SelectField label={t("project")} testId="decision-project-select" value={form.project_id} onChange={set("project_id")}
        options={[{ value: "", label: t("unassigned") }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("origin")} testId="decision-origin-input" value={form.origin} onChange={set("origin")} />
        <Field label={t("date")} testId="decision-date-input" type="date" value={form.date} onChange={set("date")} />
      </div>
      <Field label={t("impact")} testId="decision-impact-input" value={form.impact} onChange={set("impact")} />
    </Modal>
  );
}
