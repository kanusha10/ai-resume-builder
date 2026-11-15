import { Plus, Trash2, LayoutList, ListChecks, AlignLeft, Layers, Check } from "lucide-react";
import "./CustomSectionEditor.css";

const TYPES = [
  { id: "entries", label: "Entries", desc: "Title, place, date and details", Icon: LayoutList },
  { id: "bullets", label: "Bullet list", desc: "Short points, like hobbies", Icon: ListChecks },
  { id: "text", label: "Paragraph", desc: "Free text, like a statement", Icon: AlignLeft },
];

function convertItems(items, from, to) {
  if (from === to) return items;
  if (from === "entries" && to === "bullets") {
    return items.map((i) => ({ text: i.title || i.description || "" })).filter((i) => i.text);
  }
  if (from === "bullets" && to === "entries") {
    return items.map((i) => ({ title: i.text || "", subtitle: "", date: "", description: "" }));
  }
  return items;
}

export default function CustomSectionEditor({ section, onChange, onDelete }) {
  const type = section.type || "entries";
  const items = section.items || [];

  const setItems = (next) => onChange({ ...section, items: next });
  const patchItem = (index, patch) => setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const changeType = (next) => {
    if (next === type) return;
    onChange({ ...section, type: next, items: convertItems(items, type, next) });
  };

  const confirmDelete = () => {
    if (window.confirm(`Delete the section "${section.title || "Custom Section"}"? This cannot be undone.`)) {
      onDelete();
    }
  };

  return (
    <div className="step-content cse">
      <div className="cse-hero">
        <span className="cse-hero-icon">
          <Layers size={22} />
        </span>
        <div className="cse-hero-text">
          <h3>{section.title?.trim() || "Custom section"}</h3>
          <p>Add anything the standard sections don't cover. You can move it in the Order step.</p>
        </div>
        <button type="button" className="cse-delete" onClick={confirmDelete} title="Delete this section">
          <Trash2 size={15} />
        </button>
      </div>

      <label className="cse-label" htmlFor={`cse-title-${section.id}`}>
        Section title
      </label>
      <input
        id={`cse-title-${section.id}`}
        className="cse-input cse-title-input"
        type="text"
        value={section.title || ""}
        maxLength={60}
        placeholder="e.g. Volunteering, Publications, Hobbies"
        onChange={(e) => onChange({ ...section, title: e.target.value })}
      />

      <div className="cse-label">Format</div>
      <div className="cse-types" role="radiogroup" aria-label="Section format">
        {TYPES.map(({ id, label, desc, Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={type === id} className={type === id ? "active" : ""} onClick={() => changeType(id)}>
            <span className="cse-type-icon">
              <Icon size={18} />
            </span>
            <strong>{label}</strong>
            <span>{desc}</span>
            {type === id && (
              <i className="cse-type-check">
                <Check size={12} />
              </i>
            )}
          </button>
        ))}
      </div>

      {type === "text" && (
        <>
          <label className="cse-label" htmlFor={`cse-text-${section.id}`}>
            Text
          </label>
          <textarea
            id={`cse-text-${section.id}`}
            className="cse-input cse-textarea"
            rows={6}
            value={section.text || ""}
            placeholder="Write your paragraph here..."
            onChange={(e) => onChange({ ...section, text: e.target.value })}
          />
        </>
      )}

      {type === "bullets" && (
        <>
          <div className="cse-label">Points</div>
          {items.length === 0 && <p className="cse-empty">No points yet. Add your first one below.</p>}
          {items.map((item, index) => (
            <div key={index} className="cse-bullet-row">
              <span className="cse-dot" />
              <input className="cse-input" type="text" value={item.text || ""} placeholder={`Point ${index + 1}`} onChange={(e) => patchItem(index, { text: e.target.value })} aria-label={`Point ${index + 1}`} />
              <button type="button" className="cse-icon-btn" onClick={() => removeItem(index)} aria-label={`Remove point ${index + 1}`}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="cse-add" onClick={() => setItems([...items, { text: "" }])}>
            <Plus size={16} />
            Add point
          </button>
        </>
      )}

      {type === "entries" && (
        <>
          <div className="cse-label">Entries</div>
          {items.length === 0 && <p className="cse-empty">No entries yet. Add your first one below.</p>}
          {items.map((item, index) => (
            <div key={index} className="cse-entry">
              <div className="cse-entry-head">
                <span className="cse-entry-num">{index + 1}</span>
                <strong>{item.title?.trim() || `Entry ${index + 1}`}</strong>
                <button type="button" className="cse-icon-btn" onClick={() => removeItem(index)} aria-label={`Remove entry ${index + 1}`}>
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="cse-grid">
                <div>
                  <label className="cse-mini-label">Title</label>
                  <input className="cse-input" type="text" value={item.title || ""} placeholder="e.g. Mentor" onChange={(e) => patchItem(index, { title: e.target.value })} />
                </div>
                <div>
                  <label className="cse-mini-label">Place / organization</label>
                  <input className="cse-input" type="text" value={item.subtitle || ""} placeholder="e.g. Code for Good" onChange={(e) => patchItem(index, { subtitle: e.target.value })} />
                </div>
              </div>

              <label className="cse-mini-label">Date</label>
              <input className="cse-input" type="text" value={item.date || ""} placeholder="e.g. 2023 - Present" onChange={(e) => patchItem(index, { date: e.target.value })} />

              <label className="cse-mini-label">Details (one point per line)</label>
              <textarea className="cse-input cse-textarea" rows={3} value={item.description || ""} placeholder={"• Mentored 12 students in web development"} onChange={(e) => patchItem(index, { description: e.target.value })} />
            </div>
          ))}

          <button type="button" className="cse-add" onClick={() => setItems([...items, { title: "", subtitle: "", date: "", description: "" }])}>
            <Plus size={16} />
            Add entry
          </button>
        </>
      )}
    </div>
  );
}