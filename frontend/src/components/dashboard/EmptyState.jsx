import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({ onOpenCreate }) {
  return (
    <div className="empty-state-rectangle">
      <div className="empty-left-panel">
        <div className="empty-icon-shield">
          <FileText size={26} />
        </div>
        <h3 className="empty-heading">No resumes yet</h3>
        <p className="empty-subheading">
          Get started by choosing how you would like to build your first document.
        </p>

        <ul className="empty-checklist">
          <li>
            <CheckCircle2 size={15} />
            <span>Structured step-by-step editing</span>
          </li>
          <li>
            <CheckCircle2 size={15} />
            <span>Real-time document canvas</span>
          </li>
        </ul>
      </div>

      <div className="empty-right-options">
        <button
          onClick={onOpenCreate}
          className="empty-option-card primary-option"
          style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
        >
          <div className="option-icon-wrap primary-icon">
            <Plus size={20} />
          </div>
          <div className="option-text">
            <h4>Start from Scratch</h4>
            <p>Set a resume title, select your template, and fill step-by-step.</p>
          </div>
          <ArrowRight size={18} className="option-arrow" />
        </button>

        <Link to="/resume/upload" className="empty-option-card secondary-option">
          <div className="option-icon-wrap secondary-icon">
            <Upload size={20} />
          </div>
          <div className="option-text">
            <h4>Upload Existing Resume</h4>
            <p>Import text or JSON data into the editor to save time.</p>
          </div>
          <ArrowRight size={18} className="option-arrow" />
        </Link>
      </div>
    </div>
  );
}