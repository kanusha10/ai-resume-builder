import React from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";

// Generic editor for repeatable list sections (internships, achievements, languages, involvement).
export default function ListSectionEditor({
  title,
  subtitle,
  addLabel = "Add",
  emptyText,
  itemLabel,
  items,
  newItem,
  fields,
  onAdd,
  onRemove,
  onUpdate,
  onAiEnhance,
  enhancing,
}) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="step-content">
      <div className="step-heading-with-actions">
        <div className="step-heading">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="btn-add-item" onClick={() => onAdd({ ...newItem })}>
          <Plus size={14} />
          <span>{addLabel}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <p className="empty-hint">{emptyText}</p>
      ) : (
        list.map((item, idx) => (
          <div key={idx} className="sub-entry-card">
            <div className="sub-entry-header">
              <h4>
                {itemLabel} #{idx + 1}
              </h4>
              <button type="button" className="btn-delete-item" onClick={() => onRemove(idx)} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="form-grid-6">
              {fields.map((f) => (
                <div key={f.key} className={`input-group span-${f.span || 6}`}>
                  <div className="field-label-row">
                    <label>{f.label}</label>
                    {f.ai && onAiEnhance && (
                      <button
                        type="button"
                        className="btn-ai-enhance-action aesthetic"
                        disabled={enhancing || !String(item[f.key] || "").trim()}
                        onClick={() =>
                          onAiEnhance(
                            f.ai.type,
                            item[f.key],
                            (enhanced) => onUpdate(idx, f.key, enhanced),
                            f.ai.context ? f.ai.context(item) : ""
                          )
                        }
                      >
                        <Sparkles size={12} className="sparkle-icon" />
                       <span>{enhancing ? "Enhancing..." : "Enhance"}</span>
                      </button>
                    )}
                  </div>

                  {f.type === "textarea" ? (
                    <textarea
                      className="wizard-textarea"
                      rows={f.rows || 3}
                      value={item[f.key] || ""}
                      onChange={(e) => onUpdate(idx, f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  ) : f.type === "select" ? (
                    <select
                      className="wizard-select"
                      value={item[f.key] || f.options[0]}
                      onChange={(e) => onUpdate(idx, f.key, e.target.value)}
                    >
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={item[f.key] || ""}
                      onChange={(e) => onUpdate(idx, f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}