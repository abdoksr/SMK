import { motion } from "framer-motion";

export function DashboardCard({ testId, icon: Icon, label, value, hint, accent, onClick, delay = 0 }) {
  const color = accent ? `var(--${accent})` : "var(--org-accent)";
  return (
    <motion.button
      data-testid={testId}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -3 }}
      className="group flex flex-col items-start rounded-[10px] border p-6 text-left shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `${color}1F` }}>
        <Icon size={20} strokeWidth={1.75} style={{ color }} />
      </div>
      <span className="text-4xl font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
        {value}
      </span>
      <span className="mt-1 text-sm font-medium" style={{ color: "var(--ink)" }}>{label}</span>
      {hint && <span className="mt-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>{hint}</span>}
    </motion.button>
  );
}
