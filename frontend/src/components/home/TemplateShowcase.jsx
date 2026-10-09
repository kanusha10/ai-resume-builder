import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './TemplateShowcase.css';

const templates = [
  {
    name: 'Modern Minimal',
    tag: 'Clean & Structured',
    desc: 'A streamlined single-column layout prioritizing experience and technical skills.',
    badge: 'Standard Fit',
    accentColor: '#4f46e5'
  },
  {
    name: 'Executive Classic',
    tag: 'Formal Hierarchy',
    desc: 'Balanced margins and traditional typography suitable for all career levels.',
    badge: 'Clean Typography',
    accentColor: '#0f172a'
  },
  {
    name: 'Technical Clean',
    tag: 'Project-Focused',
    desc: 'Compact layout optimized for detailed project descriptions and tech stacks.',
    badge: 'Engineering Focus',
    accentColor: '#0891b2'
  }
];

export default function TemplateShowcase() {
  return (
    <section id="templates" className="templates-section">
      <div className="section-container">
        <div className="section-header">
          <span className="section-pill">Layout Options</span>
          <h2 className="section-title">Clean, legible document templates</h2>
          <p className="section-subtitle">
            Built with proper font weights and whitespace so your experience is easy to scan.
          </p>
        </div>

        <div className="templates-grid">
          {templates.map((tpl, idx) => (
            <div key={idx} className="template-card">
              <div className="template-mockup-wrapper">
                <div className="mini-paper">
                  <div className="mini-paper-header" style={{ borderTop: `3px solid ${tpl.accentColor}` }}>
                    <div className="mini-bar title-bar"></div>
                    <div className="mini-bar sub-bar"></div>
                  </div>
                  <div className="mini-paper-body">
                    <div className="mini-section-label"></div>
                    <div className="mini-line"></div>
                    <div className="mini-line half"></div>
                    <div className="mini-section-label"></div>
                    <div className="mini-line"></div>
                    <div className="mini-line short"></div>
                  </div>
                </div>
                <div className="template-tag-badge">{tpl.tag}</div>
              </div>

              <div className="template-info">
                <div className="template-title-row">
                  <h3 className="template-name">{tpl.name}</h3>
                  <span className="template-badge">{tpl.badge}</span>
                </div>
                <p className="template-desc">{tpl.desc}</p>
                <Link to="/register" className="template-action-btn">
                  Use This Template <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}