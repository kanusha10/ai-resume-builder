import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Gauge, Loader2, ChevronDown, Pencil } from "lucide-react";
import { getResume } from "../../api/resumeApi";
import { analyzeResume, parseResumeRecord } from "../../utils/atsAnalyzer";
import AtsReport from "./AtsReport";
import "../editor/AtsScoreModal.css"; // shared ats-* styles
import "./AtsScoreChecker.css";

const resumeLabel = (r) => r.name || r.title || `Resume #${r.id}`;

export default function AtsScoreChecker({ resumes = [] }) {
  const [selectedId, setSelectedId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null); // { result, id, name }

  async function handleAnalyze() {
    if (!selectedId) {
      setError("Please select a saved resume first.");
      return;
    }
    const record = resumes.find((r) => String(r.id) === String(selectedId));
    if (!record) return;

    setLoading(true);
    setError("");

    try {
      let data = null;
      try {
        data = parseResumeRecord(await getResume(record.id));
      } catch {
        data = null;
      }
      if (!data) data = parseResumeRecord(record);
      if (!data) throw new Error("Could not read this resume's content.");

      const result = analyzeResume(data, { jobDescription: jd, jobTitle });
      setAnalysis({ result, id: record.id, name: resumeLabel(record) });
    } catch (err) {
      setAnalysis(null);
      setError(err.message || "Could not analyze this resume.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ats-checker">
      <div className="ats-checker-head">
        <div className="ats-checker-icon">
          <Gauge size={20} />
        </div>
        <div>
          <h2>ATS Score Checker</h2>
          <p>Paste a job description to see how well a saved resume matches what that company is asking for.</p>
        </div>
      </div>

      <div className="ats-checker-controls">
        <div className="ats-select-wrap">
          <label htmlFor="ats-resume-select">Saved resume</label>
          <div className="ats-select-box">
            <select
              id="ats-resume-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setAnalysis(null);
                setError("");
              }}
            >
              <option value="">Choose a resume to analyze…</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {resumeLabel(r)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>

        <button type="button" className="ats-analyze-btn" onClick={handleAnalyze} disabled={loading || !selectedId}>
          {loading ? <Loader2 size={16} className="ats-spin" /> : <Gauge size={16} />}
          <span>{loading ? "Analyzing..." : "Analyze ATS Score"}</span>
        </button>
      </div>

      <div className="ats-checker-row">
        <div className="ats-checker-title">
          <label htmlFor="ats-job-title">Job title (optional, detected from the first line of the posting if empty)</label>
          <input
            id="ats-job-title"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Backend Developer, Digital Marketing Executive, Financial Analyst"
          />
        </div>
      </div>

      <div className="ats-checker-jd">
        <label htmlFor="ats-checker-jd">Job description (recommended, this is what the score is matched against)</label>
        <textarea
          id="ats-checker-jd"
          rows="7"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full job posting here: responsibilities, requirements, qualifications. The more complete it is, the more accurate the match."
        />
      </div>

      {error && <div className="ats-checker-error">{error}</div>}

      {analysis && (
        <AtsReport
          result={analysis.result}
          header={
            <div className="ats-report-title">
              <span>
                Results for <b>{analysis.name}</b>
              </span>
              <Link to={`/resume/${analysis.id}`} className="ats-edit-link">
                <Pencil size={13} />
                <span>Improve in editor</span>
              </Link>
            </div>
          }
        />
      )}
    </section>
  );
}