import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatUrl } from "../../utils/urlFormatter";
import { normalizeSectionOrder } from "../../utils/sectionOrder";
import "./ResumePreview.css";

const MM = 3.7795; // px per mm @ 96dpi
const A4_WIDTH_PX = 794;
const SHEET_HEIGHT_PX = 297 * MM; // 1122.5px
const CONTENT_HEIGHT_PX = 277 * MM; // A4 minus 10mm top and bottom padding
const PAGE_GAP_PX = 22;

const TEMPLATE_ALIASES = {
  default: "default",
  emma: "default",
  technical: "technical",
  aaditya: "technical",
  executive: "executive",
  harvard: "harvard",
  classic: "harvard",
  minimal: "minimal",
};

function normalizeTemplate(value) {
  return TEMPLATE_ALIASES[String(value || "default").toLowerCase()] || "default";
}

const formatDates = (item) => [item.startDate, item.endDate].filter(Boolean).join(" - ");

function projectLinkLabel(url) {
  const u = String(url || "").toLowerCase();
  if (u.includes("github.com")) return "GitHub";
  if (u.includes("gitlab.com")) return "GitLab";
  return "Live Demo";
}

function renderBulletList(text) {
  if (!text || typeof text !== "string" || !text.trim()) return null;

  const items = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*\\\-–▪›>]+/, "").trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  if (items.length === 1 && !/^[\s]*[•*▪›>-]/.test(text) && !text.includes("\n")) {
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

function normalizeSkillCategories(skills) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) return [];

  return Object.entries(skills)
    .map(([category, values]) => {
      let normalizedValues = [];
      if (Array.isArray(values)) normalizedValues = values;
      else if (typeof values === "string") normalizedValues = values.split(/[,;\n]/);

      return {
        category: category.trim(),
        skills: normalizedValues
          .filter((s) => typeof s === "string" || typeof s === "number")
          .map((s) => String(s).trim())
          .filter(Boolean),
      };
    })
    .filter((item) => item.category && item.skills.length > 0);
}

