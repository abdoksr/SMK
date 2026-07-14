import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { MeetingCard } from "@/org/components/MeetingCard";
import { EmptyState } from "@/org/components/EmptyState";
import { Modal, Field, TextArea, SelectField, PrimaryBtn, GhostBtn } from "@/org/components/kit";
import { DocumentDialog } from "@/org/components/DocumentDialog";
import { MEETING_TYPES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { Plus, CalendarClock, CheckSquare, Gavel, Trash2, FileText } from "lucide-react";

export default function Meetings({ embeddedProjectId }) {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data: projects = [] } = useQuery({ queryKey: ["projects-min"], queryFn: async () => (await api.get("/projects")).data });
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", embeddedProjectId || ""],
    queryFn: async () => (await api.get("/meetings", { params: embeddedProjectId ? { project_id: embeddedProjectId } : {} })).data,
  });
  const projectName = (id) => projects.find((p) => p.id === id)?.name;
  const refetch = () => qc.invalidateQueries({ queryKey: ["meetings"] });

  return (
    <div className={embeddedProjectId ? "" : "mx-auto max-w-4xl"}>
      <div className={`mb-6 flex flex-wrap items-center ${embeddedProjectId ? "justify-end" : "justify-between"} gap-3`}>
        {!embeddedProjectId && <h1 className="text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("meetings")}</h1>}
        <PrimaryBtn testId="new-meeting-btn" onClick={() => setOpen(true)}><Plus size={16} /> {t("new_meeting")}</PrimaryBtn>
      </div>

      {isLoading ? <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
        : meetings.length === 0 ? <EmptyState icon={CalendarClock} title={t("no_meetings")} description={t("no_meetings_desc")} />
        : (
          <div className="flex flex-col gap-3">
            {meetings.map((m) => <MeetingCard key={m.id} meeting={m} projectName={projectName(m.project_id)} onClick={() => setDetailId(m.id)} />)}
          </div>
        )}

      {open && <MeetingDialog projects={projects} defaultProject={embeddedProjectId} onClose={() => setOpen(false)}
        onCreated={() => { refetch(); setOpen(false); }} />}
      {detailId && <MeetingDetail id={detailId} projectName={projectName} onClose={() => setDetailId(null)} onChanged={refetch} />}
    </div>
  );
}

