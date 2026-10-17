import React from "react";
import { Check } from "lucide-react";

export default function StepNav({
  steps,
  currentStep,
  onSelect,
  isCompleted,
  progressPct,
  completedCount,
  variant = "top", // "top" (editor + preview) | "rail" (form only)
}) {
  const tabs = steps.map((s, index) => {
    const Icon = s.icon;
    const active = currentStep === index;
    const done = isCompleted(index);
    return (
      <button
        key={s.id}
        type="button"
        className={`nav-step ${active ? "active" : ""} ${done ? "completed" : ""}`}
        onClick={() => onSelect(index)}
        title={s.label}
      >
        <span className="nav-badge">{done ? <Check size={11} strokeWidth={3} /> : index + 1}</span>
        <Icon size={15} className="nav-icon" />
        <span className="nav-label">{s.label}</span>
      </button>
    );
  });

  if (variant === "top") {
    return (
      <div className="steps-top">
        <nav className="steps-top-grid">{tabs}</nav>
        <div className="nav-progress">
          <div className="nav-progress-track">
            <div className="nav-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="nav-progress-meta">
            <span>
              {completedCount} of {steps.length - 1} sections filled
            </span>
            <b>{progressPct}%</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="steps-rail">
      <div className="rail-progress-card">
        <div className="rail-progress-head">
          <span>Resume completion</span>
          <b>{progressPct}%</b>
        </div>
        <div className="rail-progress-track">
          <div className="rail-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <small>
          {completedCount} of {steps.length - 1} sections filled
        </small>
      </div>

      <div className="rail-title">Sections</div>
      <nav className="steps-rail-list">{tabs}</nav>
    </aside>
  );
}