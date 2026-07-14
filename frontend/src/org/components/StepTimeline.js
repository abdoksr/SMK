import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { StatusBadge } from "@/org/components/StatusBadge";
import { useLang } from "@/org/context/LangContext";
import { STEP_STATUSES } from "@/org/lib/i18n";
import { GripVertical, Trash2 } from "lucide-react";

export function StepTimeline({ steps, onReorder, onStatusChange, onDelete }) {
  const { label } = useLang();

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(steps);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="steps">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2.5" data-testid="step-timeline">
            {steps.map((step, index) => (
              <Draggable draggableId={step.id} index={index} key={step.id}>
                {(dp, ds) => (
                  <div
                    ref={dp.innerRef}
                    {...dp.draggableProps}
                    data-testid={`step-row-${step.id}`}
                    className="flex items-center gap-3 rounded-[10px] border p-3.5 shadow-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--org-border)",
                      opacity: ds.isDragging ? 0.9 : 1,
                      ...dp.draggableProps.style,
                    }}
                  >
                    <span {...dp.dragHandleProps} data-testid={`step-handle-${step.id}`} className="cursor-grab active:cursor-grabbing">
                      <GripVertical size={18} strokeWidth={1.5} style={{ color: "var(--ink-muted)" }} />
                    </span>
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: "var(--bg)", color: "var(--ink-muted)" }}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{step.name}</p>
                      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--org-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${step.progress || 0}%`, backgroundColor: "var(--org-accent)" }} />
                      </div>
                    </div>
                    <select
                      data-testid={`step-status-${step.id}`}
                      value={step.status}
                      onChange={(e) => onStatusChange(step.id, e.target.value)}
                      className="rounded-[8px] border px-2 py-1 text-xs outline-none"
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}
                    >
                      {STEP_STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                      ))}
                    </select>
                    <button
                      data-testid={`step-delete-${step.id}`}
                      onClick={() => onDelete(step.id)}
                      aria-label="delete step"
                      className="rounded-md p-1.5 transition-colors hover:bg-[var(--bg)]"
                    >
                      <Trash2 size={16} strokeWidth={1.5} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