function MeetingDialog({ projects, defaultProject, onClose, onCreated }) {
  const { t, label } = useLang();
  const [form, setForm] = useState({ title: "", project_id: defaultProject || "", type: "reunion_client", date: "", time: "", location: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api.post("/meetings", { ...form, project_id: form.project_id || null }),
    onSuccess: () => { toast.success(t("created")); onCreated(); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });
  return (
    <Modal open onClose={onClose} title={t("new_meeting")} testId="meeting-dialog"
      footer={<><GhostBtn testId="cancel-meeting" onClick={onClose}>{t("cancel")}</GhostBtn>
        <PrimaryBtn testId="submit-meeting" disabled={!form.title.trim() || mut.isPending} onClick={() => mut.mutate()}>{t("create")}</PrimaryBtn></>}>
      <Field label={t("title")} testId="meeting-title-input" value={form.title} onChange={set("title")} autoFocus />
      <SelectField label={t("type")} testId="meeting-type-select" value={form.type} onChange={set("type")}
        options={MEETING_TYPES.map((c) => ({ value: c, label: label(c) }))} />
      <SelectField label={t("project")} testId="meeting-project-select" value={form.project_id} onChange={set("project_id")}
        options={[{ value: "", label: t("unassigned") }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("date")} testId="meeting-date-input" type="date" value={form.date} onChange={set("date")} />
        <Field label={t("time")} testId="meeting-time-input" type="time" value={form.time} onChange={set("time")} />
      </div>
      <Field label={t("location")} testId="meeting-location-input" value={form.location} onChange={set("location")} />
    </Modal>
  );
}

function MeetingDetail({ id, projectName, onClose, onChanged }) {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [newAction, setNewAction] = useState("");
  const [showDoc, setShowDoc] = useState(false);
  const { data: meeting } = useQuery({ queryKey: ["meeting", id], queryFn: async () => (await api.get(`/meetings/${id}`)).data });
  const { data: allDocs = [] } = useQuery({ queryKey: ["documents"], queryFn: async () => (await api.get("/documents")).data });
  const refetch = () => { qc.invalidateQueries({ queryKey: ["meeting", id] }); onChanged(); };

  const linkedDocs = allDocs.filter((d) => (meeting?.document_ids || []).includes(d.id));

  const onDocCreated = async (doc) => {
    const ids = [...((meeting && meeting.document_ids) || []), doc.id];
    await api.put(`/meetings/${id}`, { document_ids: ids });
    qc.invalidateQueries({ queryKey: ["documents"] });
    refetch();
    setShowDoc(false);
  };

  const save = useMutation({ mutationFn: (patch) => api.put(`/meetings/${id}`, patch), onSuccess: refetch });
  const addAction = async () => {
    if (!newAction.trim()) return;
    const actions = [...(meeting.actions || []), { text: newAction.trim(), converted_to_task_id: null }];
    await api.put(`/meetings/${id}`, { actions });
    setNewAction(""); refetch();
  };
  const toTask = useMutation({
    mutationFn: (index) => api.post(`/meetings/${id}/actions/${index}/convert-to-task`),
    onSuccess: () => { toast.success(t("convert_to_task") + " ✓"); qc.invalidateQueries({ queryKey: ["tasks"] }); refetch(); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });
  const toDecision = useMutation({
    mutationFn: () => api.post(`/meetings/${id}/convert-decision`),
    onSuccess: () => { toast.success(t("save_as_decision") + " ✓"); qc.invalidateQueries({ queryKey: ["decisions"] }); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });

  if (!meeting) return null;
  return (
    <Modal open onClose={onClose} title={meeting.title} testId="meeting-detail"
      footer={<GhostBtn testId="close-meeting-detail" onClick={onClose}>{t("close")}</GhostBtn>}>
      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        <span>{label(meeting.type)}</span>{meeting.date && <span>· {meeting.date} {meeting.time}</span>}
        {projectName(meeting.project_id) && <span>· {projectName(meeting.project_id)}</span>}
      </div>

      <TextArea label={t("agenda")} testId="meeting-agenda" value={meeting.agenda} onChange={(v) => save.mutate({ agenda: v })} />
      <TextArea label={t("notes")} testId="meeting-notes" value={meeting.notes} onChange={(v) => save.mutate({ notes: v })} />

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("decisions_field")}</label>
        <TextArea testId="meeting-decisions-text" value={meeting.decisions_text} onChange={(v) => save.mutate({ decisions_text: v })} />
        <div className="mt-2">
          <PrimaryBtn testId="save-decision-btn" disabled={!meeting.decisions_text || toDecision.isPending} onClick={() => toDecision.mutate()}>
            <Gavel size={15} /> {t("save_as_decision")}
          </PrimaryBtn>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("linked_documents")}</label>
        <div className="flex flex-col gap-2">
          {linkedDocs.map((d) => (
            <div key={d.id} data-testid={`meeting-doc-${d.id}`} className="flex items-center gap-2 rounded-[8px] border p-2.5" style={{ borderColor: "var(--org-border)" }}>
              <FileText size={15} strokeWidth={1.5} style={{ color: "var(--ink-muted)" }} />
              <span className="flex-1 truncate text-sm" style={{ color: "var(--ink)" }}>{d.title}</span>
              {d.version && <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{d.version}</span>}
            </div>
          ))}
        </div>
        <div className="mt-2">
          <GhostBtn testId="add-document-to-meeting" onClick={() => setShowDoc(true)}><Plus size={14} /> {t("add_document")}</GhostBtn>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("actions")}</label>
        <div className="flex flex-col gap-2">
          {(meeting.actions || []).map((a, i) => (
            <div key={i} data-testid={`meeting-action-${i}`} className="flex items-center gap-2 rounded-[8px] border p-2.5" style={{ borderColor: "var(--org-border)" }}>
              <span className="flex-1 text-sm" style={{ color: "var(--ink)" }}>{a.text}</span>
              {a.converted_to_task_id ? (
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--success)" }}><CheckSquare size={13} /> ✓</span>
              ) : (
                <button data-testid={`action-to-task-${i}`} disabled={toTask.isPending} onClick={() => toTask.mutate(i)}
                  className="inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[11px] font-medium hover:bg-[var(--bg)] disabled:opacity-50" style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
                  <CheckSquare size={13} strokeWidth={1.5} /> {t("convert_to_task")}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input data-testid="meeting-new-action" value={newAction} onChange={(e) => setNewAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAction()} placeholder={t("add_action")}
            className="flex-1 rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }} />
          <GhostBtn testId="add-action-btn" onClick={addAction}><Plus size={14} /></GhostBtn>
        </div>
      </div>

      {showDoc && <DocumentDialog defaultProject={meeting.project_id} onClose={() => setShowDoc(false)} onCreated={onDocCreated} />}
    </Modal>
  );
}
