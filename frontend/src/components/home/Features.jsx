import React from 'react';
import { Eye, Download, Code, Layers, FileCheck, Sliders } from 'lucide-react';
import './Features.css';

const features = [
  {
    icon: <Eye size={18} />,
    title: 'Instant Live Preview',
    desc: 'Watch updates render in real-time side-by-side as you draft each section.'
  },
  {
    icon: <FileCheck size={18} />,
    title: 'Clean Typography',
    desc: 'Carefully measured line-heights, standard margins, and balanced hierarchy.'
  },
  {
    icon: <Download size={18} />,
    title: 'Direct PDF Export',
    desc: 'Generates clean, selectable vector PDF documents formatted for standard single-page printing.'
  },
  {
    icon: <Code size={18} />,
    title: 'Skills Organization',
    desc: 'Group languages, frameworks, databases, and tooling cleanly.'
  },
  {
    icon: <Layers size={18} />,
    title: 'Manage Multiple Resumes',
    desc: 'Maintain distinct versions tailored for different job profiles and stacks.'
  },
  {
    icon: <Sliders size={18} />,
    title: 'Focused Input Steps',
    desc: 'Structured sections for experience, education, projects, skills, and certifications.'
  }
];

export default function Features() {
  return (
    <section id="features" className="features-section">
      <div className="section-container">
        <div className="section-header">
          <span className="section-pill">Core Features</span>
          <h2 className="section-title">Designed for clean, structured resumes</h2>
          <p className="section-subtitle">
            Everything you need to write and export your CV without fighting styling margins.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-wrapper">
                {f.icon}
              </div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}