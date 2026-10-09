
import React from "react";
import { formatUrl } from "../../utils/urlFormatter";
import "./ResumePreview.css";

// Formats text into cleanly aligned ATS semantic bullet points.
function renderBulletList(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return null;
  }

  const items = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*\\\-–▪›>]+/, "").trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  // A single item without a bullet marker remains a paragraph.
  if (
    items.length === 1 &&
    !/^[\s]*[•*▪›>-]/.test(text) &&
    !text.includes("\n")
  ) {
    return <p className="entry-desc">{text.trim()}</p>;
  }

  return (
    <ul className="ats-bullet-list">
      {items.map((item, idx) => (
        <li key={idx} className="ats-bullet-item">
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function cleanEducationDegree(item) {
  if (item.level === "SSLC / 10th Standard / High School") {
    return item.degree || "SSLC / 10th Standard";
  }

  if (item.level === "PUC / 12th Standard") {
    return item.degree || "Pre-University Course (PUC)";
  }

  return item.degree || item.level || "Degree";
}

// Normalize category names without changing the actual skills.
function normalizeSkillCategories(skills) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
    return [];
  }

  return Object.entries(skills)
    .map(([category, values]) => {
      let normalizedValues = [];

      if (Array.isArray(values)) {
        normalizedValues = values;
      } else if (typeof values === "string") {
        normalizedValues = values.split(/[,;\n]/);
      }

      return {
        category: category.trim(),
        skills: normalizedValues
          .filter(
            (skill) =>
              typeof skill === "string" || typeof skill === "number"
          )
          .map((skill) => String(skill).trim())
          .filter(Boolean),
      };
    })
    .filter((item) => item.category && item.skills.length > 0);
}

export default function ResumePreview({ resume }) {
  const {
    personal = {},
    summary = "",
    education = [],
    internships = [],
    experience = [],
    projects = [],
    skills = {},
    certifications = [],
    achievements = [],
    languages = [],
    involvement = [],
  } = resume || {};

  const currentColor = resume?.color || resume?.primaryColor || "#0f172a";
  const template = resume?.template || "default";
  const skillCategories = normalizeSkillCategories(skills);

  return (
    <div className="preview-wrapper">
      <div
        id="resume-paper"
        className={`resume-paper template-${template}`}
        style={{
          "--resume-color": currentColor,
        }}
      >
        {/* HEADER */}
        <header className="resume-header">
          <div className="header-name-row">
            <h1 className="resume-name">
              {personal.fullName || "Your Name"}
            </h1>
            {resume?.role && (
              <div className="resume-role-sub">{resume.role}</div>
            )}
          </div>

          <div className="resume-contact-bar">
            {personal.location && <span>{personal.location}</span>}

            {personal.phone && <span>• {personal.phone}</span>}

            {personal.email && (
              <span>
                •{" "}
                <a
                  href={`mailto:${personal.email}`}
                  className="contact-link"
                >
                  {personal.email}
                </a>
              </span>
            )}

            {personal.linkedin && (
              <span>
                •{" "}
                <a
                  href={formatUrl(personal.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="ats-plain-link"
                >
                  LinkedIn
                </a>
              </span>
            )}

            {personal.github && (
              <span>
                •{" "}
                <a
                  href={formatUrl(personal.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="ats-plain-link"
                >
                  GitHub
                </a>
              </span>
            )}

            {personal.website && (
              <span>
                •{" "}
                <a
                  href={formatUrl(personal.website)}
                  target="_blank"
                  rel="noreferrer"
                  className="ats-plain-link"
                >
                  Portfolio
                </a>
              </span>
            )}
          </div>
        </header>

        {/* PROFESSIONAL SUMMARY */}
        {summary && (
          <section className="resume-section section-summary">
            <h2 className="section-title">
              <span>SUMMARY</span>
            </h2>
            <p className="resume-summary-text">{summary}</p>
          </section>
        )}

        {/* TECHNICAL SKILLS */}
        {skillCategories.length > 0 && (
          <section className="resume-section section-skills">
            <h2 className="section-title">
              <span>TECHNICAL SKILLS</span>
            </h2>

            <div className="skills-category-rows">
              {skillCategories.map(({ category, skills: categorySkills }) => (
                <div key={category} className="skill-cat-line">
                  <strong className="skill-cat-name">{category}:</strong>{" "}
                  <span className="skill-cat-items">
                    {categorySkills.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WORK EXPERIENCE */}
        {experience.length > 0 && (
          <section className="resume-section section-experience">
            <h2 className="section-title">
              <span>WORK EXPERIENCE</span>
            </h2>

            {experience.map((item, index) => (
              <div className="resume-entry" key={index}>
                <div className="resume-entry-top">
                  <span className="role-and-company">
                    <strong className="entry-role">
                      {item.role || "Job Title"}
                    </strong>
                    {item.company && (
                      <span className="entry-company"> | {item.company}</span>
                    )}
                  </span>

                  <span className="entry-dates">
                    {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                  </span>
                </div>

                {item.location && (
                  <div className="entry-sub-location">{item.location}</div>
                )}

                {renderBulletList(item.description)}
              </div>
            ))}
          </section>
        )}

        {/* INTERNSHIPS */}
        {internships.length > 0 && (
          <section className="resume-section section-internships">
            <h2 className="section-title">
              <span>INTERNSHIPS</span>
            </h2>

            {internships.map((item, index) => (
              <div className="resume-entry" key={index}>
                <div className="resume-entry-top">
                  <span className="role-and-company">
                    <strong className="entry-role">
                      {item.role || "Intern"}
                    </strong>
                    {item.company && (
                      <span className="entry-company"> | {item.company}</span>
                    )}
                  </span>

                  <span className="entry-dates">
                    {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                  </span>
                </div>

                {item.location && (
                  <div className="entry-sub-location">{item.location}</div>
                )}

                {renderBulletList(item.description)}
              </div>
            ))}
          </section>
        )}

        {/* PROJECTS */}
        {projects.length > 0 && (
          <section className="resume-section section-projects">
            <h2 className="section-title">
              <span>PROJECTS</span>
            </h2>

            {projects.map((item, index) => (
              <div className="resume-entry" key={index}>
                <div className="resume-entry-top">
                  <strong className="entry-project-name">
                    {item.name || "Project Title"}

                    {item.technologies && (
                      <span className="entry-project-stack">
                        {" "}({item.technologies})
                      </span>
                    )}

                    {item.link && (
                      <span className="ats-link-suffix">
                        {" "} |{" "}
                        <a
                          href={formatUrl(item.link)}
                          target="_blank"
                          rel="noreferrer"
                          className="ats-plain-link"
                        >
                          GitHub
                        </a>
                      </span>
                    )}
                  </strong>
                </div>

                {renderBulletList(item.description)}
              </div>
            ))}
          </section>
        )}

        {/* EDUCATION */}
        {education.length > 0 && (
          <section className="resume-section section-education">
            <h2 className="section-title">
              <span>EDUCATION</span>
            </h2>

            {education.map((item, index) => {
              const degreeText = cleanEducationDegree(item);
              const hasField =
                item.field &&
                item.level !== "SSLC / 10th Standard / High School" &&
                item.level !== "PUC / 12th Standard";

              return (
                <div className="resume-entry edu-entry" key={index}>
                  <div className="resume-entry-top">
                    {template === "default" || template === "harvard" ? (
                      <div className="edu-stacked">
                        <strong className="entry-degree-bold">
                          {degreeText} {hasField && `in ${item.field}`}
                        </strong>
                        <div className="entry-sub-school">
                          {item.institution}
                        </div>
                      </div>
                    ) : (
                      <div className="edu-inline">
                        <strong className="entry-degree-bold">
                          {degreeText}
                        </strong>
                        {item.institution && (
                          <span className="entry-sub-school">
                            {" "} | {item.institution}
                          </span>
                        )}
                        {hasField && (
                          <span className="entry-field-sub">
                            {" "}({item.field})
                          </span>
                        )}
                      </div>
                    )}

                    <span className="entry-dates">
                      {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                    </span>
                  </div>

                  {item.grade && (
                    <div className="edu-grade-row">
                      <span className="ats-grade-text">
                        Grade / CGPA: {item.grade}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* CERTIFICATIONS */}
        {certifications.length > 0 && (
          <section className="resume-section section-certifications">
            <h2 className="section-title">
              <span>CERTIFICATIONS</span>
            </h2>

            <ul className="ats-bullet-list">
              {certifications.map((item, index) => (
                <li key={index} className="ats-bullet-item">
                  <strong>{item.name}</strong>
                  {item.issuer && ` – ${item.issuer}`}
                  {item.date && ` (${item.date})`}
                  {item.credentialId && ` | ID: ${item.credentialId}`}
                  {item.url && (
                    <>
                      {" | "}
                      <a
                        href={formatUrl(item.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="ats-plain-link"
                      >
                        Verify
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ACHIEVEMENTS */}
        {achievements.length > 0 && (
          <section className="resume-section section-achievements">
            <h2 className="section-title">
              <span>ACHIEVEMENTS</span>
            </h2>

            <ul className="ats-bullet-list">
              {achievements.map((item, index) => (
                <li key={index} className="ats-bullet-item">
                  <strong>{item.title}</strong>
                  {item.issuer && ` – ${item.issuer}`}
                  {item.description && ` | ${item.description}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* PARTICIPATION & INVOLVEMENT */}
        {involvement.length > 0 && (
          <section className="resume-section section-involvement">
            <h2 className="section-title">
              <span>INVOLVEMENT & ACTIVITIES</span>
            </h2>

            {involvement.map((item, index) => (
              <div className="resume-entry" key={index}>
                <div className="resume-entry-top">
                  <strong className="entry-role">
                    {item.role || "Member"}
                  </strong>
                  {item.year && (
                    <span className="entry-dates">{item.year}</span>
                  )}
                </div>

                {item.organization && (
                  <div className="entry-sub-school">{item.organization}</div>
                )}

                {item.description && (
                  <p className="entry-desc">{item.description}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* LANGUAGES */}
        {languages.length > 0 && (
          <section className="resume-section section-languages">
            <h2 className="section-title">
              <span>LANGUAGES</span>
            </h2>

            <div className="languages-inline-row">
              {languages.map((language, index) => (
                <span key={index} className="lang-item">
                  <strong>{language.name}</strong> (
                  {language.proficiency || "Fluent"})
                  {index < languages.length - 1 && " • "}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
