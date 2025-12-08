import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './SortableItem.css';

/**
 * Sortable Item Component
 * Individual draggable item in the rankings list
 */
export const SortableItem = ({ id, rank, name }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="drag-handle">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path
            d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="item-rank">{rank}</div>
      <div className="item-name">{name}</div>
    </div>
  );
};
