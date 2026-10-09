import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Download, Code2, Sparkles } from 'lucide-react';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Left column */}
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={13} className="badge-sparkle" />
            <span>Developer & Engineering Resumes</span>
          </div>

          <h1 className="hero-title">
            Build and export clean resumes with <span className="highlight-text">zero formatting friction</span>.
          </h1>

          <p className="hero-description">
            A structured builder that keeps your skills, projects, and work history organized into single-page, readable PDFs.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="btn-hero-primary">
              Start Building <ArrowRight size={16} />
            </Link>
            <a href="#templates" className="btn-hero-secondary">
              View Layouts
            </a>
          </div>

          <div className="hero-specs-row">
            <div className="spec-item">
              <span className="spec-dot"></span>
              <span>Live side-by-side editing</span>
            </div>
            <div className="spec-item">
              <span className="spec-dot"></span>
              <span>Direct PDF download</span>
            </div>
          </div>
        </div>

        {/* Right column: Realistic Clean Mockup */}
        <div className="hero-visual">
          <div className="resume-showcase-card">
            <div className="card-top-bar">
              <div className="browser-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span className="template-name-tag">Single-Page Standard</span>
            </div>

            <div className="mockup-resume-body">
              <div className="mockup-header-block">
                <h3>Jordan Taylor</h3>
                <p className="mockup-role">Software Engineer</p>
                <div className="mockup-contact-line">
                  <span>jordan@example.com</span>
                  <span>•</span>
                  <span>github.com/jordant</span>
                  <span>•</span>
                  <span>Bengaluru, IN</span>
                </div>
              </div>

              <div className="mockup-section">
                <div className="mockup-heading">Technical Skills</div>
                <div className="mockup-skills-grid">
                  <div><strong>Languages:</strong> Java, JavaScript, SQL, Python</div>
                  <div><strong>Frameworks:</strong> Spring Boot, React, Node.js</div>
                  <div><strong>Developer Tools:</strong> Git, Docker, PostgreSQL, Linux</div>
                </div>
              </div>

              <div className="mockup-section">
                <div className="mockup-heading">Experience</div>
                <div className="mockup-job">
                  <div className="job-title-row">
                    <strong>Software Development Intern</strong>
                    <span className="job-date">2024 — Present</span>
                  </div>
                  <div className="job-company">Nexus Systems</div>
                  <ul className="mockup-bullets">
                    <li>Built backend REST endpoints with Spring Boot and JPA for record processing.</li>
                    <li>Integrated reactive UI components using React and streamlined state management.</li>
                  </ul>
                </div>
              </div>

              <div className="mockup-section">
                <div className="mockup-heading">Projects</div>
                <div className="mockup-job">
                  <div className="job-title-row">
                    <strong>Distributed Task Runner</strong>
                    <span className="job-date">React, Spring Boot, PostgreSQL</span>
                  </div>
                  <ul className="mockup-bullets">
                    <li>Engineered automated worker queue capable of handling concurrent batch requests.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}