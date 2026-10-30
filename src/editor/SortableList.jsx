import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import { sectionLabel } from './sectionCatalog';

function SortableRow({ item, selected, onSelect, onToggle, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
        selected ? 'border-[#172B3A] bg-[#172B3A]/10' : 'border-[#E5E9EC] bg-white'
      } ${isDragging ? 'opacity-70 shadow-lg' : ''} ${item.visible === false ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        className="p-2 text-stone-400 cursor-grab active:cursor-grabbing"
        aria-label="اسحبي للترتيب"
        {...attributes}
        {...listeners}
      >
        <FaGripVertical />
      </button>
      <button type="button" onClick={() => onSelect(item.id)} className="flex-1 text-right text-sm font-bold min-w-0 truncate">
        {sectionLabel(item.type)}
      </button>
      <button type="button" onClick={() => onToggle(item.id)} className="p-2 text-stone-500" aria-label={item.visible === false ? 'إظهار' : 'إخفاء'}>
        {item.visible === false ? <FaEyeSlash /> : <FaEye />}
      </button>
      <button type="button" onClick={() => onRemove(item.id)} className="p-2 text-[#9A3F32]" aria-label="حذف">
        <FaTrash />
      </button>
    </div>
  );
}

export default function SortableList({ items, selectedId, onReorder, onSelect, onToggle, onRemove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2" dir="rtl">
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={onSelect}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
