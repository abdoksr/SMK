import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, footer, testId = "modal" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid={testId}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[10px] border p-6 shadow-lg"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{title}</h2>
          <button data-testid="modal-close" onClick={onClose} aria-label="close"><X size={18} style={{ color: "var(--ink-muted)" }} /></button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide";
const fieldCls = "w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-[var(--org-accent)]";
const fieldStyle = { backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" };

export function Field({ label, value, onChange, testId, type = "text", placeholder, autoFocus }) {
  return (
    <div>
      {label && <label className={labelCls} style={{ color: "var(--ink-muted)" }}>{label}</label>}
      <input data-testid={testId} type={type} value={value || ""} placeholder={placeholder} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} className={fieldCls} style={fieldStyle} />
    </div>
  );
}

export function TextArea({ label, value, onChange, testId, rows = 3, placeholder }) {
  return (
    <div>
      {label && <label className={labelCls} style={{ color: "var(--ink-muted)" }}>{label}</label>}
      <textarea data-testid={testId} rows={rows} value={value || ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} className={fieldCls} style={fieldStyle} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, testId }) {
  return (
    <div>
      {label && <label className={labelCls} style={{ color: "var(--ink-muted)" }}>{label}</label>}
      <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} style={fieldStyle}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function PrimaryBtn({ children, testId, onClick, disabled, type = "button" }) {
  return (
    <button data-testid={testId} type={type} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
      style={{ backgroundColor: "var(--org-accent)" }}>
      {children}
    </button>
  );
}

export function GhostBtn({ children, testId, onClick }) {
  return (
    <button data-testid={testId} onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg)]"
      style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
      {children}
    </button>
  );
}
