import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import EditorHeader from "../components/editor/EditorHeader";
import PersonalSection from "../components/editor/PersonalSection";
import EducationSection from "../components/editor/EducationSection";
import ExperienceSection from "../components/editor/ExperienceSection";
import ProjectsSection from "../components/editor/ProjectsSection";
import SkillsSection from "../components/editor/SkillsSection";
import CertificationsSection from "../components/editor/CertificationsSection";
import PhotoUpload from "../components/editor/PhotoUpload";
import SectionOrderPanel from "../components/editor/SectionOrderPanel";
import ListSectionEditor from "../components/editor/ListSectionEditor";
import StepNav from "../components/editor/StepNav";

import ResumePreview from "../components/preview/ResumePreview";
import { createResume, getResume, updateResume } from "../api/resumeApi";
import { exportPreviewToPdf } from "../utils/previewExport";
import { emptyResume } from "../utils/resumeDefaults";
import { DEFAULT_SECTION_ORDER, normalizeSectionOrder } from "../utils/sectionOrder";
import { getToken } from "../utils/auth";

import {
  User,
  FileText,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Cpu,
  Award,
  Trophy,
  Languages,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  Save,
  FastForward,
  Sparkles,
  ListOrdered,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
} from "lucide-react";

import "./ResumeEditor.css";

const STEPS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "internships", label: "Internships", icon: Building2 },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "skills", label: "Skills", icon: Cpu },
  { id: "certifications", label: "Certificates", icon: Award },
  { id: "achievements", label: "Awards", icon: Trophy },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "involvement", label: "Activities", icon: Users },
  { id: "layout", label: "Order", icon: ListOrdered },
];

const INTERNSHIP_FIELDS = [
  { key: "role", label: "Role / Designation", placeholder: "e.g. Java Development Intern", span: 3 },
  { key: "company", label: "Company / Organization", placeholder: "e.g. Oasis Infobyte", span: 3 },
  { key: "location", label: "Location", placeholder: "Remote / City", span: 2 },
  { key: "startDate", label: "Start Date", placeholder: "Aug 2024", span: 2 },
  { key: "endDate", label: "End Date", placeholder: "Sep 2024", span: 2 },
  {
    key: "description",
    label: "Tasks & Learnings",
    type: "textarea",
    rows: 4,
    placeholder:
      "• Developed an ATM Interface and Digital Library System in Java...\n• Implemented JDBC database operations",
    ai: { type: "internship", context: (i) => `Role: ${i.role || ""}, Company: ${i.company || ""}` },
  },
];

const ACHIEVEMENT_FIELDS = [
  { key: "title", label: "Title / Award", placeholder: "e.g. Selected for NAIN 2.0 Project Funding", span: 3 },
  { key: "issuer", label: "Organization / Event / Year", placeholder: "e.g. Dept of IT BT & ST, Govt of Karnataka", span: 3 },
  { key: "description", label: "Description (optional)", placeholder: "Short detail about rank, prize, or outcome" },
];

const LANGUAGE_FIELDS = [
  { key: "name", label: "Language", placeholder: "e.g. English, Kannada, Hindi", span: 3 },
  {
    key: "proficiency",
    label: "Proficiency",
    type: "select",
    span: 3,
    options: ["Native / Bilingual", "Fluent / Professional", "Intermediate", "Basic"],
  },
];

const INVOLVEMENT_FIELDS = [
  { key: "role", label: "Role / Position", placeholder: "e.g. Technical Coordinator", span: 2 },
  { key: "organization", label: "Club / Organization", placeholder: "e.g. IEEE Student Branch", span: 2 },
  { key: "year", label: "Duration / Year", placeholder: "e.g. 2024 - 2025", span: 2 },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    rows: 3,
    placeholder: "Organized coding bootcamps and coordinated tech symposium events...",
  },
];
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];

function ResumeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const initialName = sessionStorage.getItem("pendingResumeName") || "Software Engineer Resume";
  const initialRole = sessionStorage.getItem("pendingResumeRole") || "Software Engineer";

  const [resume, setResume] = useState({
    ...emptyResume,
    name: initialName,
    role: initialRole,
    template: "default",
    color: "#0f172a",
    primaryColor: "#0f172a",
    internships: [],
    achievements: [],
    languages: [],
    involvement: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState("both"); // 'both' | 'editor' | 'preview'
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [personalValidated, setPersonalValidated] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => ZOOM_STEPS.find((s) => s > z + 0.001) || z);
  const zoomOut = () => setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z - 0.001) || z);

  useEffect(() => {
    if (id) {
      sessionStorage.removeItem("importedResumeData");
      sessionStorage.removeItem("pendingResumeName");
      sessionStorage.removeItem("pendingResumeRole");

      async function load() {
        try {
          const data = await getResume(id);
          let parsedData = data.resumeData || data.data;

          if (typeof parsedData === "string") {
            try {
              parsedData = JSON.parse(parsedData);
            } catch {
              parsedData = {};
            }
          }
          parsedData = parsedData || {};

          const loadedColor =
            data.color || parsedData.color || data.primaryColor || parsedData.primaryColor || "#0f172a";

          setResume({
            ...emptyResume,
            ...data,
            ...parsedData,
            name: data.name || parsedData.name || "My Resume",
            role: data.role || parsedData.role || parsedData.personal?.jobTitle || "Software Engineer",
            template: data.template || parsedData.template || "default",
            color: loadedColor,
            primaryColor: loadedColor,
            personal: {
              ...emptyResume.personal,
              ...(parsedData?.personal || data.personal || {}),
            },
            skills: {
              ...emptyResume.skills,
              ...(parsedData?.skills || data.skills || {}),
            },
            internships: parsedData?.internships || data.internships || [],
            achievements: parsedData?.achievements || data.achievements || [],
            languages: parsedData?.languages || data.languages || [],
            involvement: parsedData?.involvement || data.involvement || [],
            sectionOrder: normalizeSectionOrder(parsedData?.sectionOrder || data.sectionOrder),
            hiddenSections: parsedData?.hiddenSections || data.hiddenSections || [],
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }

      load();
    } else {
      const importedJson = sessionStorage.getItem("importedResumeData");
      if (importedJson) {
        try {
          const importedData = JSON.parse(importedJson);
          sessionStorage.removeItem("importedResumeData");

          setResume((prev) => ({
            ...prev,
            ...importedData,
            name: sessionStorage.getItem("pendingResumeName") || "Imported Resume",
            role: sessionStorage.getItem("pendingResumeRole") || "Software Engineer",
            personal: { ...prev.personal, ...(importedData.personal || {}) },
            skills: { ...prev.skills, ...(importedData.skills || {}) },
            internships: importedData.internships || [],
            achievements: importedData.achievements || [],
            languages: importedData.languages || [],
            involvement: importedData.involvement || [],
            sectionOrder: normalizeSectionOrder(importedData.sectionOrder),
            hiddenSections: importedData.hiddenSections || [],
          }));
        } catch (e) {
          console.error("Failed to load imported resume cache:", e);
        }
      }
    }
  }, [id]);

  function updateResumeData(changes) {
    setResume((current) => ({ ...current, ...changes }));
  }

  const addItem = (key, item) =>
    setResume((cur) => ({ ...cur, [key]: [...(cur[key] || []), item] }));

  const removeItem = (key, idx) =>
    setResume((cur) => ({ ...cur, [key]: (cur[key] || []).filter((_, i) => i !== idx) }));

  const updateItem = (key, idx, field, value) =>
    setResume((cur) => ({
      ...cur,
      [key]: (cur[key] || []).map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));

  // Universal Context-Aware AI Enhancement Handler
  const handleAiEnhance = async (type, currentText, callback, context = "") => {
    if (!currentText || !currentText.trim()) {
      setError("Please write some draft points first before clicking Enhance with AI.");
      return;
    }

    setEnhancing(true);
    setError("");

    try {
      const token = getToken();
      const res = await fetch("/api/resumes/ai-enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          text: currentText,
          role: resume.role || "Software Engineer",
          context: context || "",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Enhancement service temporarily unavailable.");
      }

      const data = await res.json();
      if (data.enhancedText) {
        callback(data.enhancedText);
      }
    } catch (err) {
      console.error("AI Enhancement Error:", err);
      setError(err.message || "Could not enhance text.");
    } finally {
      setEnhancing(false);
    }
  };

  const sectionHasContent = (sectionId) => {
    switch (sectionId) {
      case "summary":
        return Boolean(resume.summary?.trim());
      case "skills":
        return Boolean(
          resume.skills && Object.values(resume.skills).some((arr) => Array.isArray(arr) && arr.length > 0)
        );
      default:
        return Array.isArray(resume[sectionId]) && resume[sectionId].length > 0;
    }
  };

  const isStepCompleted = (index) => {
    const step = STEPS[index];
    if (step.id === "personal") return Boolean(resume.personal?.fullName?.trim() && resume.personal?.email?.trim());
    if (step.id === "layout") return false;
    return sectionHasContent(step.id);
  };

  const completedCount = STEPS.filter((s, i) => s.id !== "layout" && isStepCompleted(i)).length;
  const progressPct = Math.round((completedCount / (STEPS.length - 1)) * 100);

  async function saveResume() {
    setSaving(true);
    setError("");

    try {
      const selectedColor = resume.color || resume.primaryColor || "#0f172a";

      const payload = {
        name: resume.name || "My Resume",
        role: resume.role || "Software Engineer",
        resumeData: JSON.stringify(resume),
        template: resume.template || "default",
        color: selectedColor,
        primaryColor: selectedColor,
      };

      if (id) {
        await updateResume(id, payload);
      } else {
        const created = await createResume(payload);
        sessionStorage.removeItem("pendingResumeName");
        sessionStorage.removeItem("pendingResumeRole");

        if (created?.id) {
          navigate(`/resume/${created.id}`, { replace: true });
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save resume.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    await saveResume();
    exportPreviewToPdf("resume-paper", resume.name || "resume");
  }

  const goToStep = (index) => {
    if (currentStep === 0 && index !== 0 && !isStepCompleted(0)) {
      setPersonalValidated(true);
      setError("Please enter your Full Name and Email before switching steps.");
      return;
    }
    setError("");
    setCurrentStep(index);
  };

  const goNext = () => {
    if (currentStep === 0) {
      if (!resume.personal?.fullName?.trim() || !resume.personal?.email?.trim()) {
        setPersonalValidated(true);
        setError("Please enter your Full Name and Email before proceeding.");
        return;
      }
    }

    setError("");
    setPersonalValidated(false);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveResume();
    }
  };

  const goSkip = () => {
    setError("");
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    setError("");
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (loading) {
    return (
      <div className="editor-loading-screen">
        <div className="editor-spinner"></div>
        <p>Loading your resume...</p>
      </div>
    );
  }

  const currentStepId = STEPS[currentStep].id;

  const navProps = {
    steps: STEPS,
    currentStep,
    onSelect: goToStep,
    isCompleted: isStepCompleted,
    progressPct,
    completedCount,
  };

  return (
    <div className="editor-page">
      <EditorHeader
        resumeTitle={resume.name}
        resumeRole={resume.role}
        onTitleChange={(name) => updateResumeData({ name })}
        onRoleChange={(role) => updateResumeData({ role })}
        template={resume.template}
        onTemplateChange={(template) => updateResumeData({ template })}
        color={resume.color}
        onColorChange={(color) => updateResumeData({ color, primaryColor: color })}
        saving={saving}
        onSave={saveResume}
        onDownloadPdf={handleDownloadPdf}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* One-line steps with progress directly below (editor + preview mode) */}
      {viewMode === "both" && <StepNav variant="top" {...navProps} />}

      <div className={`editor-workspace mode-${viewMode}`}>
        {/* Vertical steps sidebar in form-only mode */}
        {viewMode === "editor" && <StepNav variant="rail" {...navProps} />}

        {/* ============ FORM PANEL ============ */}
        {viewMode !== "preview" && (
          <section className="editor-form-panel">
            {error && (
              <div className="editor-alert-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-scroll">
              <div className="form-inner">
                {currentStepId === "personal" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Personal Information</h3>
                      <p>Enter your contact details. Required fields are marked with (*).</p>
                    </div>

                    <PhotoUpload
                      value={resume.personal?.photo || ""}
                      onChange={(photo) =>
                        setResume((cur) => ({ ...cur, personal: { ...cur.personal, photo } }))
                      }
                    />

                    <PersonalSection
                      data={resume.personal}
                      onChange={(personal) =>
                        setResume((cur) => ({
                          ...cur,
                          personal: {
                            ...personal,
                            photo:
                              personal && personal.photo !== undefined
                                ? personal.photo
                                : cur.personal?.photo || "",
                          },
                        }))
                      }
                      errorHighlight={personalValidated}
                    />
                  </div>
                )}

                {currentStepId === "summary" && (
                  <div className="step-content">
                    <div className="step-heading-with-ai">
                      <div className="step-heading">
                        <h3>Professional Summary</h3>
                        <p>A concise 40–70 word summary naming your role and core technologies.</p>
                      </div>

                      <button
                        type="button"
                        className="btn-ai-enhance-action aesthetic"
                        disabled={enhancing || !resume.summary?.trim()}
                        onClick={() =>
                          handleAiEnhance("summary", resume.summary, (enhanced) =>
                            updateResumeData({ summary: enhanced })
                          )
                        }
                        title="Rewrite into ATS-optimized, high-impact phrasing"
                      >
                        <Sparkles size={14} className="sparkle-icon" />
                        <span>{enhancing ? "Enhancing..." : "Enhance with AI"}</span>
                      </button>
                    </div>

                    <textarea
                      className="wizard-textarea"
                      rows="8"
                      value={resume.summary || ""}
                      onChange={(e) => updateResumeData({ summary: e.target.value })}
                      placeholder="Example: Motivated Computer Science graduate skilled in Java, Spring Boot, PostgreSQL, and React. Experienced in developing secure REST APIs, responsive frontends, and database architectures..."
                    />
                  </div>
                )}

                {currentStepId === "education" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Education</h3>
                      <p>Add your college, pre-university (PUC), or 10th standard (SSLC) qualifications.</p>
                    </div>
                    <EducationSection
                      data={resume.education}
                      onChange={(education) => updateResumeData({ education })}
                    />
                  </div>
                )}

                {currentStepId === "internships" && (
                  <ListSectionEditor
                    title="Internships"
                    subtitle="Highlight your internship experiences, tasks, and technologies used."
                    addLabel="Add Internship"
                    emptyText='No internships added yet. Click "Add Internship" above.'
                    itemLabel="Internship"
                    items={resume.internships}
                    newItem={{ role: "", company: "", location: "", startDate: "", endDate: "Present", description: "" }}
                    fields={INTERNSHIP_FIELDS}
                    onAdd={(item) => addItem("internships", item)}
                    onRemove={(i) => removeItem("internships", i)}
                    onUpdate={(i, f, v) => updateItem("internships", i, f, v)}
                    onAiEnhance={handleAiEnhance}
                    enhancing={enhancing}
                  />
                )}

                {currentStepId === "experience" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Work Experience</h3>
                      <p>Add full-time roles, freelance, or contract positions.</p>
                    </div>
                    <ExperienceSection
                      data={resume.experience}
                      onChange={(experience) => updateResumeData({ experience })}
                      onAiEnhance={handleAiEnhance}
                      enhancing={enhancing}
                    />
                  </div>
                )}

                {currentStepId === "projects" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Projects</h3>
                      <p>Highlight your technical projects with GitHub links, tech stack, and impact bullets.</p>
                    </div>
                    <ProjectsSection
                      data={resume.projects}
                      onChange={(projects) => updateResumeData({ projects })}
                      onAiEnhance={handleAiEnhance}
                      enhancing={enhancing}
                    />
                  </div>
                )}

                {currentStepId === "skills" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Technical Skills</h3>
                      <p>Create categories and add skills to showcase your technical stack.</p>
                    </div>
                    <SkillsSection
                      data={resume.skills}
                      onChange={(skills) => updateResumeData({ skills })}
                    />
                  </div>
                )}

                {currentStepId === "certifications" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Certifications</h3>
                      <p>Add verified certificates with credential IDs and validation links.</p>
                    </div>
                    <CertificationsSection
                      data={resume.certifications}
                      onChange={(certifications) => updateResumeData({ certifications })}
                    />
                  </div>
                )}

                {currentStepId === "achievements" && (
                  <ListSectionEditor
                    title="Achievements"
                    subtitle="Awards, hackathons, academic ranks, or institutional project recognitions."
                    addLabel="Add Achievement"
                    emptyText='No achievements added. Click "Add Achievement" above.'
                    itemLabel="Achievement"
                    items={resume.achievements}
                    newItem={{ title: "", issuer: "", date: "", description: "" }}
                    fields={ACHIEVEMENT_FIELDS}
                    onAdd={(item) => addItem("achievements", item)}
                    onRemove={(i) => removeItem("achievements", i)}
                    onUpdate={(i, f, v) => updateItem("achievements", i, f, v)}
                  />
                )}

                {currentStepId === "languages" && (
                  <ListSectionEditor
                    title="Languages"
                    subtitle="Languages you speak, write, or work with, along with proficiency levels."
                    addLabel="Add Language"
                    emptyText='No languages added yet. Click "Add Language" above.'
                    itemLabel="Language"
                    items={resume.languages}
                    newItem={{ name: "", proficiency: "Fluent / Professional" }}
                    fields={LANGUAGE_FIELDS}
                    onAdd={(item) => addItem("languages", item)}
                    onRemove={(i) => removeItem("languages", i)}
                    onUpdate={(i, f, v) => updateItem("languages", i, f, v)}
                  />
                )}

                {currentStepId === "involvement" && (
                  <ListSectionEditor
                    title="Participation & Involvement"
                    subtitle="Clubs, tech forums, student branches, volunteering, or event organizing."
                    addLabel="Add Involvement"
                    emptyText='No extracurricular involvement added yet. Click "Add Involvement" above.'
                    itemLabel="Involvement"
                    items={resume.involvement}
                    newItem={{ role: "", organization: "", year: "", description: "" }}
                    fields={INVOLVEMENT_FIELDS}
                    onAdd={(item) => addItem("involvement", item)}
                    onRemove={(i) => removeItem("involvement", i)}
                    onUpdate={(i, f, v) => updateItem("involvement", i, f, v)}
                  />
                )}

                {currentStepId === "layout" && (
                  <div className="step-content">
                    <div className="step-heading">
                      <h3>Section Order</h3>
                      <p>Arrange the sections of your resume in the order recruiters should read them.</p>
                    </div>
                    <SectionOrderPanel
                      order={resume.sectionOrder}
                      hidden={resume.hiddenSections || []}
                      hasContent={sectionHasContent}
                      onChange={(sectionOrder) => updateResumeData({ sectionOrder })}
                      onHiddenChange={(hiddenSections) => updateResumeData({ hiddenSections })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-footer">
              <button type="button" className="btn-wizard-nav" onClick={goPrev} disabled={currentStep === 0}>
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <div className="form-footer-center">
                <span className="step-counter-text">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                {currentStep > 0 && currentStep < STEPS.length - 1 && (
                  <button type="button" className="btn-skip-step-prominent" onClick={goSkip}>
                    <FastForward size={13} />
                    <span>Skip</span>
                  </button>
                )}
              </div>

              <div className="form-footer-right">
                <button type="button" className="btn-wizard-nav" onClick={saveResume} disabled={saving}>
                  <Save size={15} />
                  <span>{saving ? "Saving..." : "Save"}</span>
                </button>
                <button type="button" className="btn-wizard-nav next" onClick={goNext}>
                  <span>{currentStep === STEPS.length - 1 ? "Finish" : "Next"}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ============ LIVE PREVIEW ============ */}
        {viewMode !== "editor" && (
          <section className="editor-preview-column">
            <div className="preview-toolbar">
              <div className="preview-toolbar-left">
                <span className="preview-toolbar-icon">
                  <Eye size={16} />
                </span>
                <div className="preview-toolbar-text">
                  <strong>Live Preview</strong>
                  <small>Updates as you type</small>
                </div>
                <span className="preview-chip">
                  A4 · {pageCount} {pageCount === 1 ? "page" : "pages"}
                </span>
              </div>

              {viewMode === "preview" && (
                <div className="zoom-controls">
                  <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_STEPS[0]} title="Zoom out">
                    <ZoomOut size={16} />
                  </button>
                  <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    title="Zoom in"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button type="button" className="zoom-fit" onClick={() => setZoom(1)} title="Fit to width">
                    <Maximize2 size={14} />
                    <span>Fit</span>
                  </button>
                </div>
              )}
            </div>

            <div className="preview-scroll">
              <div className="preview-canvas-card">
                <ResumePreview
                  resume={resume}
                  maxScale={viewMode === "preview" ? 1.3 : 1.6}
                  zoom={viewMode === "preview" ? zoom : 1}
                  onPagesChange={setPageCount}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ResumeEditor;