// Greedy packing of measured blocks into A4 pages
function paginate(heights) {
  const limit = CONTENT_HEIGHT_PX - 2;
  const pages = [[]];
  let used = 0;
  heights.forEach((h, i) => {
    if (used + h > limit && pages[pages.length - 1].length > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(i);
    used += h;
  });
  return pages;
}

function Link({ href, children }) {
  return (
    <a href={formatUrl(href)} target="_blank" rel="noreferrer" className="resume-link">
      {children}
    </a>
  );
}

export default function ResumePreview({ resume, maxScale = 1, zoom = 1, onPagesChange }) {
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
  const template = normalizeTemplate(resume?.template);
  const skillCategories = normalizeSkillCategories(skills);
  const hidden = Array.isArray(resume?.hiddenSections) ? resume.hiddenSections : [];
  const order = normalizeSectionOrder(resume?.sectionOrder).filter((id) => !hidden.includes(id));

  const wrapperRef = useRef(null);
  const measureRef = useRef(null);
  const [fit, setFit] = useState(1);
  const scale = Math.max(0.25, Math.min(4, Math.min(fit, maxScale) * zoom));
  const [pages, setPages] = useState(null);

  /* ---------------- BLOCK BUILDING ---------------- */

  const entryHead = ({ title, right, sub }) => (
    <div className="entry-head">
      <div className="entry-line">
        <strong className="entry-title">{title}</strong>
        {right ? <span className="entry-right">{right}</span> : null}
      </div>
      {sub ? <div className="entry-subline">{sub}</div> : null}
    </div>
  );

  const header = (
    <header className="resume-header">
      <div className="resume-header-inner">
        <div className="resume-header-text">
          <h1 className="resume-name">{personal.fullName || "Your Name"}</h1>
          {resume?.role && <div className="resume-role-sub">{resume.role}</div>}

          <div className="resume-contact-bar">
            {personal.location && <span className="contact-item">{personal.location}</span>}
            {personal.phone && <span className="contact-item">{personal.phone}</span>}
            {personal.email && (
              <span className="contact-item">
                <a href={`mailto:${personal.email}`} className="resume-link">{personal.email}</a>
              </span>
            )}
            {personal.linkedin && (
              <span className="contact-item"><Link href={personal.linkedin}>LinkedIn</Link></span>
            )}
            {personal.github && (
              <span className="contact-item"><Link href={personal.github}>GitHub</Link></span>
            )}
            {personal.website && (
              <span className="contact-item"><Link href={personal.website}>Portfolio</Link></span>
            )}
          </div>
        </div>

        {personal.photo && <img className="resume-photo" src={personal.photo} alt="Profile" />}
      </div>
    </header>
  );

  const sections = {
    summary: () =>
      summary
        ? { title: "SUMMARY", items: [<p key="s" className="resume-summary-text">{summary}</p>] }
        : null,

    skills: () =>
      skillCategories.length
        ? {
            title: "TECHNICAL SKILLS",
            items: skillCategories.map(({ category, skills: list }) => (
              <div key={category} className="skill-line">
                <strong className="skill-cat-name">{category}:</strong>{" "}
                <span className="skill-cat-items">{list.join(", ")}</span>
              </div>
            )),
          }
        : null,

    experience: () =>
      experience.length
        ? {
            title: "WORK EXPERIENCE",
            items: experience.map((item, i) => (
              <div className="resume-entry" key={i}>
                {entryHead({
                  title: item.role || "Job Title",
                  right: formatDates(item),
                  sub: [item.company, item.location].filter(Boolean).join(" · "),
                })}
                {renderBulletList(item.description)}
              </div>
            )),
          }
        : null,

    internships: () =>
      internships.length
        ? {
            title: "INTERNSHIPS",
            items: internships.map((item, i) => (
              <div className="resume-entry" key={i}>
                {entryHead({
                  title: item.role || "Intern",
                  right: formatDates(item),
                  sub: [item.company, item.location].filter(Boolean).join(" · "),
                })}
                {renderBulletList(item.description)}
              </div>
            )),
          }
        : null,

    projects: () =>
      projects.length
        ? {
            title: "PROJECTS",
            items: projects.map((item, i) => (
              <div className="resume-entry" key={i}>
                <div className="entry-head">
                  <div className="entry-line">
                    <span className="entry-title-wrap">
                      <strong className="entry-title">{item.name || "Project Title"}</strong>
                      {item.technologies && <span className="entry-tech"> | {item.technologies}</span>}
                    </span>
                    {item.link && (
                      <span className="entry-right">
                        <Link href={item.link}>{projectLinkLabel(item.link)}</Link>
                      </span>
                    )}
                  </div>
                </div>
                {renderBulletList(item.description)}
              </div>
            )),
          }
        : null,

    education: () =>
      education.length
        ? {
            title: "EDUCATION",
            items: education.map((item, i) => {
              const degreeText = cleanEducationDegree(item);
              const hasField =
                item.field &&
                item.level !== "SSLC / 10th Standard / High School" &&
                item.level !== "PUC / 12th Standard";
              return (
                <div className="resume-entry" key={i}>
                  {entryHead({
                    title: `${degreeText}${hasField ? ` in ${item.field}` : ""}`,
                    right: formatDates(item),
                    sub: item.institution,
                  })}
                  {item.grade && <div className="entry-grade">Grade / CGPA: {item.grade}</div>}
                </div>
              );
            }),
          }
        : null,

    certifications: () =>
      certifications.length
        ? {
            title: "CERTIFICATIONS",
            items: certifications.map((item, i) => (
              <ul className="ats-bullet-list" key={i}>
                <li className="ats-bullet-item">
                  <strong>{item.name}</strong>
                  {item.issuer && ` – ${item.issuer}`}
                  {item.date && ` (${item.date})`}
                  {item.credentialId && ` | ID: ${item.credentialId}`}
                  {item.url && (
                    <>
                      {" | "}
                      <Link href={item.url}>Verify</Link>
                    </>
                  )}
                </li>
              </ul>
            )),
          }
        : null,

    achievements: () =>
      achievements.length
        ? {
            title: "ACHIEVEMENTS",
            items: achievements.map((item, i) => (
              <ul className="ats-bullet-list" key={i}>
                <li className="ats-bullet-item">
                  <strong>{item.title}</strong>
                  {item.issuer && ` – ${item.issuer}`}
                  {item.description && ` | ${item.description}`}
                </li>
              </ul>
            )),
          }
        : null,

    involvement: () =>
      involvement.length
        ? {
            title: "INVOLVEMENT & ACTIVITIES",
            items: involvement.map((item, i) => (
              <div className="resume-entry" key={i}>
                {entryHead({
                  title: item.role || "Member",
                  right: item.year || "",
                  sub: item.organization,
                })}
                {item.description && <p className="entry-desc">{item.description}</p>}
              </div>
            )),
          }
        : null,

    languages: () =>
      languages.length
        ? {
            title: "LANGUAGES",
            items: [
              <div key="l" className="languages-inline-row">
                {languages.map((language, index) => (
                  <span key={index} className="lang-item">
                    <strong>{language.name}</strong> ({language.proficiency || "Fluent"})
                    {index < languages.length - 1 && " • "}
                  </span>
                ))}
              </div>,
            ],
          }
        : null,
  };

  // Every block is atomic (never split across pages). A section's heading is
  // attached to its first block so a heading can never be stranded at a page end.
  const blocks = [{ key: "header", node: header }];
  order.forEach((id) => {
    const section = sections[id] ? sections[id]() : null;
    if (!section) return;
    section.items.forEach((item, i) => {
      blocks.push({
        key: `${id}-${i}`,
        node: (
          <>
            {i === 0 && (
              <h2 className="section-title">
                <span>{section.title}</span>
              </h2>
            )}
            {item}
          </>
        ),
      });
    });
  });

  /* ---------------- MEASURE + PAGINATE ---------------- */

  const measure = useCallback(() => {
    const paper = measureRef.current?.querySelector(".resume-paper");
    if (!paper) return;
    const heights = Array.from(paper.children).map((c) => c.getBoundingClientRect().height);
    const next = paginate(heights);
    setPages((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  // Re-measure after every render (state only updates when the split changes)
  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [measure]);

      // Fit-to-width factor; the zoom prop multiplies it
      useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return undefined;

        const update = () => {
          const width = el.clientWidth;
          if (!width) return;
          setFit(width / A4_WIDTH_PX);
        };

        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
      }, []);

  const pageList =
    pages && pages.length ? pages : [blocks.map((_, i) => i)];

  useEffect(() => {
    if (onPagesChange) onPagesChange(pageList.length);
  }, [pageList.length, onPagesChange]);

  const totalHeight = pageList.length * SHEET_HEIGHT_PX + (pageList.length - 1) * PAGE_GAP_PX;
  const paperStyle = { "--resume-color": currentColor };

  return (
      <div className="preview-wrapper" ref={wrapperRef} style={{ overflow: zoom > 1 ? "visible" : "hidden" }}>
      {/* Hidden, unscaled copy used only to measure block heights */}
      <div className="resume-measure" ref={measureRef} aria-hidden="true">
        <div className={`resume-paper template-${template}`} style={paperStyle}>
          {blocks.map((b) => (
            <div key={b.key} className="resume-block">
              {b.node}
            </div>
          ))}
        </div>
      </div>

      <div
        className="preview-scale-box"
        style={{ width: A4_WIDTH_PX * scale, height: totalHeight * scale }}
      >
        <div className="preview-scale-inner" style={{ transform: `scale(${scale})`, width: A4_WIDTH_PX }}>
          {/* #resume-paper holds the real A4 sheets; the PDF export reads them */}
          <div id="resume-paper" className="resume-pages">
            {pageList.map((indexes, p) => (
              <div className="resume-sheet" key={p}>
                <div className={`resume-paper template-${template}`} style={paperStyle}>
                  {indexes.map(
                    (blockIndex, k) =>
                      blocks[blockIndex] && (
                        <div
                          key={blocks[blockIndex].key}
                          className={`resume-block ${k === 0 ? "page-first" : ""}`}
                        >
                          {blocks[blockIndex].node}
                        </div>
                      )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}