import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { Modal, Field, TextArea, SelectField, PrimaryBtn, GhostBtn } from "@/org/components/kit";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "@/org/lib/i18n";
import { toast } from "sonner";

// Reusable document creation form — used by the Documents page and the Meeting detail.
export function DocumentDialog({ defaultProject, onClose, onCreated }) {
  const { t, label } = useLang();
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-min"],
    queryFn: async () => (await api.get("/projects")).data,
  });
  const [form, setForm] = useState({
    title: "", project_id: defaultProject || "", category: "plan",
    version: "", status: "brouillon", external_link: "", comment: "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => api.post("/documents", { ...form, project_id: form.project_id || null }),
    onSuccess: (res) => { toast.success(t("created")); onCreated(res.data); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });

  return (
    <Modal open onClose={onClose} title={t("new_document")} testId="document-dialog"
      footer={<><GhostBtn testId="cancel-document" onClick={onClose}>{t("cancel")}</GhostBtn>
        <PrimaryBtn testId="submit-document" disabled={!form.title.trim() || mut.isPending} onClick={() => mut.mutate()}>{t("create")}</PrimaryBtn></>}>
      <Field label={t("title")} testId="document-title-input" value={form.title} onChange={set("title")} autoFocus />
      <SelectField label={t("project")} testId="document-project-select" value={form.project_id} onChange={set("project_id")}
        options={[{ value: "", label: t("unassigned") }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
      <SelectField label={t("category")} testId="document-category-select" value={form.category} onChange={set("category")}
        options={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("version")} testId="document-version-input" value={form.version} onChange={set("version")} placeholder="V01" />
        <SelectField label={t("status")} testId="document-status-select" value={form.status} onChange={set("status")}
          options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: label(s) }))} />
      </div>
      <Field label={t("external_link")} testId="document-link-input" value={form.external_link} onChange={set("external_link")} placeholder="https://drive.google.com/…" />
      <TextArea label={t("comment")} testId="document-comment-input" value={form.comment} onChange={set("comment")} />
    </Modal>
  );
}
