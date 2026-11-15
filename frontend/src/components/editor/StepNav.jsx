import React, { useEffect, useRef } from "react";
import { Check, Plus } from "lucide-react";

export default function StepNav({
  steps,
  currentStep,
  onSelect,
  isCompleted,
  progressPct,
  completedCount,
  variant = "top", // "top" (editor + preview) | "rail" (form only)
  onAdd,
}) {
  const countable = steps.filter((s) => !s.meta).length;
  const navRef = useRef(null);

  useEffect(() => {
    navRef.current?.querySelector(".nav-step.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentStep, steps.length]);

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

  const addButton = onAdd ? (
    <button type="button" className="nav-step nav-step-add" onClick={onAdd} title="Add your own section">
      <span className="nav-badge">
        <Plus size={11} strokeWidth={3} />
      </span>
      <span className="nav-label">Add</span>
    </button>
  ) : null;

  if (variant === "top") {
    return (
      <div className="steps-top">
        <nav className="steps-top-grid" ref={navRef}>
          {tabs}
          {addButton}
        </nav>
        <div className="nav-progress">
          <div className="nav-progress-track">
            <div className="nav-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="nav-progress-meta">
            <span>
              {completedCount} of {countable} sections filled
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
          {completedCount} of {countable} sections filled
        </small>
      </div>

      <div className="rail-title">Sections</div>
      <nav className="steps-rail-list" ref={navRef}>
        {tabs}
        {addButton}
      </nav>
    </aside>
  );
}