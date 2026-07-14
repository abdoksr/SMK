import { KanbanBoard } from "@/org/components/KanbanBoard";

// Thin wrapper over the generic KanbanBoard for the contacts pipeline (columns = statuses).
export function PipelineBoard({ statuses, items, onMove, renderCard }) {
  return (
    <KanbanBoard
      columns={statuses.map((s) => ({ id: s }))}
      items={items}
      getColumn={(i) => i.status}
      onMove={onMove}
      renderCard={renderCard}
    />
  );
}
