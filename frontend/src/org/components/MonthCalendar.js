import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks,
  startOfWeek as sow, endOfWeek as eow,
} from "date-fns";
import { fr as frLocale, enUS } from "date-fns/locale";
import { useLang } from "@/org/context/LangContext";
import { PriorityBadge } from "@/org/components/PriorityBadge";
import { ChevronLeft, ChevronRight } from "lucide-react";

// tasks with due_date -> placed on day cells. Drag task to another day => onChangeDate(taskId, 'YYYY-MM-DD')
export function MonthCalendar({ tasks, onChangeDate, onTaskClick }) {
  const { t, lang } = useLang();
  const locale = lang === "fr" ? frLocale : enUS;
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState("month");

  let start, end;
  if (mode === "month") {
    start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  } else {
    start = sow(cursor, { weekStartsOn: 1 });
    end = eow(cursor, { weekStartsOn: 1 });
  }
  const days = eachDayOfInterval({ start, end });

  const tasksForDay = (day) =>
    tasks.filter((tk) => tk.due_date && isSameDay(new Date(tk.due_date), day));

  const prev = () => setCursor(mode === "month" ? subMonths(cursor, 1) : subWeeks(cursor, 1));
  const next = () => setCursor(mode === "month" ? addMonths(cursor, 1) : addWeeks(cursor, 1));

  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    onChangeDate(draggableId, destination.droppableId);
  };

  const weekDays = eachDayOfInterval({ start: sow(new Date(), { weekStartsOn: 1 }), end: eow(new Date(), { weekStartsOn: 1 }) });

  return (
    <div className="rounded-[10px] border shadow-sm" style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--org-border)" }}>
        <div className="flex items-center gap-2">
          <button data-testid="cal-prev" onClick={prev} className="rounded-md p-1.5 hover:bg-[var(--bg)]" aria-label="prev"><ChevronLeft size={18} style={{ color: "var(--ink)" }} /></button>
          <span className="min-w-[150px] text-center text-sm font-semibold capitalize" style={{ color: "var(--ink)" }}>
            {format(cursor, mode === "month" ? "MMMM yyyy" : "'S' w, MMM yyyy", { locale })}
          </span>
          <button data-testid="cal-next" onClick={next} className="rounded-md p-1.5 hover:bg-[var(--bg)]" aria-label="next"><ChevronRight size={18} style={{ color: "var(--ink)" }} /></button>
        </div>
        <div className="flex gap-1 rounded-[8px] border p-0.5" style={{ borderColor: "var(--org-border)" }}>
          {["week", "month"].map((m) => (
            <button key={m} data-testid={`cal-mode-${m}`} onClick={() => setMode(m)}
              className="rounded-[6px] px-3 py-1 text-xs font-medium transition-colors"
              style={{ backgroundColor: mode === m ? "var(--org-accent)" : "transparent", color: mode === m ? "#fff" : "var(--ink-muted)" }}>
              {t(m)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--org-border)" }}>
        {weekDays.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
            {format(d, "EEE", { locale })}
          </div>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksForDay(day);
            const isToday = isSameDay(day, new Date());
            const inMonth = mode === "week" || isSameMonth(day, cursor);
            return (
              <Droppable droppableId={key} key={key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    data-testid={`cal-day-${key}`}
                    className="min-h-[104px] border-b border-r p-1.5 transition-colors"
                    style={{
                      borderColor: "var(--org-border)",
                      backgroundColor: snapshot.isDraggingOver ? "var(--bg)" : "transparent",
                      opacity: inMonth ? 1 : 0.4,
                    }}
                  >
                    <div className="mb-1 flex justify-end">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums font-medium"
                        style={{ backgroundColor: isToday ? "var(--org-accent)" : "transparent", color: isToday ? "#fff" : "var(--ink-muted)" }}>
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayTasks.map((tk, i) => (
                        <Draggable draggableId={tk.id} index={i} key={tk.id}>
                          {(dp, ds) => (
                            <div
                              ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                              onClick={() => onTaskClick?.(tk)}
                              data-testid={`cal-task-${tk.id}`}
                              className="rounded-[6px] border px-1.5 py-1 text-[11px] font-medium leading-tight"
                              style={{
                                backgroundColor: "var(--surface)", borderColor: "var(--org-border)",
                                color: "var(--ink)", opacity: ds.isDragging ? 0.85 : 1,
                                ...dp.draggableProps.style,
                              }}
                            >
                              <span className="line-clamp-2">{tk.title}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
