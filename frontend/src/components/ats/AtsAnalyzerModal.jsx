import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  ArrowRight,
  Copy,
  Check,
  Info,
  RefreshCw,
  Pencil,
  Target,
  ShieldCheck,
  FileSearch,
  Layers,
  BrainCircuit,
  ListChecks,
  Clock,
} from "lucide-react";

import AtsReport from "../dashboard/AtsReport";
import { analyzeAts } from "../../api/atsApi";
import { analyzeResume as analyzeResumeOffline } from "../../utils/atsAnalyzer";
import { contentSignature } from "../../utils/atsStorage";
import "./AtsAnalyzerModal.css";

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_JD_CHARS = 20000;

const SECTION_LABELS = {
  personal: "Personal details",
  summary: "Summary",
  education: "Education",
  internships: "Internships",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certificates",
  achievements: "Awards",
  languages: "Languages",
  involvement: "Activities",
};

const CATEGORY_LABELS = {
  structure: "Structure & completeness",
  impact: "Experience impact",
  formatting: "Formatting & readability",
  targeting: "Role targeting",
};

const LOADING_STEPS = [
  { at: 0, label: "Reading your resume and target", Icon: FileSearch },
  { at: 3, label: "Retrieving matching role knowledge", Icon: Layers },
  { at: 7, label: "Matching your evidence to requirements", Icon: BrainCircuit },
  { at: 12, label: "Writing your action plan", Icon: ListChecks },
];

const TIPS = [
  "ATS parsers read standard section headings like Skills, Experience and Education most reliably.",
  "Bullets that start with an action verb and include a number stand out to recruiters.",
  "A skill shown inside an experience bullet counts for more than one that is only listed.",
  "Keep contact details in the page body, not in a header or footer.",
  "Tailor your summary to the job title you are applying for.",
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "keywords", label: "Keywords" },
  { id: "requirements", label: "Requirements" },
  { id: "plan", label: "Action plan" },
  { id: "checks", label: "All checks" },
];

