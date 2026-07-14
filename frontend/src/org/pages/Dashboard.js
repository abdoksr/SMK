import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/org/lib/api";
import { useLang } from "@/org/context/LangContext";
import { useAuth } from "@/org/context/AuthContext";
import { DashboardCard } from "@/org/components/DashboardCard";
import { CalendarCheck, AlertTriangle, Flame, FolderKanban, Clock,
  FileSearch, FileClock, PhoneCall, CalendarClock, Gavel, Pin } from "lucide-react";

export default function Dashboard() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });

  const cards = [
    { key: "today_tasks", icon: CalendarCheck, accent: "progress", value: data?.today_tasks ?? 0, to: "/tasks?view=today" },
    { key: "overdue_tasks", icon: Clock, accent: "danger", value: data?.overdue_tasks ?? 0, to: "/tasks?view=overdue" },
    { key: "urgent_tasks", icon: Flame, accent: "warning", value: data?.urgent_tasks ?? 0, to: "/tasks?priority=urgente" },
    { key: "active_projects", icon: FolderKanban, accent: "success", value: data?.active_projects ?? 0, to: "/projects?status=en_cours" },
    { key: "stale_projects", icon: AlertTriangle, accent: "neutral", value: data?.stale_projects ?? 0, to: "/projects", hint: t("stale_hint") },
    { key: "clients_a_relancer", icon: PhoneCall, accent: "danger", value: data?.clients_a_relancer ?? 0, to: "/contacts" },
    { key: "prochains_rendez_vous", icon: CalendarClock, accent: "progress", value: data?.prochains_rendez_vous ?? 0, to: "/meetings" },
    { key: "documents_a_verifier", icon: FileSearch, accent: "warning", value: data?.documents_a_verifier ?? 0, to: "/documents" },
    { key: "documents_a_preparer", icon: FileClock, accent: "neutral", value: data?.documents_a_preparer ?? 0, to: "/documents" },
    { key: "decisions_recentes", icon: Gavel, accent: "success", value: data?.decisions_recentes ?? 0, to: "/decisions" },
    { key: "notes_importantes", icon: Pin, accent: "accent", value: data?.notes_importantes ?? 0, to: "/notes" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold leading-tight md:text-[32px]" style={{ color: "var(--ink)" }}>
          {t("good_morning")}, {user?.name?.split(" ")[0] || ""}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>{t("dashboard_subtitle")}</p>
      </div>

      {isLoading ? (
        <p style={{ color: "var(--ink-muted)" }}>{t("loading")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <DashboardCard
              key={c.key}
              testId={`dashboard-card-${c.key}`}
              icon={c.icon}
              accent={c.accent}
              value={c.value}
              label={t(c.key)}
              hint={c.hint}
              delay={i * 0.05}
              onClick={() => navigate(c.to)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
