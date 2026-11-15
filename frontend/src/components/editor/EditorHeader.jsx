import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Download, Layout, Eye, Edit3, Palette } from 'lucide-react';
import './EditorHeader.css';

export default function EditorHeader({
  resumeTitle,
  resumeRole,
  onTitleChange,
  onRoleChange,
  onOpenDesign,
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

      {/* Center: Design, View Toggles */}
      <div className="editor-nav-center">
        <button type="button" className="nav-design-btn" onClick={onOpenDesign} title="Choose a template, fonts and colors">
          <Palette size={15} />
          <span>Design</span>
        </button>

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