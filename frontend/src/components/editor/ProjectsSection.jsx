import React from "react";
import { Plus, Trash2, Sparkles, FolderGit2 } from "lucide-react";

export default function ProjectsSection({ data = [], onChange, onAiEnhance, enhancing }) {
  const addProject = () => {
    onChange([
      ...data,
      {
        name: "",
        technologies: "",
        link: "",
        description: "",
      },
    ]);
  };

  const updateProject = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeProject = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="section-form-wrapper">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button type="button" className="btn-add-item" onClick={addProject}>
          <Plus size={14} />
          <span>Add Project</span>
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-hint">No projects added yet. Click "Add Project" to showcase your work.</p>
      ) : (
        data.map((proj, idx) => (
          <div key={idx} className="sub-entry-card" style={{ marginBottom: "1.25rem" }}>
            <div className="sub-entry-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <FolderGit2 size={15} color="#4f46e5" />
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                  {proj.name || `Project #${idx + 1}`}
                </h4>
              </div>
              <button
                type="button"
                className="btn-delete-item"
                onClick={() => removeProject(idx)}
                title="Remove project"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={proj.name || ""}
                  onChange={(e) => updateProject(idx, "name", e.target.value)}
                  placeholder="e.g. Smart Warehouse Management System"
                />
              </div>

              <div className="input-group">
                <label>Technologies Used</label>
                <input
                  type="text"
                  value={proj.technologies || ""}
                  onChange={(e) => updateProject(idx, "technologies", e.target.value)}
                  placeholder="e.g. Java, Spring Boot, React, PostgreSQL"
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "0.85rem" }}>
              <label>Project Link / GitHub URL</label>
              <input
                type="text"
                value={proj.link || ""}
                onChange={(e) => updateProject(idx, "link", e.target.value)}
                placeholder="https://github.com/username/project"
              />
            </div>

            <div className="input-group">
              <div className="field-label-row">
                <label>Project Description (Action-driven bullets)</label>
                {onAiEnhance && (
                  <button
                    type="button"
                    className="btn-ai-enhance-action aesthetic"
                    disabled={enhancing || !proj.description?.trim()}
                    onClick={() =>
                      onAiEnhance(
                        "project",
                        proj.description,
                        (enhanced) => {
                          updateProject(idx, "description", enhanced);
                        },
                        `Project Name: ${proj.name || ""}, Tech Stack: ${proj.technologies || ""}`
                      )
                    }
                    title="Enhance project bullets using your tech stack and action verbs"
                  >
                    <Sparkles size={13} className="sparkle-icon" />
                    <span>{enhancing ? "Enhancing..." : "✨ Enhance with AI"}</span>
                  </button>
                )}
              </div>
              <textarea
                rows="4"
                className="wizard-textarea"
                value={proj.description || ""}
                onChange={(e) => updateProject(idx, "description", e.target.value)}
                placeholder="• Engineered RESTful services for automated stock tracking, reducing query overhead by 35%&#10;• Implemented secure JWT authorization and relational schema migrations in PostgreSQL"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}