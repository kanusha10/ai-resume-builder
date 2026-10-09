import React from 'react';
import './SectionStyles.css';

export default function PersonalSection({ data = {}, onChange, errorHighlight }) {
  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="section-form-card">
      <div className="form-grid-2">
        <div className="input-field-group">
          <label className="required-label">Full Name *</label>
          <input
            type="text"
            className={errorHighlight && !data.fullName ? "input-error" : ""}
            value={data.fullName || ""}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="e.g. John Doe"
            required
          />
          {errorHighlight && !data.fullName && (
            <span className="field-error-hint">Full Name is required</span>
          )}
        </div>

        <div className="input-field-group">
          <label className="required-label">Email Address *</label>
          <input
            type="email"
            className={errorHighlight && !data.email ? "input-error" : ""}
            value={data.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="e.g. john@example.com"
            required
          />
          {errorHighlight && !data.email && (
            <span className="field-error-hint">Valid email is required</span>
          )}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="input-field-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={data.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="input-field-group">
          <label>Location / City</label>
          <input
            type="text"
            value={data.location || ""}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="e.g. Bengaluru, India"
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="input-field-group">
          <label>LinkedIn URL</label>
          <input
            type="text"
            value={data.linkedin || ""}
            onChange={(e) => handleChange("linkedin", e.target.value)}
            placeholder="linkedin.com/in/username"
          />
        </div>

        <div className="input-field-group">
          <label>GitHub URL</label>
          <input
            type="text"
            value={data.github || ""}
            onChange={(e) => handleChange("github", e.target.value)}
            placeholder="github.com/username"
          />
        </div>

        <div className="input-field-group">
          <label>Portfolio / Website</label>
          <input
            type="text"
            value={data.website || ""}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="portfolio.dev"
          />
        </div>
      </div>
    </div>
  );
}