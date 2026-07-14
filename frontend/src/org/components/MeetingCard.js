import { useLang } from "@/org/context/LangContext";
import { CalendarClock, MapPin, Video } from "lucide-react";

export function MeetingCard({ meeting, projectName, onClick }) {
  const { label } = useLang();
  return (
    <div data-testid={`meeting-card-${meeting.id}`} onClick={onClick}
      className="cursor-pointer rounded-[10px] border p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{meeting.title}</h3>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
          style={{ backgroundColor: "var(--progress)1F", color: "var(--progress)" }}>{label(meeting.type)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
        {meeting.date && <span className="inline-flex items-center gap-1"><CalendarClock size={13} strokeWidth={1.5} />{meeting.date}{meeting.time ? ` · ${meeting.time}` : ""}</span>}
        {meeting.location && <span className="inline-flex items-center gap-1"><MapPin size={13} strokeWidth={1.5} />{meeting.location}</span>}
        {meeting.video_link && <span className="inline-flex items-center gap-1"><Video size={13} strokeWidth={1.5} />visio</span>}
        {projectName && <span>{projectName}</span>}
      </div>
    </div>
  );
}
