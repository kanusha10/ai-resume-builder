import React from 'react';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import './SectionStyles.css';

const EDUCATION_LEVELS = [
  "Bachelor's Degree",
  "Master's Degree",
  "Diploma",
  "PUC / 12th Standard",
  "SSLC / 10th Standard / High School",
  "Other"
];

export default function EducationSection({ data = [], onChange }) {
  const addEntry = () => {
    onChange([
      ...data,
      {
        level: "Bachelor's Degree",
        institution: "",
        degree: "B.E. / B.Tech",
        field: "Computer Science & Engineering",
        startDate: "",
        endDate: "",
        grade: ""
      }
    ]);
  };

  const updateEntry = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-adjust degrees when switching levels
    if (field === "level") {
      if (value === "PUC / 12th Standard") {
        updated[index].degree = updated[index].degree || "Pre-University Course (PCMB/PCMC)";
        updated[index].field = "";
      } else if (value === "SSLC / 10th Standard / High School") {
        updated[index].degree = "Secondary School Leaving Certificate (SSLC)";
        updated[index].field = "";
      }
    }

    onChange(updated);
  };

  const removeEntry = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="multi-entry-section">
      {data.map((edu, index) => {
        const isSslc = edu.level === "SSLC / 10th Standard / High School";
        const isPuc = edu.level === "PUC / 12th Standard";
        const hideFieldOfStudy = isSslc || isPuc;

        return (
          <div key={index} className="entry-card">
            <div className="entry-card-header">
              <span className="entry-card-tag">
                <GraduationCap size={14} />
                <span>{edu.level || `Education #${index + 1}`}</span>
              </span>
              <button
                type="button"
                className="btn-delete-entry"
                onClick={() => removeEntry(index)}
                title="Remove education entry"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="form-grid-2">
              <div className="input-field-group">
                <label>Education Level</label>
                <select
                  value={edu.level || "Bachelor's Degree"}
                  onChange={(e) => updateEntry(index, "level", e.target.value)}
                >
                  {EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-field-group">
                <label>School / College / Institution Name</label>
                <input
                  type="text"
                  value={edu.institution || ""}
                  onChange={(e) => updateEntry(index, "institution", e.target.value)}
                  placeholder="e.g. National Institute of Engineering"
                />
              </div>
            </div>

            <div className={hideFieldOfStudy ? "form-grid-1" : "form-grid-2"}>
              <div className="input-field-group">
                <label>{isSslc ? "Certificate / Board" : isPuc ? "Course / Stream" : "Degree / Certificate Name"}</label>
                <input
                  type="text"
                  value={edu.degree || ""}
                  onChange={(e) => updateEntry(index, "degree", e.target.value)}
                  placeholder={isSslc ? "SSLC / 10th Standard" : isPuc ? "PUC Science (PCMC)" : "Bachelor of Engineering"}
                />
              </div>

              {!hideFieldOfStudy && (
                <div className="input-field-group">
                  <label>Field of Study / Branch</label>
                  <input
                    type="text"
                    value={edu.field || ""}
                    onChange={(e) => updateEntry(index, "field", e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              )}
            </div>

            <div className="form-grid-3">
              <div className="input-field-group">
                <label>Start Year</label>
                <input
                  type="text"
                  value={edu.startDate || ""}
                  onChange={(e) => updateEntry(index, "startDate", e.target.value)}
                  placeholder="e.g. 2022"
                />
              </div>

              <div className="input-field-group">
                <label>End / Passing Year</label>
                <input
                  type="text"
                  value={edu.endDate || ""}
                  onChange={(e) => updateEntry(index, "endDate", e.target.value)}
                  placeholder="e.g. 2026"
                />
              </div>

              <div className="input-field-group">
                <label>Grade / CGPA / Percentage</label>
                <input
                  type="text"
                  value={edu.grade || ""}
                  onChange={(e) => updateEntry(index, "grade", e.target.value)}
                  placeholder="e.g. 9.1 CGPA or 92%"
                />
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" className="btn-add-entry" onClick={addEntry}>
        <Plus size={15} />
        <span>Add Education Entry</span>
      </button>
    </div>
  );
}