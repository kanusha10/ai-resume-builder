import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Shield, Zap } from 'lucide-react';
import './AuthLayout.css';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Left column */}
        <div className="auth-brand-side">
          <Link to="/" className="auth-brand-logo">
            <div className="brand-icon-box">
              <FileText size={18} />
            </div>
            <span>CraftResume</span>
          </Link>

          <div className="auth-brand-content">
            <span className="auth-badge">Resume Workspace</span>
            <h2>Simple, structured resume building.</h2>
            <p>
              Keep your experience, projects, and skills organized in clean, printable layouts.
            </p>

            <div className="auth-highlights">
              <div className="highlight-item">
                <CheckCircle2 size={16} className="highlight-icon" />
                <span>Clean section-by-section editor</span>
              </div>
              <div className="highlight-item">
                <Shield size={16} className="highlight-icon" />
                <span>Save multiple custom drafts</span>
              </div>
              <div className="highlight-item">
                <Zap size={16} className="highlight-icon" />
                <span>One-click PDF downloads</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <p>© {new Date().getFullYear()} CraftResume</p>
          </div>
        </div>

        {/* Right column */}
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">{title}</h1>
              {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}