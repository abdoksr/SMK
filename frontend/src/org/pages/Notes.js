import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { NoteCard } from "@/org/components/NoteCard";
import { EmptyState } from "@/org/components/EmptyState";
import { QuickCreateInput } from "@/org/components/QuickCreateInput";
import { NOTE_CATEGORIES } from "@/org/lib/i18n";
import { toast } from "sonner";
import { StickyNote, Pin } from "lucide-react";

export default function Notes({ embeddedProjectId }) {
  const { t, label } = useLang();
  const qc = useQueryClient();
  const [category, setCategory] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", embeddedProjectId || "", category],
    queryFn: async () => {
      const q = {};
      if (embeddedProjectId) q.project_id = embeddedProjectId;
      if (category) q.category = category;
      return (await api.get("/notes", { params: q })).data;
    },
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["notes"] });

  const create = async (content) => {
    await api.post("/notes", { content, category: "idee", project_id: embeddedProjectId || null });
    refetch(); toast.success(t("created"));
  };
  const togglePin = async (note) => { await api.put(`/notes/${note.id}`, { pinned: !note.pinned }); refetch(); };
  const del = async (id) => { await api.delete(`/notes/${id}`); refetch(); toast.success(t("deleted")); };
  const toTask = async (note) => {
    await api.post(`/notes/${note.id}/convert-to-task`);
    qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success(t("convert_to_task") + " ✓");
  };
  const toDecision = async (note) => {
    await api.post(`/notes/${note.id}/convert-to-decision`);
    qc.invalidateQueries({ queryKey: ["decisions"] }); toast.success(t("convert_to_decision") + " ✓");
  };

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  const cardProps = { onTogglePin: togglePin, onConvertTask: toTask, onConvertDecision: toDecision, onDelete: del };

  return (
    <div className={embeddedProjectId ? "" : "mx-auto max-w-4xl"}>
      {!embeddedProjectId && <h1 className="mb-6 text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("notes")}</h1>}

      <div className="mb-5"><QuickCreateInput testId="note-quick-create" placeholder={t("quick_add_note")} onCreate={create} /></div>

      <div className="mb-6">
        <select data-testid="filter-note-category" value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-[8px] border px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}>
          <option value="">{t("all_categories")}</option>
          {NOTE_CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
      </div>

      {isLoading ? <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
        : notes.length === 0 ? <EmptyState icon={StickyNote} title={t("no_notes")} description={t("no_notes_desc")} />
        : (
          <div className="flex flex-col gap-6">
            {pinned.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
                  <Pin size={13} style={{ color: "var(--org-accent)" }} /> {t("pinned")}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pinned.map((n) => <NoteCard key={n.id} note={n} {...cardProps} />)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rest.map((n) => <NoteCard key={n.id} note={n} {...cardProps} />)}
            </div>
          </div>
        )}
    </div>
  );
}
