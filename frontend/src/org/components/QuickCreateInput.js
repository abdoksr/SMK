import { useState } from "react";
import { Plus } from "lucide-react";

export function QuickCreateInput({ onCreate, placeholder, testId = "quick-create-input" }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      await onCreate(v);
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 rounded-[10px] border px-3 py-2 shadow-sm"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}
    >
      <Plus size={18} strokeWidth={1.75} style={{ color: "var(--ink-muted)" }} />
      <input
        data-testid={testId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none"
        style={{ color: "var(--ink)" }}
      />
    </div>
  );
}
