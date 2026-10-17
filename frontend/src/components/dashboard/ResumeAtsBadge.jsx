import React, { useEffect, useMemo, useState } from "react";
import { getResume } from "../../api/resumeApi";
import { analyzeResume, parseResumeRecord } from "../../utils/atsAnalyzer";
import AtsScoreModal from "../editor/AtsScoreModal";
import "./ResumeAtsBadge.css";

// Usage: <ResumeAtsBadge resume={resumeRecordFromList} />
// Works whether or not the list API includes resumeData: it lazily loads the
// full resume once if needed.
export default function ResumeAtsBadge({ resume: record }) {
  const [loaded, setLoaded] = useState(null);
  const [open, setOpen] = useState(false);

  const fromRecord = useMemo(() => parseResumeRecord(record), [record]);
  const resume = fromRecord || loaded;

  useEffect(() => {
    if (fromRecord || !record?.id) return undefined;
    let cancelled = false;
    getResume(record.id)
      .then((full) => {
        if (!cancelled) setLoaded(parseResumeRecord(full));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fromRecord, record?.id]);

  const result = useMemo(() => (resume ? analyzeResume(resume) : null), [resume]);

  if (!result) {
    return <span className="dash-ats-badge dash-ats-loading">ATS …</span>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="dash-ats-wrap">
      <button
        type="button"
        className={`dash-ats-badge tone-${result.tone}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`ATS score: ${result.score}/100 (${result.label}). Click for details`}
      >
        <span className="dash-ats-ring" style={{ "--p": result.score }}>
          <span>{result.score}</span>
        </span>
        <span className="dash-ats-text">ATS · {result.label}</span>
      </button>

      <AtsScoreModal open={open} onClose={() => setOpen(false)} resume={resume} />
    </div>
  );
}