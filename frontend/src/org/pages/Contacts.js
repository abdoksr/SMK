import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { ContactCard } from "@/org/components/ContactCard";
import { PipelineBoard } from "@/org/components/PipelineBoard";
import { EmptyState } from "@/org/components/EmptyState";
import { StatusBadge } from "@/org/components/StatusBadge";
import { Modal, Field, TextArea, SelectField, PrimaryBtn, GhostBtn } from "@/org/components/kit";
import { CONTACT_TYPES, CONTACT_STATUSES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { Plus, Users, Phone, Mail, MapPin, CalendarClock, Pencil } from "lucide-react";

export default function Contacts() {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [view, setView] = useState("list");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", type, status],
    queryFn: async () => {
      const q = {};
      if (type) q.type = type;
      if (status) q.status = status;
      return (await api.get("/contacts", { params: q })).data;
    },
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["contacts"] });
  const move = useMutation({
    mutationFn: ({ id, status }) => api.put(`/contacts/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["contacts", type, ""] });
    },
    onSuccess: () => { refetch(); toast.success(t("saved")); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("contacts")}</h1>
        <PrimaryBtn testId="new-contact-btn" onClick={() => setOpen(true)}><Plus size={16} /> {t("new_contact")}</PrimaryBtn>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[8px] border p-0.5" style={{ borderColor: "var(--org-border)" }}>
          {["list", "pipeline"].map((v) => (
            <button key={v} data-testid={`contacts-view-${v}`} onClick={() => setView(v)}
              className="rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: view === v ? "var(--org-accent)" : "transparent", color: view === v ? "#fff" : "var(--ink-muted)" }}>
              {v === "list" ? t("list_view") : t("pipeline_view")}
            </button>
          ))}
        </div>
        <select data-testid="filter-contact-type" value={type} onChange={(e) => setType(e.target.value)}
          className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
          <option value="">{t("all_types")}</option>
          {CONTACT_TYPES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
        {view === "list" && (
          <select data-testid="filter-contact-status" value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
            <option value="">{t("all_statuses")}</option>
            {CONTACT_STATUSES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
        )}
      </div>

      {isLoading ? <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
        : contacts.length === 0 ? <EmptyState icon={Users} title={t("no_contacts")} description={t("no_contacts_desc")} />
        : view === "pipeline" ? (
          <PipelineBoard statuses={CONTACT_STATUSES} items={contacts}
            onMove={(id, status) => move.mutate({ id, status })}
            renderCard={(c) => (
              <div onClick={() => setDetailId(c.id)}>
                <ContactCard contact={c} onClick={() => setDetailId(c.id)} />
              </div>
            )} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((c) => <ContactCard key={c.id} contact={c} onClick={() => setDetailId(c.id)} />)}
          </div>
        )}

      {open && <ContactDialog onClose={() => setOpen(false)} onCreated={() => { refetch(); setOpen(false); }} />}
      {detailId && <ContactDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function ContactDialog({ onClose, onCreated }) {
  const { t, label } = useLang();
  const [form, setForm] = useState({ name: "", organization: "", type: "prospect", status: "nouveau", phone: "", email: "", city: "", last_contact_date: "", next_action_text: "", next_action_date: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: () => api.post("/contacts", form),
    onSuccess: () => { toast.success(t("created")); onCreated(); },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });
  return (
    <Modal open onClose={onClose} title={t("new_contact")} testId="contact-dialog"
      footer={<><GhostBtn testId="cancel-contact" onClick={onClose}>{t("cancel")}</GhostBtn>
        <PrimaryBtn testId="submit-contact" disabled={!form.name.trim() || mut.isPending} onClick={() => mut.mutate()}>{t("create")}</PrimaryBtn></>}>
      <Field label={t("title")} testId="contact-name-input" value={form.name} onChange={set("name")} autoFocus placeholder="Nom" />
      <Field label={t("organization")} testId="contact-org-input" value={form.organization} onChange={set("organization")} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label={t("type")} testId="contact-type-select" value={form.type} onChange={set("type")}
          options={CONTACT_TYPES.map((c) => ({ value: c, label: label(c) }))} />
        <SelectField label={t("status")} testId="contact-status-select" value={form.status} onChange={set("status")}
          options={CONTACT_STATUSES.map((c) => ({ value: c, label: label(c) }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("phone")} testId="contact-phone-input" value={form.phone} onChange={set("phone")} />
        <Field label={t("email")} testId="contact-email-input" value={form.email} onChange={set("email")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("city")} testId="contact-city-input" value={form.city} onChange={set("city")} />
        <Field label={t("last_contact")} testId="contact-last-contact-input" type="date" value={form.last_contact_date} onChange={set("last_contact_date")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("next_action")} testId="contact-action-input" value={form.next_action_text} onChange={set("next_action_text")} />
        <Field label={t("next_action_date")} testId="contact-action-date-input" type="date" value={form.next_action_date} onChange={set("next_action_date")} />
      </div>
    </Modal>
  );
}

function ContactDetail({ id, onClose }) {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const { data } = useQuery({ queryKey: ["contact", id], queryFn: async () => (await api.get(`/contacts/${id}`)).data });

  const startEdit = (c) => {
    setForm({
      name: c.name || "", organization: c.organization || "", type: c.type || "prospect",
      status: c.status || "nouveau", phone: c.phone || "", email: c.email || "", city: c.city || "",
      last_contact_date: c.last_contact_date || "", next_action_text: c.next_action_text || "",
      next_action_date: c.next_action_date || "",
    });
    setEditing(true);
  };
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => api.put(`/contacts/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("saved")); setEditing(false);
    },
    onError: (e) => toast.error(apiError(e.response?.data?.detail)),
  });

  if (!data) return null;
  const c = data.contact;

  if (editing && form) {
    return (
      <Modal open onClose={onClose} title={c.name} testId="contact-detail-edit"
        footer={<><GhostBtn testId="cancel-contact-edit" onClick={() => setEditing(false)}>{t("cancel")}</GhostBtn>
          <PrimaryBtn testId="save-contact-edit" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>{t("save")}</PrimaryBtn></>}>
        <Field label={t("title")} testId="edit-contact-name" value={form.name} onChange={set("name")} />
        <Field label={t("organization")} testId="edit-contact-org" value={form.organization} onChange={set("organization")} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label={t("type")} testId="edit-contact-type" value={form.type} onChange={set("type")}
            options={CONTACT_TYPES.map((x) => ({ value: x, label: label(x) }))} />
          <SelectField label={t("status")} testId="edit-contact-status" value={form.status} onChange={set("status")}
            options={CONTACT_STATUSES.map((x) => ({ value: x, label: label(x) }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("phone")} testId="edit-contact-phone" value={form.phone} onChange={set("phone")} />
          <Field label={t("email")} testId="edit-contact-email" value={form.email} onChange={set("email")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("city")} testId="edit-contact-city" value={form.city} onChange={set("city")} />
          <Field label={t("last_contact")} testId="edit-contact-last-contact" type="date" value={form.last_contact_date} onChange={set("last_contact_date")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("next_action")} testId="edit-contact-action" value={form.next_action_text} onChange={set("next_action_text")} />
          <Field label={t("next_action_date")} testId="edit-contact-action-date" type="date" value={form.next_action_date} onChange={set("next_action_date")} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={c.name} testId="contact-detail"
      footer={<><GhostBtn testId="close-contact-detail" onClick={onClose}>{t("close")}</GhostBtn>
        <PrimaryBtn testId="edit-contact-btn" onClick={() => startEdit(c)}><Pencil size={15} /> {t("edit")}</PrimaryBtn></>}>
      <div className="flex items-center gap-2"><StatusBadge status={c.status} /><span className="text-xs" style={{ color: "var(--ink-muted)" }}>{label(c.type)}</span></div>
      {c.next_action_text && (
        <div data-testid="contact-next-action" className="flex items-center gap-2 rounded-[8px] p-3" style={{ backgroundColor: "var(--bg)" }}>
          <CalendarClock size={15} style={{ color: "var(--org-accent)" }} />
          <span className="text-sm" style={{ color: "var(--ink)" }}>{c.next_action_text}</span>
          {c.next_action_date && <span className="ml-auto text-xs tabular-nums" style={{ color: "var(--ink-muted)" }}>{c.next_action_date}</span>}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 text-sm" style={{ color: "var(--ink)" }}>
        {c.organization && <p>{c.organization}</p>}
        {c.phone && <p className="inline-flex items-center gap-2"><Phone size={14} strokeWidth={1.5} />{c.phone}</p>}
        {c.email && <p className="inline-flex items-center gap-2"><Mail size={14} strokeWidth={1.5} />{c.email}</p>}
        {c.city && <p className="inline-flex items-center gap-2"><MapPin size={14} strokeWidth={1.5} />{c.city}</p>}
        {c.last_contact_date && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{t("last_contact")}: {c.last_contact_date}</p>}
      </div>

      <Section title={t("related_projects")} items={data.projects.map((p) => p.name)} />
      <Section title={t("meetings")} items={data.meetings.map((m) => `${m.title} · ${m.date || ""}`)} />
      <Section title={t("notes")} items={data.notes.map((n) => n.title || n.content)} />
      <Section title={t("documents")} items={data.documents.map((d) => d.title)} />
    </Modal>
  );
}

function Section({ title, items }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{title} ({items.length})</p>
      {items.length === 0 ? <p className="text-sm" style={{ color: "var(--ink-muted)" }}>—</p>
        : <ul className="flex flex-col gap-1">{items.map((i, idx) => <li key={idx} className="text-sm" style={{ color: "var(--ink)" }}>· {i}</li>)}</ul>}
    </div>
  );
}
