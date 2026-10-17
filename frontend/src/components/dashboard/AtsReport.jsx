import React from "react";
import { CheckCircle2, AlertTriangle, Lightbulb, XCircle, Info } from "lucide-react";
import "../editor/AtsScoreModal.css";
import "./AtsReport.css";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TONE_MESSAGES = {
  excellent: "Strong match. Fine-tune and apply.",
  good: "Solid. A few fixes will make it stand out to recruiters' searches.",
  fair: "Decent base, but you may rank below stronger applicants.",
  poor: "Likely to be filtered out. Fix the items below first.",
};

export default function AtsReport({ result, header }) {
  const offset = CIRCUMFERENCE - (result.score / 100) * CIRCUMFERENCE;
  const job = result.job;

  return (
    <div className={`ats-report ats-tone-${result.tone}`}>
      {header}

      <div className={`ats-mode-banner ${result.mode}`}>
        <Info size={15} />
        {result.mode === "job" ? (
          <span>
            Scored against the job description you pasted
            {job?.title ? <> · <b>{job.title}</b></> : null}
            {result.domain ? <> · {result.domain}</> : null}
          </span>
        ) : (
          <span>
            <b>Resume-quality score only.</b> Paste a job description above to get a job-specific keyword and requirements match.
          </span>
        )}
      </div>

      <div className="ats-report-top">
        <div className="ats-score-top">
          <div className="ats-circle-wrap">
            <svg width="124" height="124" viewBox="0 0 124 124">
              <circle className="ats-circle-track" cx="62" cy="62" r={RADIUS} />
              <circle
                className="ats-circle-progress"
                cx="62" cy="62" r={RADIUS}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="ats-circle-text">
              <span className="ats-circle-value">{result.score}</span>
              <span className="ats-circle-unit">/ 100</span>
            </div>
          </div>

          <div className="ats-score-summary">
            <span className="ats-badge">{result.label}</span>
            <p>{TONE_MESSAGES[result.tone]}</p>
            <div className="ats-stats">
              <span><b>{result.stats.bullets}</b> bullets</span>
              <span><b>{result.stats.quantified}</b> quantified</span>
              <span><b>{result.stats.strongVerbs}</b> strong verbs</span>
              <span><b>{result.stats.skills}</b> skills</span>
            </div>
          </div>
        </div>

        <div className="ats-breakdown">
          {result.breakdown.map((b) => {
            const pct = b.max ? Math.round((b.earned / b.max) * 100) : 0;
            const cls = pct >= 90 ? "full" : pct < 50 ? "low" : "";
            return (
              <div className="ats-bar-row" key={b.key}>
                <span>{b.label}</span>
                <div className="ats-bar-track">
                  <div className={`ats-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="ats-bar-points">{Math.round(b.earned)}/{Math.round(b.max)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {job && (
        <div className="ats-job-panel">
          <div className="ats-section">
            <h3>
              Keywords from the job posting
              <small>{job.matched.length} of {job.keywordCount} found</small>
            </h3>
            <div className="ats-chips">
              {job.matched.map((k) => (
                <span
                  key={`m-${k.term}`}
                  className={`ats-chip ${k.where === "experience" ? "ok" : "list"}`}
                  title={k.where === "experience" ? "Found in your experience/projects" : "Found only in skills/summary. Also use it in a bullet"}
                >
                  {k.term}
                </span>
              ))}
              {job.missingRequired.map((t) => (
                <span key={`r-${t}`} className="ats-chip no" title="Required, not found in your resume">{t}</span>
              ))}
              {job.missingPreferred.map((t) => (
                <span key={`p-${t}`} className="ats-chip pref" title="Preferred / secondary, not found">{t}</span>
              ))}
            </div>
            <div className="ats-legend">
              <span><i className="dot ok" /> in experience</span>
              <span><i className="dot list" /> skills only</span>
              <span><i className="dot no" /> required, missing</span>
              <span><i className="dot pref" /> preferred, missing</span>
            </div>
          </div>

          {job.checks.length > 0 && (
            <div className="ats-section">
              <h3>Job requirements</h3>
              <ul className="ats-req-list">
                {job.checks.map((c, i) => (
                  <li key={i} className={`req-${c.status}`}>
                    {c.status === "ok" ? <CheckCircle2 size={16} /> : c.status === "warn" ? <AlertTriangle size={16} /> : <XCircle size={16} />}
                    <div>
                      <b>{c.label}</b>
                      <small>{c.detail}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="ats-report-lists">
        {result.strengths.length > 0 && (
          <div className="ats-section strengths">
            <h3>Strengths</h3>
            <ul>{result.strengths.map((s, i) => <li key={i}><CheckCircle2 size={15} /><span>{s}</span></li>)}</ul>
          </div>
        )}
        {result.missing.length > 0 && (
          <div className="ats-section missing">
            <h3>Issues found</h3>
            <ul>{result.missing.map((m, i) => <li key={i}><AlertTriangle size={15} /><span>{m}</span></li>)}</ul>
          </div>
        )}
        <div className="ats-section suggestions">
          <h3>How to improve</h3>
          <ul>{result.suggestions.map((s, i) => <li key={i}><Lightbulb size={15} /><span>{s}</span></li>)}</ul>
        </div>
      </div>

      <p className="ats-disclaimer">
        Real applicant tracking systems (Workday, Greenhouse, Lever) don't publish a score, and every resume checker uses its own model,
        so numbers differ between tools. This report shows exactly how your resume matches the job text you provide and why.
      </p>
    </div>
  );
}