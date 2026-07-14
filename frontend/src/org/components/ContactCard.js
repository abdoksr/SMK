import { StatusBadge } from "@/org/components/StatusBadge";
import { useLang } from "@/org/context/LangContext";
import { Building2, Phone, Mail, MapPin, CalendarClock } from "lucide-react";

export function ContactCard({ contact, onClick }) {
  const { t, label } = useLang();
  return (
    <div data-testid={`contact-card-${contact.id}`} onClick={onClick}
      className="cursor-pointer rounded-[10px] border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold" style={{ color: "var(--ink)" }}>{contact.name}</h3>
          {contact.organization && <p className="truncate text-xs" style={{ color: "var(--ink-muted)" }}>{contact.organization}</p>}
        </div>
        <StatusBadge status={contact.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
        <span className="inline-flex items-center gap-1"><Building2 size={13} strokeWidth={1.5} />{label(contact.type)}</span>
        {contact.phone && <span className="inline-flex items-center gap-1"><Phone size={13} strokeWidth={1.5} />{contact.phone}</span>}
        {contact.city && <span className="inline-flex items-center gap-1"><MapPin size={13} strokeWidth={1.5} />{contact.city}</span>}
      </div>
      {contact.next_action_text && (
        <div className="mt-3 flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs" style={{ backgroundColor: "var(--bg)", color: "var(--ink)" }}>
          <CalendarClock size={13} strokeWidth={1.5} style={{ color: "var(--org-accent)" }} />
          <span className="truncate">{contact.next_action_text}</span>
          {contact.next_action_date && <span className="ml-auto tabular-nums" style={{ color: "var(--ink-muted)" }}>{contact.next_action_date}</span>}
        </div>
      )}
    </div>
  );
}
