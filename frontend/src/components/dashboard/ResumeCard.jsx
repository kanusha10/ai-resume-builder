import React from 'react';
import { Link } from 'react-router-dom';
import { Edit3, FileDown, FileText, Trash2, Calendar, Briefcase, FileCode2 } from 'lucide-react';
import { downloadResumeDocx } from '../../utils/docxExport';
import './ResumeCard.css';
import { exportResumeToWord } from "../../utils/previewExport";

export default function ResumeCard({ resume, onDelete, onDownload }) {
  const title = resume.name || resume.title || 'Untitled Resume';

  let parsed = {};
  try {
    parsed = typeof resume.resumeData === 'string' ? JSON.parse(resume.resumeData) : (resume.resumeData || {});
  } catch {
    parsed = {};
  }

  const role = resume.role || parsed.role || parsed.personal?.jobTitle || 'Software Engineer';
  const templateName = resume.template === 'classic' ? 'Executive Classic' : resume.template === 'technical' ? 'Technical Clean' : 'Modern Minimal';

  const updatedAt = resume.updatedAt
    ? new Date(resume.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Draft';

  const fullResumeObject = {
    ...parsed,
    name: title,
    role: role,
    id: resume.id
  };

  return (
    <div className="resume-item-card">
      {/* Top Header Row: Icon + Title + Template Tag */}
      <div className="card-header-row">
        <div className="card-avatar-icon">
          <FileCode2 size={20} />
        </div>
        <div className="card-title-group">
          <h3 className="card-main-title" title={title}>{title}</h3>
          <div className="card-role-line">
            <Briefcase size={12} />
            <span>{role}</span>
          </div>
        </div>
        <span className="card-pill-template">{templateName}</span>
      </div>

      {/* Middle Meta Info */}
      <div className="card-meta-row">
        <div className="meta-info-item">
          <Calendar size={13} />
          <span>Updated {updatedAt}</span>
        </div>
        <span className="card-status-dot">Ready</span>
      </div>

      {/* Bottom Action Buttons: Clear, Evenly Spaced */}
      <div className="card-footer-actions">
        <Link to={`/resume/${resume.id}`} className="action-btn btn-edit-primary">
          <Edit3 size={14} />
          <span>Edit</span>
        </Link>

        <button
          onClick={() => onDownload(resume.id, title)}
          className="action-btn btn-export-pdf"
          title="Download vector PDF"
        >
          <FileDown size={14} />
          <span>PDF</span>
        </button>

       <button
         onClick={() => exportResumeToWord(fullResumeObject, title)}
         className="action-btn btn-export-word"
         title="Download Word Document"
       >
         <FileText size={14} />
         <span>Word</span>
       </button>

        <button
          onClick={() => onDelete(resume.id)}
          className="action-btn btn-delete-danger"
          title="Delete Resume"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}