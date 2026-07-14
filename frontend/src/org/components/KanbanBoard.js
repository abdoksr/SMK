import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { StatusBadge } from "@/org/components/StatusBadge";

// columns: [{ id, status }], items grouped by column via getColumn(item)===col.id
export function KanbanBoard({ columns, items, getColumn, renderCard, onMove }) {
  const handleDragEnd = (result) => {
    const { destination, draggableId, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    onMove(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
        {columns.map((col) => {
          const colItems = items.filter((i) => getColumn(i) === col.id);
          return (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid={`kanban-column-${col.id}`}
                  className="flex w-72 flex-shrink-0 flex-col rounded-[10px] border p-3 transition-colors"
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? "var(--bg)" : "var(--surface)",
                    borderColor: "var(--org-border)",
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={col.id} />
                    <span className="text-xs tabular-nums" style={{ color: "var(--ink-muted)" }}>
                      {colItems.length}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5">
                    {colItems.map((item, index) => (
                      <Draggable draggableId={item.id} index={index} key={item.id}>
                        {(dp, ds) => (
                          <div
                            ref={dp.innerRef}
                            {...dp.draggableProps}
                            {...dp.dragHandleProps}
                            style={{ ...dp.draggableProps.style, opacity: ds.isDragging ? 0.85 : 1 }}
                          >
                            {renderCard(item)}
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
  );
}
