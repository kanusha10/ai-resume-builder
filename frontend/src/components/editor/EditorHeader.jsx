import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Download, Layout, Eye, Edit3, Palette } from 'lucide-react';
import './EditorHeader.css';

const TEMPLATES = [
  { id: 'default', name: 'ATS Modern (Emma Format)' },
  { id: 'technical', name: 'ATS Tech / Data Analyst (Aaditya)' },
  { id: 'executive', name: 'ATS Executive (Shaded Banners)' },
  { id: 'harvard', name: 'ATS Harvard Academic (Classic)' },
  { id: 'minimal', name: 'ATS Minimalist (Tracked Serif)' }
];

const THEME_COLORS = [
  '#0f172a', // Slate Dark / Black (Standard ATS)
  '#1e3a8a', // Deep Navy
  '#4f46e5', // Indigo
  '#0f766e', // Deep Teal
  '#15803d', // Forest Emerald
  '#374151'  // Charcoal Gray
];

export default function EditorHeader({
  resumeTitle,
  resumeRole,
  onTitleChange,
  onRoleChange,
  template,
  onTemplateChange,
  color,
  onColorChange,
  saving,
  onSave,
  onDownloadPdf,
  viewMode,
  onViewModeChange
}) {
  return (
    <header className="editor-nav-header">
      {/* Left: Back & Rename Inputs */}
      <div className="editor-nav-left">
        <Link to="/dashboard" className="btn-back-dash" title="Return to Dashboard">
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>

        <div className="editor-title-container">
          <input
            type="text"
            className="editor-nav-title-input"
            value={resumeTitle || ''}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Resume Name"
            title="Click to rename resume"
          />
          <input
            type="text"
            className="editor-nav-role-input"
            value={resumeRole || ''}
            onChange={(e) => onRoleChange(e.target.value)}
            placeholder="Target Role (e.g. Java Backend Developer)"
            title="Click to edit target job title"
          />
        </div>
      </div>

      {/* Center: Template Dropdown, Color Circles, View Toggles */}
      <div className="editor-nav-center">
        {/* Template Selector Dropdown */}
        <div className="nav-template-selector" title="Select ATS Template">
          <Palette size={14} className="template-icon" />
          <select
            value={template || 'default'}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="nav-template-select"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Color Palette Quick Pick */}
        <div className="nav-color-palette" title="Select Theme Color">
          {THEME_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`nav-color-dot ${color === hex ? 'active' : ''}`}
              style={{ backgroundColor: hex }}
              onClick={() => onColorChange(hex)}
              aria-label={`Select color ${hex}`}
            />
          ))}
        </div>

        {/* View Mode Toggle Switch */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => onViewModeChange('editor')}
            title="Form Only"
          >
            <Edit3 size={13} />
            <span>Form</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'both' ? 'active' : ''}`}
            onClick={() => onViewModeChange('both')}
            title="Split Form & Preview"
          >
            <Layout size={13} />
            <span>Both</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('preview')}
            title="Preview Only"
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Right: Save & Export Actions */}
      <div className="editor-nav-right">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-editor-action save"
        >
          <Save size={15} />
          <span>{saving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          onClick={onDownloadPdf}
          className="btn-editor-action pdf"
          title="Export ATS-formatted Vector PDF"
        >
          <Download size={15} />
          <span>Download PDF</span>
        </button>
      </div>
    </header>
  );
}