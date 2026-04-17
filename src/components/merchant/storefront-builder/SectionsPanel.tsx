import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockDefinition, getBlockType } from "@/lib/storeTemplates";
import { GripVertical, Eye, EyeOff, Copy, Trash2, Plus } from "lucide-react";

interface Props {
  blocks: BlockDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onAddBlock: () => void;
}

function SortableRow({ block, selected, onSelect, onDuplicate, onDelete, onToggleHidden }: {
  block: BlockDefinition;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const meta = getBlockType(block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer transition-colors ${
        selected ? "border-secondary/60 bg-secondary/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
      } ${block.hidden ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="touch-none cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 p-0.5"
        aria-label="Drag"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="text-sm shrink-0">{meta?.icon || "▪️"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-white truncate">{meta?.label || block.type}</p>
        <p className="text-[9px] text-white/40 truncate">{block.title || "Untitled"}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggleHidden(); }} className="p-1 text-white/40 hover:text-white" title={block.hidden ? "Show" : "Hide"}>
          {block.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-white/40 hover:text-white" title="Duplicate">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-red-400/60 hover:text-red-400" title="Delete">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function SectionsPanel({
  blocks, selectedId, onSelect, onReorder, onDuplicate, onDelete, onToggleHidden, onAddBlock,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from !== -1 && to !== -1) onReorder(from, to);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Sections</p>
        <button
          onClick={onAddBlock}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-secondary text-primary hover:bg-secondary/90 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {blocks.length === 0 ? (
          <div className="text-center py-8 text-white/30">
            <p className="text-xs">No sections yet</p>
            <button onClick={onAddBlock} className="mt-2 text-[10px] text-secondary hover:underline">
              + Add your first section
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((b) => (
                <SortableRow
                  key={b.id}
                  block={b}
                  selected={b.id === selectedId}
                  onSelect={() => onSelect(b.id)}
                  onDuplicate={() => onDuplicate(b.id)}
                  onDelete={() => onDelete(b.id)}
                  onToggleHidden={() => onToggleHidden(b.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
