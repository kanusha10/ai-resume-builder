import React, { useEffect, useMemo } from "react";
import { X, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { analyzeResume } from "../../utils/atsAnalyzer";
import "./AtsScoreModal.css";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TONE_MESSAGES = {
  excellent: "Your resume is highly ATS-friendly. Fine-tune keywords for each job.",
  good: "Solid resume. A few improvements will push it into the top tier.",
  fair: "Decent foundation, but several ATS checks need attention.",
  poor: "Your resume is missing key ATS elements. Follow the suggestions below.",
};

export default function AtsScoreModal({ open, onClose, resume }) {
  const result = useMemo(() => (open ? analyzeResume(resume) : null), [open, resume]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !result) return null;

  const offset = CIRCUMFERENCE - (result.score / 100) * CIRCUMFERENCE;

  return (
    <div
      className="ats-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`ats-modal ats-tone-${result.tone}`}
        role="dialog"
        aria-modal="true"
        aria-label="ATS Score"
      >
        <div className="ats-modal-header">
          <h2>ATS Score Analysis</h2>
          <button type="button" className="ats-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="ats-modal-body">
          <div className="ats-score-top">
            <div className="ats-circle-wrap">
              <svg width="124" height="124" viewBox="0 0 124 124">
                <circle className="ats-circle-track" cx="62" cy="62" r={RADIUS} />
                <circle
                  className="ats-circle-progress"
                  cx="62"
                  cy="62"
                  r={RADIUS}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="ats-circle-text">
                <span className="ats-circle-value">{result.score}%</span>
                <span className="ats-circle-unit">ATS score</span>
              </div>
            </div>

            <div className="ats-score-summary">
              <span className="ats-badge">{result.label}</span>
              <p>{TONE_MESSAGES[result.tone]}</p>
            </div>
          </div>

          <div className="ats-breakdown">
            {result.breakdown.map((b) => {
              const pct = Math.round((b.earned / b.max) * 100);
              const cls = pct >= 100 ? "full" : pct < 40 ? "low" : "";
              return (
                <div className="ats-bar-row" key={b.key}>
                  <span>{b.label}</span>
                  <div className="ats-bar-track">
                    <div className={`ats-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ats-bar-points">
                    {b.earned}/{b.max}
                  </span>
                </div>
              );
            })}
          </div>

          {result.strengths.length > 0 && (
            <div className="ats-section strengths">
              <h3>Strengths</h3>
              <ul>
                {result.strengths.map((s, i) => (
                  <li key={i}>
                    <CheckCircle2 size={15} />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.missing.length > 0 && (
            <div className="ats-section missing">
              <h3>Missing Items</h3>
              <ul>
                {result.missing.map((m, i) => (
                  <li key={i}>
                    <AlertTriangle size={15} />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ats-section suggestions">
            <h3>Suggestions</h3>
            <ul>
              {result.suggestions.map((s, i) => (
                <li key={i}>
                  <Lightbulb size={15} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ats-modal-footer">
          <button type="button" className="ats-done-btn" onClick={onClose}>
            Back to editing
          </button>
        </div>
      </div>
    </div>
  );
}