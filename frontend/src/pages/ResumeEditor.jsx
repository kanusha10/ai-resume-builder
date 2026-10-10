import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import EditorHeader from "../components/editor/EditorHeader";
import PersonalSection from "../components/editor/PersonalSection";
import EducationSection from "../components/editor/EducationSection";
import ExperienceSection from "../components/editor/ExperienceSection";
import ProjectsSection from "../components/editor/ProjectsSection";
import SkillsSection from "../components/editor/SkillsSection";
import CertificationsSection from "../components/editor/CertificationsSection";

import ResumePreview from "../components/preview/ResumePreview";
import { createResume, getResume, updateResume } from "../api/resumeApi";
import { exportPreviewToPdf } from "../utils/previewExport";
import { emptyResume } from "../utils/resumeDefaults";
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
  CheckCircle2,
  FastForward,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";

import "./ResumeEditor.css";

const STEPS = [
  { id: "personal", label: "Personal", icon: User, required: true },
  { id: "summary", label: "Summary", icon: FileText, required: false },
  { id: "education", label: "Education", icon: GraduationCap, required: false },
  { id: "internships", label: "Internships", icon: Building2, required: false },
  { id: "experience", label: "Experience", icon: Briefcase, required: false },
  { id: "projects", label: "Projects", icon: FolderGit2, required: false },
  { id: "skills", label: "Skills", icon: Cpu, required: false },
  { id: "certifications", label: "Certifications", icon: Award, required: false },
  { id: "achievements", label: "Achievements", icon: Trophy, required: false },
  { id: "languages", label: "Languages", icon: Languages, required: false },
  { id: "involvement", label: "Involvement", icon: Users, required: false },
];

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
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState("both"); // 'both' | 'editor' | 'preview'
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [personalValidated, setPersonalValidated] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

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

          setResume({
            ...emptyResume,
            ...data,
            ...parsedData,
            name: data.name || parsedData.name || "My Resume",
            role: data.role || parsedData.role || parsedData.personal?.jobTitle || "Software Engineer",
            template: data.template || parsedData.template || "default",
            color: data.color || parsedData.color || data.primaryColor || "#0f172a",
            primaryColor: data.color || parsedData.color || data.primaryColor || "#0f172a",
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
          }));
        } catch (e) {
          console.error("Failed to load imported resume cache:", e);
        }
      }
    }
  }, [id]);

  function updateResumeData(changes) {
    setResume((current) => ({
      ...current,
      ...changes,
    }));
  }

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

  const isStepCompleted = (index) => {
    const step = STEPS[index];
    if (step.id === "personal") return Boolean(resume.personal?.fullName?.trim() && resume.personal?.email?.trim());
    if (step.id === "summary") return Boolean(resume.summary?.trim());
    if (step.id === "education") return Array.isArray(resume.education) && resume.education.length > 0;
    if (step.id === "internships") return Array.isArray(resume.internships) && resume.internships.length > 0;
    if (step.id === "experience") return Array.isArray(resume.experience) && resume.experience.length > 0;
    if (step.id === "projects") return Array.isArray(resume.projects) && resume.projects.length > 0;
    if (step.id === "skills") {
      return resume.skills && Object.values(resume.skills).some((arr) => Array.isArray(arr) && arr.length > 0);
    }
    if (step.id === "certifications") return Array.isArray(resume.certifications) && resume.certifications.length > 0;
    if (step.id === "achievements") return Array.isArray(resume.achievements) && resume.achievements.length > 0;
    if (step.id === "languages") return Array.isArray(resume.languages) && resume.languages.length > 0;
    if (step.id === "involvement") return Array.isArray(resume.involvement) && resume.involvement.length > 0;
    return false;
  };

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
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    setError("");
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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

  const renderStepTabs = () => (
    <div className="wizard-step-tabs">
      {STEPS.map((s, index) => {
        const IconComponent = s.icon;
        const isActive = currentStep === index;
        const completed = isStepCompleted(index);

        return (
          <button
            key={s.id}
            type="button"
            className={`step-tab ${isActive ? "active" : ""} ${completed ? "completed" : ""}`}
            onClick={() => {
              if (currentStep === 0 && !isStepCompleted(0)) {
                setPersonalValidated(true);
                setError("Please enter your Full Name and Email before switching steps.");
                return;
              }
              setError("");
              setCurrentStep(index);
            }}
          >
            <span className="step-tab-icon">
              {completed ? (
                <CheckCircle2 size={13} className="check-done" />
              ) : (
                <IconComponent size={14} />
              )}
            </span>
            <span className="step-tab-label">{s.label}</span>
          </button>
        );
      })}
    </div>
  );

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

      {/* ViewMode === 'both': Full-width bar across the entire screen */}
      {viewMode === "both" && (
        <div className="full-width-step-bar">
          {renderStepTabs()}
        </div>
      )}

      {error && <div className="editor-alert-banner">{error}</div>}

      <div className={`editor-workspace mode-${viewMode}`}>
        {/* Left Column: Form Wizard */}
        {viewMode !== "preview" && (
          <div className="editor-wizard-panel">
            {/* ViewMode === 'editor': Step bar sits inside the editor column */}
            {viewMode === "editor" && (
              <div className="editor-local-step-bar">
                {renderStepTabs()}
              </div>
            )}

            <div className="wizard-step-container">
              {currentStepId === "personal" && (
                <div className="step-content">
                  <div className="step-heading">
                    <h3>Personal Information</h3>
                    <p>Enter your contact details. Required fields are marked with (*).</p>
                  </div>
                  <PersonalSection
                    data={resume.personal}
                    onChange={(personal) => updateResumeData({ personal })}
                    errorHighlight={personalValidated}
                  />
                </div>
              )}

              {currentStepId === "summary" && (
                <div className="step-content">
                  <div className="step-heading-with-ai">
                    <div className="step-heading">
                      <h3>Professional Summary</h3>
                      <p>A concise 2–4 sentence summary highlighting your core technical competencies.</p>
                    </div>

                    <button
                      type="button"
                      className="btn-ai-enhance-action aesthetic"
                      disabled={enhancing || !resume.summary?.trim()}
                      onClick={() =>
                        handleAiEnhance("summary", resume.summary, (enhanced) => {
                          updateResumeData({ summary: enhanced });
                        })
                      }
                      title="Rewrite into ATS-optimized, high-impact phrasing"
                    >
                      <Sparkles size={14} className="sparkle-icon" />
                      <span>{enhancing ? "Enhancing..." : "✨ Enhance with AI"}</span>
                    </button>
                  </div>

                  <textarea
                    className="wizard-textarea"
                    rows="6"
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
                <div className="step-content">
                  <div className="step-heading-with-actions">
                    <div className="step-heading">
                      <h3>Internships</h3>
                      <p>Highlight your internship experiences, tasks, and technologies used.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() =>
                        updateResumeData({
                          internships: [
                            ...(resume.internships || []),
                            { role: "", company: "", location: "", startDate: "", endDate: "Present", description: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={14} />
                      <span>Add Internship</span>
                    </button>
                  </div>

                  {(!resume.internships || resume.internships.length === 0) ? (
                    <p className="empty-hint">No internships added yet. Click "Add Internship" above.</p>
                  ) : (
                    resume.internships.map((intern, idx) => (
                      <div key={idx} className="sub-entry-card">
                        <div className="sub-entry-header">
                          <h4>Internship #{idx + 1}</h4>
                          <button
                            type="button"
                            className="btn-delete-item"
                            onClick={() => {
                              const updated = resume.internships.filter((_, i) => i !== idx);
                              updateResumeData({ internships: updated });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="form-grid-2">
                          <div className="input-group">
                            <label>Role / Designation</label>
                            <input
                              type="text"
                              value={intern.role || ""}
                              onChange={(e) => {
                                const updated = [...resume.internships];
                                updated[idx].role = e.target.value;
                                updateResumeData({ internships: updated });
                              }}
                              placeholder="e.g. Java Development Intern"
                            />
                          </div>
                          <div className="input-group">
                            <label>Company / Organization</label>
                            <input
                              type="text"
                              value={intern.company || ""}
                              onChange={(e) => {
                                const updated = [...resume.internships];
                                updated[idx].company = e.target.value;
                                updateResumeData({ internships: updated });
                              }}
                              placeholder="e.g. Oasis Infobyte"
                            />
                          </div>
                        </div>
                        <div className="form-grid-3">
                          <div className="input-group">
                            <label>Location</label>
                            <input
                              type="text"
                              value={intern.location || ""}
                              onChange={(e) => {
                                const updated = [...resume.internships];
                                updated[idx].location = e.target.value;
                                updateResumeData({ internships: updated });
                              }}
                              placeholder="Remote / City"
                            />
                          </div>
                          <div className="input-group">
                            <label>Start Date</label>
                            <input
                              type="text"
                              value={intern.startDate || ""}
                              onChange={(e) => {
                                const updated = [...resume.internships];
                                updated[idx].startDate = e.target.value;
                                updateResumeData({ internships: updated });
                              }}
                              placeholder="Aug 2024"
                            />
                          </div>
                          <div className="input-group">
                            <label>End Date</label>
                            <input
                              type="text"
                              value={intern.endDate || ""}
                              onChange={(e) => {
                                const updated = [...resume.internships];
                                updated[idx].endDate = e.target.value;
                                updateResumeData({ internships: updated });
                              }}
                              placeholder="Sep 2024"
                            />
                          </div>
                        </div>
                        <div className="input-group" style={{ marginTop: "0.75rem" }}>
                          <div className="field-label-row">
                            <label>Tasks & Learnings</label>
                            <button
                              type="button"
                              className="btn-ai-enhance-action aesthetic"
                              disabled={enhancing || !intern.description?.trim()}
                              onClick={() =>
                                handleAiEnhance(
                                  "internship",
                                  intern.description,
                                  (enhanced) => {
                                    const updated = [...resume.internships];
                                    updated[idx].description = enhanced;
                                    updateResumeData({ internships: updated });
                                  },
                                  `Role: ${intern.role || ""}, Company: ${intern.company || ""}`
                                )
                              }
                            >
                              <Sparkles size={12} className="sparkle-icon" />
                              <span>{enhancing ? "Enhancing..." : "✨ Enhance Bullets"}</span>
                            </button>
                          </div>
                          <textarea
                            rows="4"
                            className="wizard-textarea"
                            value={intern.description || ""}
                            onChange={(e) => {
                              const updated = [...resume.internships];
                              updated[idx].description = e.target.value;
                              updateResumeData({ internships: updated });
                            }}
                            placeholder="• Developed an ATM Interface and Digital Library System in Java...&#10;• Implemented JDBC database operations and prepared presentation title cards"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                <div className="step-content">
                  <div className="step-heading-with-actions">
                    <div className="step-heading">
                      <h3>Achievements</h3>
                      <p>Awards, hackathons, academic ranks, or institutional project recognitions.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() =>
                        updateResumeData({
                          achievements: [
                            ...(resume.achievements || []),
                            { title: "", issuer: "", date: "", description: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={14} />
                      <span>Add Achievement</span>
                    </button>
                  </div>

                  {(!resume.achievements || resume.achievements.length === 0) ? (
                    <p className="empty-hint">No achievements added. Click "Add Achievement" above.</p>
                  ) : (
                    resume.achievements.map((ach, idx) => (
                      <div key={idx} className="sub-entry-card">
                        <div className="sub-entry-header">
                          <h4>Achievement #{idx + 1}</h4>
                          <button
                            type="button"
                            className="btn-delete-item"
                            onClick={() => {
                              const updated = resume.achievements.filter((_, i) => i !== idx);
                              updateResumeData({ achievements: updated });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="form-grid-2">
                          <div className="input-group">
                            <label>Title / Award</label>
                            <input
                              type="text"
                              value={ach.title || ""}
                              onChange={(e) => {
                                const updated = [...resume.achievements];
                                updated[idx].title = e.target.value;
                                updateResumeData({ achievements: updated });
                              }}
                              placeholder="e.g. Selected for NAIN 2.0 Project Funding"
                            />
                          </div>
                          <div className="input-group">
                            <label>Organization / Event / Year</label>
                            <input
                              type="text"
                              value={ach.issuer || ""}
                              onChange={(e) => {
                                const updated = [...resume.achievements];
                                updated[idx].issuer = e.target.value;
                                updateResumeData({ achievements: updated });
                              }}
                              placeholder="e.g. Dept of IT BT & ST, Govt of Karnataka"
                            />
                          </div>
                        </div>
                        <div className="input-group" style={{ marginTop: "0.5rem" }}>
                          <label>Description (Optional details)</label>
                          <input
                            type="text"
                            value={ach.description || ""}
                            onChange={(e) => {
                              const updated = [...resume.achievements];
                              updated[idx].description = e.target.value;
                              updateResumeData({ achievements: updated });
                            }}
                            placeholder="Short detail about rank, prize, or outcome"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {currentStepId === "languages" && (
                <div className="step-content">
                  <div className="step-heading-with-actions">
                    <div className="step-heading">
                      <h3>Languages</h3>
                      <p>Languages you speak, write, or work with along with proficiency levels.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() =>
                        updateResumeData({
                          languages: [
                            ...(resume.languages || []),
                            { name: "", proficiency: "Fluent" },
                          ],
                        })
                      }
                    >
                      <Plus size={14} />
                      <span>Add Language</span>
                    </button>
                  </div>

                  {(!resume.languages || resume.languages.length === 0) ? (
                    <p className="empty-hint">No languages added yet. Click "Add Language" above.</p>
                  ) : (
                    resume.languages.map((lang, idx) => (
                      <div key={idx} className="sub-entry-card">
                        <div className="sub-entry-header">
                          <h4>Language #{idx + 1}</h4>
                          <button
                            type="button"
                            className="btn-delete-item"
                            onClick={() => {
                              const updated = resume.languages.filter((_, i) => i !== idx);
                              updateResumeData({ languages: updated });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="form-grid-2">
                          <div className="input-group">
                            <label>Language Name</label>
                            <input
                              type="text"
                              value={lang.name || ""}
                              onChange={(e) => {
                                const updated = [...resume.languages];
                                updated[idx].name = e.target.value;
                                updateResumeData({ languages: updated });
                              }}
                              placeholder="e.g. English, Kannada, Hindi"
                            />
                          </div>
                          <div className="input-group">
                            <label>Proficiency</label>
                            <select
                              value={lang.proficiency || "Fluent"}
                              onChange={(e) => {
                                const updated = [...resume.languages];
                                updated[idx].proficiency = e.target.value;
                                updateResumeData({ languages: updated });
                              }}
                              className="wizard-textarea"
                              style={{ height: "40px", padding: "0.4rem 0.75rem" }}
                            >
                              <option value="Native / Bilingual">Native / Bilingual</option>
                              <option value="Fluent / Professional">Fluent / Professional</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Basic">Basic</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {currentStepId === "involvement" && (
                <div className="step-content">
                  <div className="step-heading-with-actions">
                    <div className="step-heading">
                      <h3>Participation & Involvement</h3>
                      <p>Clubs, tech forums, student branches, volunteering, or event organizing.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() =>
                        updateResumeData({
                          involvement: [
                            ...(resume.involvement || []),
                            { role: "", organization: "", year: "", description: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={14} />
                      <span>Add Involvement</span>
                    </button>
                  </div>

                  {(!resume.involvement || resume.involvement.length === 0) ? (
                    <p className="empty-hint">No extracurricular involvement added yet.</p>
                  ) : (
                    resume.involvement.map((inv, idx) => (
                      <div key={idx} className="sub-entry-card">
                        <div className="sub-entry-header">
                          <h4>Involvement #{idx + 1}</h4>
                          <button
                            type="button"
                            className="btn-delete-item"
                            onClick={() => {
                              const updated = resume.involvement.filter((_, i) => i !== idx);
                              updateResumeData({ involvement: updated });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="form-grid-3">
                          <div className="input-group">
                            <label>Role / Position</label>
                            <input
                              type="text"
                              value={inv.role || ""}
                              onChange={(e) => {
                                const updated = [...resume.involvement];
                                updated[idx].role = e.target.value;
                                updateResumeData({ involvement: updated });
                              }}
                              placeholder="e.g. Technical Coordinator"
                            />
                          </div>
                          <div className="input-group">
                            <label>Club / Organization</label>
                            <input
                              type="text"
                              value={inv.organization || ""}
                              onChange={(e) => {
                                const updated = [...resume.involvement];
                                updated[idx].organization = e.target.value;
                                updateResumeData({ involvement: updated });
                              }}
                              placeholder="e.g. IEEE Student Branch"
                            />
                          </div>
                          <div className="input-group">
                            <label>Duration / Year</label>
                            <input
                              type="text"
                              value={inv.year || ""}
                              onChange={(e) => {
                                const updated = [...resume.involvement];
                                updated[idx].year = e.target.value;
                                updateResumeData({ involvement: updated });
                              }}
                              placeholder="e.g. 2024 - 2025"
                            />
                          </div>
                        </div>
                        <div className="input-group" style={{ marginTop: "0.5rem" }}>
                          <label>Description (Contributions or events managed)</label>
                          <textarea
                            rows="2"
                            className="wizard-textarea"
                            value={inv.description || ""}
                            onChange={(e) => {
                              const updated = [...resume.involvement];
                              updated[idx].description = e.target.value;
                              updateResumeData({ involvement: updated });
                            }}
                            placeholder="Organized coding bootcamps and coordinated tech symposium events..."
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bottom Wizard Footer Navigation */}
            <div className="wizard-footer-bar">
              <button
                type="button"
                className="btn-wizard-nav prev"
                onClick={goPrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <div className="wizard-footer-center">
                {currentStep > 0 && (
                  <button type="button" className="btn-skip-step-prominent" onClick={goSkip}>
                    <FastForward size={14} className="skip-icon" />
                    <span>Skip this step</span>
                  </button>
                )}
                <span className="step-counter-text">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>

              <div className="wizard-footer-right">
                <button
                  type="button"
                  className="btn-wizard-nav save-draft"
                  onClick={saveResume}
                  disabled={saving}
                >
                  <Save size={15} />
                  <span>{saving ? "Saving..." : "Save Draft"}</span>
                </button>

                <button type="button" className="btn-wizard-nav next" onClick={goNext}>
                  <span>{currentStep === STEPS.length - 1 ? "Save & Finish" : "Next Step"}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Live Interactive Canvas (Hidden when in 'editor' mode) */}
        {viewMode !== "editor" && (
          <div className="editor-preview-column">
            <div className="preview-canvas-card">
              <ResumePreview resume={resume} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeEditor;