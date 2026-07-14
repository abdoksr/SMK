export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center rounded-[10px] border border-dashed py-16 px-6 text-center"
      style={{ borderColor: "var(--org-border)" }}
    >
      {Icon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <Icon size={26} strokeWidth={1.5} style={{ color: "var(--ink-muted)" }} />
        </div>
      )}
      <h3 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--ink-muted)" }}>{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
