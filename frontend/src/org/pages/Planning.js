import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { MonthCalendar } from "@/org/components/MonthCalendar";
import { toast } from "sonner";

export default function Planning() {
  const { t } = useLang();
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["planning-tasks"],
    queryFn: async () => (await api.get("/tasks")).data,
  });

  const changeDate = useMutation({
    mutationFn: ({ id, due_date }) => api.put(`/tasks/${id}`, { due_date }),
    onMutate: async ({ id, due_date }) => {
      await qc.cancelQueries({ queryKey: ["planning-tasks"] });
      const prev = qc.getQueryData(["planning-tasks"]);
      qc.setQueryData(["planning-tasks"], (old = []) => old.map((tk) => (tk.id === id ? { ...tk, due_date } : tk)));
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx) qc.setQueryData(["planning-tasks"], ctx.prev); toast.error(apiError(e.response?.data?.detail)); },
    onSuccess: () => toast.success(t("saved")),
    onSettled: () => qc.invalidateQueries({ queryKey: ["planning-tasks"] }),
  });

  const dated = tasks.filter((tk) => tk.due_date && !["annulee"].includes(tk.status));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-[28px] font-semibold md:text-[32px]" style={{ color: "var(--ink)" }}>{t("planning")}</h1>
      {isLoading ? (
        <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
      ) : (
        <MonthCalendar tasks={dated} onChangeDate={(id, due_date) => changeDate.mutate({ id, due_date })} />
      )}
    </div>
  );
}
