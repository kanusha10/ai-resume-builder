import React from 'react';
import { Plus, Trash2, Sparkles, Briefcase } from 'lucide-react';
import './SectionStyles.css';

export default function ExperienceSection({ data = [], onChange, onAiEnhance, enhancing }) {
  const addExperience = () => {
    onChange([
      ...data,
      {
        role: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "Present",
        description: ""
      }
    ]);
  };

  const updateExperience = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeExperience = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="section-form-wrapper">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button type="button" className="btn-add-item" onClick={addExperience}>
          <Plus size={14} />
          <span>Add Experience</span>
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-hint">No work experience added yet. Click "Add Experience" to get started.</p>
      ) : (
        data.map((exp, idx) => (
          <div key={idx} className="sub-entry-card" style={{ marginBottom: "1.25rem" }}>
            <div className="sub-entry-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Briefcase size={15} color="#4f46e5" />
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                  {exp.role || `Experience #${idx + 1}`}
                </h4>
              </div>
              <button
                type="button"
                className="btn-delete-item"
                onClick={() => removeExperience(idx)}
                title="Remove experience"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Job Title / Role</label>
                <input
                  type="text"
                  value={exp.role || ""}
                  onChange={(e) => updateExperience(idx, "role", e.target.value)}
                  placeholder="e.g. Associate Software Engineer"
                />
              </div>

              <div className="input-group">
                <label>Company / Organization</label>
                <input
                  type="text"
                  value={exp.company || ""}
                  onChange={(e) => updateExperience(idx, "company", e.target.value)}
                  placeholder="e.g. Tech Solutions Inc."
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="input-group">
                <label>Location</label>
                <input
                  type="text"
                  value={exp.location || ""}
                  onChange={(e) => updateExperience(idx, "location", e.target.value)}
                  placeholder="e.g. Bengaluru / Hybrid"
                />
              </div>

              <div className="input-group">
                <label>Start Date</label>
                <input
                  type="text"
                  value={exp.startDate || ""}
                  onChange={(e) => updateExperience(idx, "startDate", e.target.value)}
                  placeholder="e.g. Jan 2024"
                />
              </div>

              <div className="input-group">
                <label>End Date</label>
                <input
                  type="text"
                  value={exp.endDate || ""}
                  onChange={(e) => updateExperience(idx, "endDate", e.target.value)}
                  placeholder="e.g. Present or Dec 2024"
                />
              </div>
            </div>

            <div className="input-group" style={{ marginTop: "0.85rem" }}>
              <div className="field-label-row">
                <label>Responsibilities & Achievements (Action bullets)</label>
                {onAiEnhance && (
                  <button
                    type="button"
                    className="btn-ai-enhance-action aesthetic"
                    disabled={enhancing || !exp.description?.trim()}
                    onClick={() =>
                      onAiEnhance(
                        "experience",
                        exp.description,
                        (enhanced) => {
                          updateExperience(idx, "description", enhanced);
                        },
                        `Job Title: ${exp.role || ""}, Company: ${exp.company || ""}`
                      )
                    }
                    title="Enhance bullet points with action verbs and impact"
                  >
                    <Sparkles size={13} className="sparkle-icon" />
                    <span>{enhancing ? "Enhancing..." : "✨ Enhance with AI"}</span>
                  </button>
                )}
              </div>
              <textarea
                rows="4"
                className="wizard-textarea"
                value={exp.description || ""}
                onChange={(e) => updateExperience(idx, "description", e.target.value)}
                placeholder="• Engineered RESTful microservices reducing API latency by 35%&#10;• Collaborated with cross-functional teams to deploy scalable cloud services"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}