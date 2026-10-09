import React from 'react';
import { Plus, Trash2, Award } from 'lucide-react';
import './SectionStyles.css';

export default function CertificationsSection({ data = [], onChange }) {
  const addEntry = () => {
    onChange([
      ...data,
      {
        name: "",
        issuer: "",
        date: "",
        credentialId: "",
        url: ""
      }
    ]);
  };

  const updateEntry = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEntry = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="multi-entry-section">
      {data.map((cert, index) => (
        <div key={index} className="entry-card">
          <div className="entry-card-header">
            <span className="entry-card-tag">
              <Award size={14} />
              <span>{cert.name || `Certification #${index + 1}`}</span>
            </span>
            <button
              type="button"
              className="btn-delete-entry"
              onClick={() => removeEntry(index)}
              title="Remove certification"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="form-grid-2">
            <div className="input-field-group">
              <label>Certificate Name</label>
              <input
                type="text"
                value={cert.name || ""}
                onChange={(e) => updateEntry(index, "name", e.target.value)}
                placeholder="e.g. AWS Certified Cloud Practitioner"
              />
            </div>

            <div className="input-field-group">
              <label>Issuing Organization</label>
              <input
                type="text"
                value={cert.issuer || ""}
                onChange={(e) => updateEntry(index, "issuer", e.target.value)}
                placeholder="e.g. Amazon Web Services / Oracle"
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="input-field-group">
              <label>Issue Date</label>
              <input
                type="text"
                value={cert.date || ""}
                onChange={(e) => updateEntry(index, "date", e.target.value)}
                placeholder="e.g. Sep 2026"
              />
            </div>

            <div className="input-field-group">
              <label>Credential ID</label>
              <input
                type="text"
                value={cert.credentialId || ""}
                onChange={(e) => updateEntry(index, "credentialId", e.target.value)}
                placeholder="e.g. ABC-12345-XYZ"
              />
            </div>

            <div className="input-field-group">
              <label>Verification URL</label>
              <input
                type="text"
                value={cert.url || ""}
                onChange={(e) => updateEntry(index, "url", e.target.value)}
                placeholder="https://credly.com/..."
              />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn-add-entry" onClick={addEntry}>
        <Plus size={15} />
        <span>Add Certification</span>
      </button>
    </div>
  );
}