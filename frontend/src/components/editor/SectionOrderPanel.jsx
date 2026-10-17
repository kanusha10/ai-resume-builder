import React, { useState } from "react";
import { GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import {
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  normalizeSectionOrder,
} from "../../utils/sectionOrder";
import "./SectionOrderPanel.css";

export default function SectionOrderPanel({
  order,
  hidden = [],
  hasContent = () => true,
  onChange,
  onHiddenChange,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const list = normalizeSectionOrder(order);

  const move = (from, to) => {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const toggleHidden = (id) => {
    onHiddenChange(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);
  };

  const reset = () => {
    onChange([...DEFAULT_SECTION_ORDER]);
    onHiddenChange([]);
  };

  return (
    <div className="section-order">
      <div className="section-order-top">
        <p>
          Drag sections (or use the arrows) to change their order on your resume. Your name and contact header always stay on top.
        </p>
        <button type="button" className="section-order-reset" onClick={reset}>
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      <ul className="section-order-list">
        {list.map((id, index) => {
          const isHidden = hidden.includes(id);
          const filled = hasContent(id);
          return (
            <li
              key={id}
              draggable
              className={[
                "section-order-item",
                dragIndex === index ? "dragging" : "",
                overIndex === index && dragIndex !== index ? "drop-target" : "",
                isHidden ? "is-hidden" : "",
              ].join(" ")}
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              <span className="section-order-grip" title="Drag to reorder">
                <GripVertical size={16} />
              </span>
              <span className="section-order-index">{index + 1}</span>
              <span className="section-order-label">
                {SECTION_LABELS[id]}
                {!filled && <em>empty</em>}
                {isHidden && <em className="hidden-tag">hidden</em>}
              </span>

              <span className="section-order-actions">
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === list.length - 1} aria-label="Move down">
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleHidden(id)}
                  aria-label={isHidden ? "Show section" : "Hide section"}
                  title={isHidden ? "Show on resume" : "Hide from resume"}
                >
                  {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}