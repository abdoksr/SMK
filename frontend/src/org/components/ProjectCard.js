import { motion } from "framer-motion";
import { StatusBadge } from "@/org/components/StatusBadge";
import { PriorityBadge } from "@/org/components/PriorityBadge";
import { useLang } from "@/org/context/LangContext";
import { MapPin, User } from "lucide-react";

export function ProjectCard({ project, onClick, delay = 0 }) {
  const { t, label } = useLang();
  const progress = project.progress || 0;
  return (
    <motion.div
      data-testid={`project-card-${project.id}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -3 }}
      className="cursor-pointer rounded-[10px] border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold" style={{ color: "var(--ink)" }}>
            {project.name}
          </h3>
          {project.reference && (
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
              {project.reference}
            </span>
          )}
        </div>
        <PriorityBadge priority={project.priority} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
        {project.client_name && (
          <span className="inline-flex items-center gap-1"><User size={13} strokeWidth={1.5} />{project.client_name}</span>
        )}
        {project.city && (
          <span className="inline-flex items-center gap-1"><MapPin size={13} strokeWidth={1.5} />{project.city}</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={project.status} />
        <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{label(project.type)}</span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs" style={{ color: "var(--ink-muted)" }}>
          <span>{t("progress")}</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--org-border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: "var(--org-accent)" }} />
        </div>
      </div>
    </motion.div>
  );
}