function formatPoints(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatWhen(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function StatusIcon({ status, size = 16 }) {
  if (status === "pass" || status === "met") {
    return <CheckCircle2 size={size} className="atsx-icon pass" aria-label="Passed" />;
  }
  if (status === "warn" || status === "partial") {
    return <AlertTriangle size={size} className="atsx-icon warn" aria-label="Needs attention" />;
  }
  return <XCircle size={size} className="atsx-icon fail" aria-label="Missing" />;
}

function ScoreRing({ score, tone }) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <div className={`atsx-ring tone-${tone}`}>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`ATS score ${score} out of 100`}>
        <circle className="atsx-ring-track" cx="70" cy="70" r={RADIUS} />
        <circle
          className="atsx-ring-value"
          cx="70"
          cy="70"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="atsx-ring-text">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

export default function AtsAnalyzerModal({ open, onClose, resume, resumeId, record, onRecordChange, onGoToStep }) {
  const [viewState, setView] = useState(null);
  const [titleOverride, setTitleOverride] = useState(null);
  const [descriptionDraft, setJobDescription] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState("overview");
  const [offline, setOffline] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(-1);
  const [confirmRerun, setConfirmRerun] = useState(false);

  const controllerRef = useRef(null);
  const startedAtRef = useRef(0);
  const closeButtonRef = useRef(null);

  const result = record?.result ?? null;
  const analyzedAt = record?.analyzedAt ?? null;
  const view = viewState ?? (result ? "result" : "setup");
  const jobTitle = titleOverride ?? record?.jobTitle ?? resume?.role ?? "";
  const jobDescription = descriptionDraft ?? record?.jobDescription ?? "";
  const currentSignature = useMemo(() => (open ? contentSignature(resume) : ""), [open, resume]);
  const isStale = Boolean(result) && record.signature !== currentSignature;
  const sameTarget =
    Boolean(record) && (record.jobTitle ?? "") === jobTitle && (record.jobDescription ?? "") === jobDescription;
  const hasDescription = jobDescription.trim().length > 0;

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (confirmRerun) setConfirmRerun(false);
      else onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, confirmRerun]);

  useEffect(() => {
    if (view !== "loading") return undefined;

    const id = setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 300);

    return () => clearInterval(id);
  }, [view]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const runAnalysis = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const signature = contentSignature(resume);
    startedAtRef.current = Date.now();
    setElapsed(0);
    setError(null);
    setOffline(null);
    setConfirmRerun(false);
    setView("loading");

    try {
      const data = await analyzeAts(
        { resume, jobTitle, jobDescription, resumeId, contentSignature: signature },
        { signal: controller.signal }
      );

      onRecordChange?.({ result: data, signature, analyzedAt: Date.now(), jobTitle, jobDescription });
      setTitleOverride(null);
      setJobDescription(null);
      setTab("overview");
      setView("result");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err);
      setView("error");
    }
  }, [resume, resumeId, jobTitle, jobDescription, onRecordChange]);

  const requestAnalysis = () => {
    if (result && !isStale && sameTarget) setConfirmRerun(true);
    else runAnalysis();
  };

  const cancelAnalysis = () => {
    controllerRef.current?.abort();
    setView(result ? "result" : "setup");
  };

  const runOfflineCheck = () => {
    setOffline(analyzeResumeOffline(resume, { jobDescription, jobTitle }));
    setView("offline");
  };

  const goTo = (section) => {
    if (!section) return;
    onGoToStep?.(section);
    onClose();
  };

  const copyText = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(-1), 1600);
  };

  if (!open) return null;

  const tone = result?.tone || "fair";
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "keywords") return (result?.skills?.matched.length || 0) + (result?.skills?.missing.length || 0) > 0;
    if (t.id === "requirements") return (result?.requirements?.length || 0) > 0;
    return true;
  });

  const activeStep = LOADING_STEPS.reduce((acc, step, i) => (elapsed >= step.at ? i : acc), 0);
  const progress = Math.min(94, Math.round(100 * (1 - Math.exp(-elapsed / 9))));
  const tip = TIPS[Math.floor(elapsed / 4) % TIPS.length];

  const renderSetup = () => (
    <div className="atsx-setup">
      <p className="atsx-lead">
        Choose what to measure your resume against. Paste a job description for the most accurate result, or just
        enter a job title.
      </p>

      <div className="atsx-field">
        <label htmlFor="atsx-title">Target job title</label>
        <input
          id="atsx-title"
          type="text"
          value={jobTitle}
          maxLength={150}
          placeholder="e.g. Java Backend Developer"
          onChange={(e) => setTitleOverride(e.target.value)}
        />
      </div>

      <div className="atsx-field">
        <label htmlFor="atsx-jd">
          Job description <span className="atsx-optional">optional</span>
        </label>
        <textarea
          id="atsx-jd"
          rows={9}
          value={jobDescription}
          maxLength={MAX_JD_CHARS}
          placeholder="Paste the full job posting here: responsibilities, requirements and preferred skills."
          onChange={(e) => setJobDescription(e.target.value)}
        />
        <div className="atsx-counter">
          {jobDescription.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
        </div>
      </div>

      <div className="atsx-modes" aria-live="polite">
        <div className={`atsx-mode ${hasDescription ? "active" : ""}`}>
          <Target size={16} />
          <div>
            <strong>With a job description</strong>
            <span>Scored against that posting's skills, duties and qualifications.</span>
          </div>
        </div>
        <div className={`atsx-mode ${!hasDescription ? "active" : ""}`}>
          <Sparkles size={16} />
          <div>
            <strong>Without one</strong>
            <span>Scored against the typical requirements for your job title, retrieved from a role knowledge base.</span>
          </div>
        </div>
      </div>

      <div className="atsx-actions">
        {result && (
          <button type="button" className="atsx-btn ghost" onClick={() => setView("result")}>
            Back to results
          </button>
        )}
        <button type="button" className="atsx-btn primary" onClick={requestAnalysis}>
          <Sparkles size={16} />
          {result ? "Re-analyze resume" : "Analyze resume"}
        </button>
      </div>
      <p className="atsx-fineprint">Usually takes 5 to 15 seconds. Your photo is never sent.</p>
    </div>
  );

  const renderLoading = () => (
    <div className="atsx-loading" role="status" aria-live="polite">
      <div className="atsx-loading-card">
        <div className="atsx-orbit" aria-hidden="true">
          <span className="atsx-orbit-ring" />
          <span className="atsx-orbit-ring second" />
          <BrainCircuit size={26} />
        </div>

        <h3>Analyzing your resume</h3>
        <p className="atsx-loading-sub">{LOADING_STEPS[activeStep].label}...</p>

        <div className="atsx-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="atsx-progress-meta">
          <span>{progress}%</span>
          <span>
            <Clock size={12} /> {Math.floor(elapsed)}s
          </span>
        </div>

        <ol className="atsx-steps">
          {LOADING_STEPS.map((step, i) => {
            const StepIcon = step.Icon;
            return (
              <li key={step.label} className={i < activeStep ? "done" : i === activeStep ? "current" : ""}>
                <span className="atsx-step-icon">{i < activeStep ? <Check size={14} /> : <StepIcon size={14} />}</span>
                {step.label}
              </li>
            );
          })}
        </ol>

        <button type="button" className="atsx-btn ghost" onClick={cancelAnalysis}>
          Cancel
        </button>
      </div>

      <div className="atsx-preview" aria-hidden="true">
        <p className="atsx-preview-title">Your report will include</p>
        <div className="atsx-skel-hero">
          <span className="atsx-skel circle" />
          <div className="atsx-skel-lines">
            <span className="atsx-skel line w60" />
            <span className="atsx-skel line w90" />
            <span className="atsx-skel line w75" />
          </div>
        </div>
        <div className="atsx-skel-stats">
          <span className="atsx-skel tile" />
          <span className="atsx-skel tile" />
          <span className="atsx-skel tile" />
        </div>
        {["Keyword & skill match", "Requirements fit", "Experience impact", "Structure & completeness"].map((label) => (
          <div key={label} className="atsx-skel-bar">
            <small>{label}</small>
            <span className="atsx-skel line" />
          </div>
        ))}
        <p className="atsx-tip">
          <Lightbulb size={14} /> {tip}
        </p>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="atsx-error" role="alert">
      <AlertTriangle size={28} />
      <h3>{error?.status === 429 ? "Please wait a moment" : "Analysis unavailable"}</h3>
      <p>{error?.message || "Something went wrong."}</p>
      <div className="atsx-actions center">
        <button type="button" className="atsx-btn primary" onClick={runAnalysis}>
          <RefreshCw size={15} />
          Try again
        </button>
        <button type="button" className="atsx-btn ghost" onClick={runOfflineCheck}>
          Run quick offline check
        </button>
        <button type="button" className="atsx-btn ghost" onClick={() => setView("setup")}>
          Edit target
        </button>
      </div>
      <p className="atsx-fineprint">The offline check works without the server's AI and scores your resume in your browser.</p>
    </div>
  );

  const renderOffline = () => (
    <div className="atsx-offline">
      <div className="atsx-note info">
        <Info size={15} />
        <span>
          This is the quick offline check. It uses a built-in keyword list rather than semantic matching.
          <button type="button" className="atsx-link" onClick={runAnalysis}>
            Try the full analysis again
          </button>
        </span>
      </div>
      {offline && <AtsReport result={offline} />}
    </div>
  );

  const targetLine = () => {
    const t = result.target;
    if (t.sourceKind === "job-description") return "Scored against your pasted job description";
    if (t.sourceKind === "role-profile") return `Scored against typical requirements for ${t.title || "this role"}`;
    if (t.sourceKind === "ai-inferred") return `Scored against AI-inferred requirements for ${t.title || "this role"}`;
    return "Resume-quality score only";
  };

  const sourceTitle = (id) => result.sources.find((s) => s.id === id)?.title || id;

  const renderOverview = () => (
    <>
      <section className="atsx-section">
        <h4>Score breakdown</h4>
        <ul className="atsx-bars">
          {result.components.map((c) => {
            const barTone = c.percent >= 80 ? "good" : c.percent >= 55 ? "warn" : "bad";
            return (
              <li key={c.key}>
                <div className="atsx-bar-head">
                  <span>{c.label}</span>
                  <span className="atsx-bar-points">
                    {formatPoints(c.earned)} / {formatPoints(c.max)}
                  </span>
                </div>
                <div className="atsx-bar" aria-hidden="true">
                  <span className={`atsx-bar-fill ${barTone}`} style={{ width: `${c.percent}%` }} />
                </div>
                <p className="atsx-bar-note">{c.summary}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {result.strengths.length > 0 && (
        <section className="atsx-section">
          <h4>What's working</h4>
          <ul className="atsx-list">
            {result.strengths.map((s) => (
              <li key={s}>
                <CheckCircle2 size={16} className="atsx-icon pass" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.actions.length > 0 && (
        <section className="atsx-section">
          <div className="atsx-section-head">
            <h4>Biggest improvements</h4>
            <button type="button" className="atsx-link" onClick={() => setTab("plan")}>
              See full action plan
            </button>
          </div>
          <ul className="atsx-list">
            {result.actions.slice(0, 3).map((a) => (
              <li key={a.title}>
                <Lightbulb size={16} className="atsx-icon tip" />
                <span>
                  <strong>{a.title}</strong>
                  <em className="atsx-gain">+{formatPoints(a.impact)} pts</em>
                  <br />
                  {a.how}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );

  const renderKeywords = () => {
    const { matched, missing, found, total, coveragePercent } = result.skills;
    const used = matched.filter((m) => m.where === "experience");
    const semantic = matched.filter((m) => m.where === "semantic");
    const listedOnly = matched.filter((m) => m.where === "skills-only");
    const missingRequired = missing.filter((m) => m.required);
    const missingPreferred = missing.filter((m) => !m.required);

    return (
      <>
        <div className="atsx-coverage">
          <strong>{coveragePercent}%</strong>
          <span>
            skill coverage ({found} of {total} found)
          </span>
        </div>

        {used.length > 0 && (
          <section className="atsx-section">
            <h4>Shown in your experience or projects</h4>
            <div className="atsx-chips">
              {used.map((m) => (
                <span key={m.term} className="atsx-chip good" title={m.evidence}>
                  <Check size={12} />
                  {m.term}
                  {!m.required && <small>preferred</small>}
                </span>
              ))}
            </div>
          </section>
        )}

        {semantic.length > 0 && (
          <section className="atsx-section">
            <h4>Demonstrated by related work</h4>
            <div className="atsx-chips">
              {semantic.map((m) => (
                <span key={m.term} className="atsx-chip info" title={m.evidence}>
                  {m.term}
                </span>
              ))}
            </div>
            <p className="atsx-hint">Matched by meaning, not by exact wording. Naming the skill outright is safer for ATS filters.</p>
          </section>
        )}

        {listedOnly.length > 0 && (
          <section className="atsx-section">
            <h4>Listed in Skills only</h4>
            <div className="atsx-chips">
              {listedOnly.map((m) => (
                <button key={m.term} type="button" className="atsx-chip warn clickable" onClick={() => goTo("experience")}>
                  {m.term}
                </button>
              ))}
            </div>
            <p className="atsx-hint">Mention these inside a bullet so recruiters see where you used them.</p>
          </section>
        )}

        {missingRequired.length > 0 && (
          <section className="atsx-section">
            <h4>Missing: required</h4>
            <div className="atsx-chips">
              {missingRequired.map((m) => (
                <button key={m.term} type="button" className="atsx-chip bad clickable" onClick={() => goTo(m.section)}>
                  <X size={12} />
                  {m.term}
                </button>
              ))}
            </div>
            <p className="atsx-hint">Add only the skills you genuinely have.</p>
          </section>
        )}

        {missingPreferred.length > 0 && (
          <section className="atsx-section">
            <h4>Missing: preferred</h4>
            <div className="atsx-chips">
              {missingPreferred.map((m) => (
                <button key={m.term} type="button" className="atsx-chip muted clickable" onClick={() => goTo(m.section)}>
                  {m.term}
                </button>
              ))}
            </div>
          </section>
        )}
      </>
    );
  };

  const renderRequirements = () => (
    <ul className="atsx-reqs">
      {result.requirements.map((r) => (
        <li key={r.text} className={`atsx-req ${r.status}`}>
          <StatusIcon status={r.status} />
          <div>
            <p className="atsx-req-text">
              {r.text}
              <span className="atsx-tag">{r.type}</span>
            </p>
            {r.evidence && (
              <blockquote>
                {r.evidence}
                {r.evidenceLabel && <cite>{r.evidenceLabel}</cite>}
              </blockquote>
            )}
            <p className="atsx-req-reason">{r.reason}</p>
            {r.status !== "met" && (
              <button type="button" className="atsx-link" onClick={() => goTo(r.section)}>
                Open {SECTION_LABELS[r.section]?.toLowerCase() || "section"} <ArrowRight size={12} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  const renderPlan = () => (
    <>
      {result.actions.length === 0 && <p className="atsx-empty">No open improvements. Your resume covers every check.</p>}

      <ol className="atsx-plan">
        {result.actions.map((a, i) => (
          <li key={a.title}>
            <div className="atsx-plan-head">
              <span className="atsx-plan-num">{i + 1}</span>
              <h5>{a.title}</h5>
              <em className="atsx-gain">+{formatPoints(a.impact)} pts</em>
            </div>
            <p className="atsx-plan-why">{a.why}</p>
            <p className="atsx-plan-how">{a.how}</p>
            <div className="atsx-plan-foot">
              {a.sources.map((id) => (
                <span key={id} className="atsx-source" title="Retrieved ATS guidance">
                  <ShieldCheck size={12} />
                  {sourceTitle(id)}
                </span>
              ))}
              <button type="button" className="atsx-link" onClick={() => goTo(a.section)}>
                Open {SECTION_LABELS[a.section]?.toLowerCase() || "section"} <ArrowRight size={12} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {result.rewrites.length > 0 && (
        <section className="atsx-section">
          <h4>Suggested bullet rewrites</h4>
          <p className="atsx-hint">
            Placeholders like [X%] need your real numbers. Only use figures that are true.
          </p>
          {result.rewrites.map((r, i) => (
            <div key={r.original} className="atsx-rewrite">
              <div className="before">
                <small>Before</small>
                <p>{r.original}</p>
              </div>
              <div className="after">
                <small>After</small>
                <p>{r.improved}</p>
                {r.reason && <span className="atsx-rewrite-reason">{r.reason}</span>}
              </div>
              <div className="atsx-rewrite-actions">
                <button type="button" className="atsx-link" onClick={() => copyText(r.improved, i)}>
                  {copiedIndex === i ? <Check size={13} /> : <Copy size={13} />}
                  {copiedIndex === i ? "Copied" : "Copy"}
                </button>
                <button type="button" className="atsx-link" onClick={() => goTo(r.section)}>
                  Open {SECTION_LABELS[r.section]?.toLowerCase() || "section"} <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {result.sources.length > 0 && (
        <section className="atsx-section">
          <h4>Based on</h4>
          <div className="atsx-chips">
            {result.sources.map((s) => (
              <span key={s.id} className="atsx-source">
                <ShieldCheck size={12} />
                {s.kind === "role" ? `Role profile: ${s.title}` : `ATS guide: ${s.title}`}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const renderChecks = () => {
    const groups = Object.keys(CATEGORY_LABELS)
      .map((cat) => ({ cat, checks: result.checks.filter((c) => c.category === cat) }))
      .filter((g) => g.checks.length > 0);

    return groups.map(({ cat, checks }) => (
      <section key={cat} className="atsx-section">
        <h4>
          {CATEGORY_LABELS[cat]}
          <small>
            {checks.filter((c) => c.status === "pass").length} of {checks.length} passed
          </small>
        </h4>
        <ul className="atsx-checks">
          {checks.map((c) => (
            <li key={c.key} className={c.status}>
              <StatusIcon status={c.status} />
              <div>
                <p className="atsx-check-label">
                  {c.label}
                  <span>
                    {formatPoints(c.points)} / {formatPoints(c.max)}
                  </span>
                </p>
                <p className="atsx-check-detail">{c.detail}</p>
                {c.status !== "pass" && c.tip && <p className="atsx-check-tip">{c.tip}</p>}
                {c.status !== "pass" && (
                  <button type="button" className="atsx-link" onClick={() => goTo(c.section)}>
                    Fix this <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    ));
  };

  const renderResult = () => (
    <div className={`atsx-result tone-${tone}`}>
      <div className={`atsx-hero tone-${tone}`}>
        <ScoreRing score={result.score} tone={tone} />
        <div className="atsx-hero-text">
          <span className={`atsx-grade tone-${tone}`}>{result.grade}</span>
          <h3>{result.headline}</h3>
          <p>{result.summary}</p>
          <div className="atsx-target">
            <Target size={13} />
            <span>{targetLine()}</span>
            {result.target.title && <b>{result.target.title}</b>}
          </div>
        </div>
      </div>

      <div className="atsx-stats">
        {result.skills.total > 0 && (
          <div className="atsx-stat">
            <strong>{result.skills.coveragePercent}%</strong>
            <span>Skill coverage</span>
          </div>
        )}
        {result.requirements.length > 0 && (
          <div className="atsx-stat">
            <strong>
              {result.requirements.filter((r) => r.status === "met").length}/{result.requirements.length}
            </strong>
            <span>Requirements met</span>
          </div>
        )}
        <div className="atsx-stat">
          <strong>
            {result.checks.filter((c) => c.status === "pass").length}/{result.checks.length}
          </strong>
          <span>Checks passed</span>
        </div>
        <div className="atsx-stat">
          <strong>{result.stats.quantifiedPercent}%</strong>
          <span>Quantified bullets</span>
        </div>
      </div>

      {isStale && (
        <div className="atsx-note stale" role="status">
          <RefreshCw size={15} />
          <span>
            Your resume changed after this analysis.
            <button type="button" className="atsx-link" onClick={runAnalysis}>
              Re-analyze
            </button>
          </span>
        </div>
      )}

      {result.target.sourceKind === "ai-inferred" && (
        <div className="atsx-note warn">
          <AlertTriangle size={15} />
          <span>
            This job title isn't in the role knowledge base, so typical requirements were inferred by AI. Paste a job
            description for a precise match.
          </span>
        </div>
      )}

      {result.target.sourceKind === "none" && (
        <div className="atsx-note info">
          <Info size={15} />
          <span>
            Only resume quality was scored. Add a job title or paste a job description for a job-specific score.
            <button type="button" className="atsx-link" onClick={() => setView("setup")}>
              Set target
            </button>
          </span>
        </div>
      )}

      {result.meta.scoreCaps.map((cap) => (
        <div key={cap} className="atsx-note warn">
          <AlertTriangle size={15} />
          <span>{cap}</span>
        </div>
      ))}

      {result.meta.warnings.map((w) => (
        <div key={w} className="atsx-note info">
          <Info size={15} />
          <span>{w}</span>
        </div>
      ))}

      <div className="atsx-tabs" role="tablist" aria-label="Analysis sections">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`atsx-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="atsx-tabpanel" role="tabpanel">
        {tab === "overview" && renderOverview()}
        {tab === "keywords" && renderKeywords()}
        {tab === "requirements" && renderRequirements()}
        {tab === "plan" && renderPlan()}
        {tab === "checks" && renderChecks()}
      </div>

      <p className="atsx-engine">
        {result.meta.engine === "rag"
          ? `Semantic retrieval (${result.meta.vectorStore}${result.meta.embeddingModel ? `, ${result.meta.embeddingModel}` : ""})`
          : "Rules-based analysis (semantic search was unavailable)"}
        {result.meta.llmUsed ? " · AI-verified matches and advice" : " · standard advice"}
        {` · ${(result.meta.tookMs / 1000).toFixed(1)}s`}. The score is calculated by fixed rules; AI only verifies matches
        and words the advice.
      </p>
    </div>
  );

  return (
    <div
      className="atsx-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="atsx-dialog" role="dialog" aria-modal="true" aria-label="ATS score analyzer">
        <header className="atsx-header">
          <div>
            <h2>ATS score analyzer</h2>
            <p>
              {view === "result" && result
                  ? `Last analyzed ${formatWhen(analyzedAt)} · ${isStale ? "resume edited since" : "no changes since"}`
                : "See how an applicant tracking system will read your resume"}
            </p>
          </div>

          <div className="atsx-header-actions">
            {view === "result" && (
              <>
                <button
                  type="button"
                  className={`atsx-btn small ${isStale ? "primary" : "ghost"}`}
                  onClick={requestAnalysis}
                >
                  <Pencil size={13} />
                  Edit target
                </button>
                <button
                  type="button"
                  className={`atsx-btn small ${isStale ? "primary" : "ghost"}`}
                  onClick={runAnalysis}
                >
                  <RefreshCw size={13} />
                  Re-analyze
                </button>
              </>
            )}
            <button ref={closeButtonRef} type="button" className="atsx-close" onClick={onClose} aria-label="Close ATS analyzer">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="atsx-body">
          {view === "setup" && renderSetup()}
          {view === "loading" && renderLoading()}
          {view === "error" && renderError()}
          {view === "offline" && renderOffline()}
          {view === "result" && result && renderResult()}
        </div>

        {confirmRerun && (
          <div className="atsx-confirm" role="alertdialog" aria-modal="true" aria-labelledby="atsx-confirm-title">
            <div className="atsx-confirm-card">
              <span className="atsx-confirm-icon">
                <Info size={22} />
              </span>
              <h3 id="atsx-confirm-title">You haven't changed anything</h3>
              <p>
                Your resume and target are the same as in your last analysis on {formatWhen(analyzedAt)}. Analyzing
                again will give the same result.
              </p>
              <p className="atsx-confirm-sub">Do you want to re-analyze anyway?</p>
              <div className="atsx-actions center">
                <button type="button" className="atsx-btn ghost" onClick={() => setConfirmRerun(false)}>
                  Keep current result
                </button>
                <button type="button" className="atsx-btn primary" onClick={runAnalysis}>
                  <RefreshCw size={15} />
                  Re-analyze anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}