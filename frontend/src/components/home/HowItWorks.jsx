import React from 'react';
import { PenLine, Eye, Download } from 'lucide-react';
import './HowItWorks.css';

const steps = [
  {
    num: '1',
    icon: <PenLine size={20} />,
    title: 'Enter Your Information',
    desc: 'Input your work history, education, project links, and core competencies.'
  },
  {
    num: '2',
    icon: <Eye size={20} />,
    title: 'Review the Layout',
    desc: 'Inspect spacing, margins, and content flow live on the interactive canvas.'
  },
  {
    num: '3',
    icon: <Download size={20} />,
    title: 'Export Vector PDF',
    desc: 'Download your finished single-page resume ready for job applications.'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="section-container">
        <div className="section-header">
          <span className="section-pill">Simple Workflow</span>
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            A straightforward process from a blank draft to a completed document.
          </p>
        </div>

        <div className="steps-container">
          {steps.map((s, idx) => (
            <div key={idx} className="step-card">
              <div className="step-num-pill">{s.num}</div>
              <div className="step-icon-box">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}