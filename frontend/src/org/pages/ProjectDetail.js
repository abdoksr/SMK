import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { StatusBadge } from "@/org/components/StatusBadge";
import { PriorityBadge } from "@/org/components/PriorityBadge";
import { StepTimeline } from "@/org/components/StepTimeline";
import { QuickCreateInput } from "@/org/components/QuickCreateInput";
import { TaskCard } from "@/org/components/TaskCard";
import { EmptyState } from "@/org/components/EmptyState";
import Documents from "@/org/pages/Documents";
import Meetings from "@/org/pages/Meetings";
import Decisions from "@/org/pages/Decisions";
import Notes from "@/org/pages/Notes";
import { PROJECT_STATUSES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { ArrowLeft, Plus, ListChecks, Archive, MapPin, User } from "lucide-react";

const ACTIVE_TABS = ["overview", "steps", "tasks", "documents", "meetings", "decisions", "notes"];
const GREY_TABS = ["site", "activity"];

export default function ProjectDetail() {
  const { id } = useParams();
  const { t, label } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [newStep, setNewStep] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => (await api.get(`/projects/${id}`)).data,
  });
  const { data: steps = [] } = useQuery({
    queryKey: ["steps", id],
    queryFn: async () => (await api.get(`/projects/${id}/steps`)).data,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => (await api.get("/tasks", { params: { project_id: id } })).data,
  });

  const refetchSteps = () => qc.invalidateQueries({ queryKey: ["steps", id] });
  const refetchProject = () => qc.invalidateQueries({ queryKey: ["project", id] });

  const updateStatus = useMutation({
    mutationFn: (status) => api.put(`/projects/${id}`, { status }),
    onSuccess: () => { refetchProject(); toast.success(t("saved")); },
  });

  const addStep = async (name) => {
    await api.post(`/projects/${id}/steps`, { name });
    refetchSteps(); refetchProject();
  };
  const reorderSteps = async (reordered) => {
    qc.setQueryData(["steps", id], reordered);
    await Promise.all(reordered.map((s, i) => api.put(`/steps/${s.id}`, { order: i })));
    refetchSteps();
  };
  const changeStepStatus = async (sid, status) => {
    await api.put(`/steps/${sid}`, { status });
    refetchSteps(); refetchProject();
  };
  const deleteStep = async (sid) => {
    await api.delete(`/steps/${sid}`);
    refetchSteps(); refetchProject();
  };
  const addTask = async (title) => {
    await api.post("/tasks", { title, project_id: id });
    qc.invalidateQueries({ queryKey: ["project-tasks", id] });
    toast.success(t("created"));
  };
  const archive = async () => {
    await api.delete(`/projects/${id}`);
    toast.success(t("saved"));
    navigate("/projects");
  };

  if (isLoading || !project) return <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <button data-testid="back-btn" onClick={() => navigate("/projects")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-muted)" }}>
        <ArrowLeft size={16} /> {t("projects")}
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            {project.client_name && <span className="inline-flex items-center gap-1"><User size={14} strokeWidth={1.5} />{project.client_name}</span>}
            {project.city && <span className="inline-flex items-center gap-1"><MapPin size={14} strokeWidth={1.5} />{project.city}</span>}
            <span>{label(project.type)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={project.priority} />
          <select data-testid="project-status-select" value={project.status} onChange={(e) => updateStatus.mutate(e.target.value)}
            className="rounded-[8px] border px-3 py-1.5 text-sm outline-none"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <button data-testid="archive-project-btn" onClick={archive} aria-label="archive"
            className="rounded-[8px] border p-2 transition-colors hover:bg-[var(--bg)]" style={{ borderColor: "var(--org-border)" }}>
            <Archive size={16} strokeWidth={1.5} style={{ color: "var(--danger)" }} />
          </button>
        </div>
      </div>

      {/* progress */}
      <div className="mb-6 rounded-[10px] border p-5 shadow-sm" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
        <div className="mb-1.5 flex items-center justify-between text-sm" style={{ color: "var(--ink-muted)" }}>
          <span>{t("progress")}</span><span className="tabular-nums font-medium" style={{ color: "var(--ink)" }}>{project.progress || 0}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--org-border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${project.progress || 0}%`, backgroundColor: "var(--org-accent)" }} />
        </div>
      </div>

      {/* tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b" style={{ borderColor: "var(--org-border)" }}>
        {ACTIVE_TABS.map((tb) => (
          <button key={tb} data-testid={`tab-${tb}`} onClick={() => setTab(tb)}
            className="relative px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: tab === tb ? "var(--org-accent)" : "var(--ink-muted)", borderBottom: tab === tb ? "2px solid var(--org-accent)" : "2px solid transparent" }}>
            {t(tb)}
          </button>
        ))}
        {GREY_TABS.map((tb) => (
          <span key={tb} data-testid={`tab-disabled-${tb}`} title={t("coming_soon")}
            className="cursor-not-allowed px-4 py-2.5 text-sm font-medium opacity-40" style={{ color: "var(--ink)" }}>
            {t(tb)}
          </span>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Info label={t("reference")} value={project.reference} />
          <Info label={t("filter_type")} value={label(project.type)} />
          <Info label={t("client")} value={project.client_name} />
          <Info label={t("city")} value={project.city} />
          <Info label={t("surface")} value={project.surface} />
          <Info label={t("next_step")} value={project.next_step_text} />
          {project.program && <div className="sm:col-span-2"><Info label={t("program")} value={project.program} /></div>}
          {project.description && <div className="sm:col-span-2"><Info label={t("description")} value={project.description} /></div>}
        </div>
      )}

      {tab === "steps" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("steps")} ({steps.length})</h3>
            <button data-testid="add-step-btn" onClick={() => setNewStep((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-sm font-medium" style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
              <Plus size={15} /> {t("add_step")}
            </button>
          </div>
          {newStep && (
            <div className="mb-4">
              <QuickCreateInput testId="step-quick-create" placeholder={t("step_name")} onCreate={async (v) => { await addStep(v); }} />
            </div>
          )}
          {steps.length === 0 ? (
            <EmptyState icon={ListChecks} title={t("steps")} description={t("no_projects_desc")} />
          ) : (
            <StepTimeline steps={steps} onReorder={reorderSteps} onStatusChange={changeStepStatus} onDelete={deleteStep} />
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div>
          <div className="mb-4">
            <QuickCreateInput testId="project-task-quick-create" placeholder={t("quick_add_task")} onCreate={addTask} />
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon={ListChecks} title={t("no_tasks")} description={t("no_tasks_desc")} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {tasks.map((tk) => <TaskCard key={tk.id} task={tk} />)}
            </div>
          )}
        </div>
      )}

      {tab === "documents" && <Documents embeddedProjectId={id} />}
      {tab === "meetings" && <Meetings embeddedProjectId={id} />}
      {tab === "decisions" && <Decisions embeddedProjectId={id} />}
      {tab === "notes" && <Notes embeddedProjectId={id} />}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-[10px] border p-4" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{label}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--ink)" }}>{value || "—"}</p>
    </div>
  );
}
