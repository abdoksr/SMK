import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { QuickCreateInput } from "@/org/components/QuickCreateInput";
import { TaskCard } from "@/org/components/TaskCard";
import { KanbanBoard } from "@/org/components/KanbanBoard";
import { MonthCalendar } from "@/org/components/MonthCalendar";
import { EmptyState } from "@/org/components/EmptyState";
import { TASK_STATUSES, PRIORITIES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckSquare } from "lucide-react";

const VIEWS = ["list", "kanban", "calendar", "today", "week", "overdue"];
const KANBAN_COLS = TASK_STATUSES.map((s) => ({ id: s }));

export default function Tasks() {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || (params.get("priority") ? "list" : "list");
  const priority = params.get("priority") || "";
  const projectId = params.get("project_id") || "";

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next);
  };
  const setView = (v) => {
    const next = new URLSearchParams(params);
    if (["today", "week", "overdue"].includes(v)) next.set("view", v);
    else { next.set("view", v); }
    setParams(next);
  };

  const serverView = ["today", "week", "overdue"].includes(view) ? view : undefined;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-min"],
    queryFn: async () => (await api.get("/projects")).data,
  });
  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", serverView, priority, projectId],
    queryFn: async () => {
      const q = {};
      if (serverView) q.view = serverView;
      if (priority) q.priority = priority;
      if (projectId) q.project_id = projectId;
      return (await api.get("/tasks", { params: q })).data;
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const createTask = async (title) => {
    await api.post("/tasks", { title, project_id: projectId || null });
    refetch();
    toast.success(t("created"));
  };

  const moveStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/tasks/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      const keys = ["tasks", serverView, priority, projectId];
      await qc.cancelQueries({ queryKey: keys });
      const prev = qc.getQueryData(keys);
      qc.setQueryData(keys, (old = []) => old.map((tk) => (tk.id === id ? { ...tk, status } : tk)));
      return { prev, keys };
    },
    onError: (e, _v, ctx) => { if (ctx) qc.setQueryData(ctx.keys, ctx.prev); toast.error(apiError(e.response?.data?.detail)); },
    onSettled: () => refetch(),
  });

  const changeDate = useMutation({
    mutationFn: ({ id, due_date }) => api.put(`/tasks/${id}`, { due_date }),
    onSuccess: () => { refetch(); toast.success(t("saved")); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("tasks")}</h1>

      <div className="mb-5">
        <QuickCreateInput testId="task-quick-create" placeholder={t("quick_add_task")} onCreate={createTask} />
      </div>

      {/* view tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button key={v} data-testid={`view-${v}`} onClick={() => setView(v)}
            className="rounded-[8px] px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: view === v ? "var(--org-accent)" : "var(--surface)",
              color: view === v ? "#fff" : "var(--ink)",
              border: "1px solid var(--org-border)",
            }}>
            {t(`view_${v}`)}
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select data-testid="filter-task-project" value={projectId} onChange={(e) => setParam("project_id", e.target.value)}
          className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
          <option value="">{t("all_projects")}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select data-testid="filter-task-priority" value={priority} onChange={(e) => setParam("priority", e.target.value)}
          className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
          <option value="">{t("all_priorities")}</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
      ) : view === "kanban" ? (
        <KanbanBoard
          columns={KANBAN_COLS}
          items={tasks}
          getColumn={(tk) => tk.status}
          onMove={(id, status) => moveStatus.mutate({ id, status })}
          renderCard={(tk) => <TaskCard task={tk} projectName={projectName(tk.project_id)} compact showStatus={false} />}
        />
      ) : view === "calendar" ? (
        <MonthCalendar tasks={tasks} onChangeDate={(id, due_date) => changeDate.mutate({ id, due_date })} />
      ) : tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title={t("no_tasks")} description={t("no_tasks_desc")} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map((tk) => <TaskCard key={tk.id} task={tk} projectName={projectName(tk.project_id)} />)}
        </div>
      )}
    </div>
  );
}
