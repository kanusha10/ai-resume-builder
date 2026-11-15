import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatUrl } from "../../utils/urlFormatter";
import { normalizeSectionOrder } from "../../utils/sectionOrder";
import { resolveDesign } from "../../utils/resumeTemplates";
import { ensureFont } from "../../utils/fontLoader";
import "./ResumePreview.css";

const MM = 3.7795;
const A4_WIDTH_PX = 794;
const SHEET_HEIGHT_PX = 297 * MM;
const CONTENT_HEIGHT_PX = 277 * MM;
const PAGE_GAP_PX = 22;

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

export default function ResumePreview({ resume, maxScale = 1, zoom = 1, onPagesChange, exportable = true })  {
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

  const { tpl, font, style, className } = resolveDesign(resume);
  const isSidebar = tpl.layout === "sidebar";
  const sidebarIds = isSidebar ? tpl.sidebar.sections : [];

  const skillCategories = normalizeSkillCategories(skills);
  const customSections = Array.isArray(resume?.customSections) ? resume.customSections : [];
  const hidden = Array.isArray(resume?.hiddenSections) ? resume.hiddenSections : [];
  const order = normalizeSectionOrder(
    resume?.sectionOrder,
    customSections.map((c) => c.id)
  ).filter((id) => !hidden.includes(id));

  const wrapperRef = useRef(null);
  const measureRef = useRef(null);
  const [fit, setFit] = useState(1);
  const scale = Math.max(0.25, Math.min(4, Math.min(fit, maxScale) * zoom));
  const [pages, setPages] = useState(null);

  const entryHead = ({ title, right, sub }) => (
    <div className="entry-head">
      <div className="entry-line">
        <strong className="entry-title">{title}</strong>
        {right ? <span className="entry-right">{right}</span> : null}
      </div>
      {sub ? <div className="entry-subline">{sub}</div> : null}
    </div>
  );

  const contactItems = () => {
    const items = [];
    if (personal.location) items.push({ key: "loc", node: <span>{personal.location}</span> });
    if (personal.phone) items.push({ key: "tel", node: <span>{personal.phone}</span> });
    if (personal.email) {
      items.push({
        key: "mail",
        node: (
          <a href={`mailto:${personal.email}`} className="resume-link">
            {personal.email}
          </a>
        ),
      });
    }
    if (personal.linkedin) items.push({ key: "in", node: <Link href={personal.linkedin}>LinkedIn</Link> });
    if (personal.github) items.push({ key: "gh", node: <Link href={personal.github}>GitHub</Link> });
    if (personal.website) items.push({ key: "web", node: <Link href={personal.website}>Portfolio</Link> });
    return items;
  };

  const header = (
    <header className="resume-header">
      <div className="resume-header-inner">
        <div className="resume-header-text">
          <h1 className="resume-name">{personal.fullName || "Your Name"}</h1>
          {resume?.role && <div className="resume-role-sub">{resume.role}</div>}

          {!isSidebar && (
            <div className="resume-contact-bar">
              {contactItems().map((c) => (
                <span key={c.key} className="contact-item">
                  {c.node}
                </span>
              ))}
            </div>
          )}
        </div>

        {!isSidebar && personal.photo && <img className="resume-photo" src={personal.photo} alt="Profile" />}
      </div>
    </header>
  );

  const sideContact = (
    <div className="sb-contact">
      {personal.photo && <img className="resume-photo sb-photo" src={personal.photo} alt="Profile" />}
      <h2 className="section-title">
        <span>Contact</span>
      </h2>
      <div className="sb-contact-list">
        {contactItems().map((c) => (
          <div key={c.key} className="sb-contact-item">
            {c.node}
          </div>
        ))}
      </div>
    </div>
  );

  const sections = {
    summary: () =>
      summary
        ? { title: "Summary", items: [<p key="s" className="resume-summary-text">{summary}</p>] }
        : null,

    skills: () =>
      skillCategories.length
        ? {
            title: "Technical Skills",
            items: skillCategories.map(({ category, skills: list }) => (
              <div key={category} className="skill-line">
                <strong className="skill-cat-name">{category}:</strong>{" "}
                <span className="skill-cat-items">
                  {list.map((skill, i) => (
                    <span key={`${skill}-${i}`} className="skill-chip">
                      {skill}
                      {i < list.length - 1 && <span className="skill-sep">, </span>}
                    </span>
                  ))}
                </span>
              </div>
            )),
          }
        : null,

    experience: () =>
      experience.length
        ? {
            title: "Work Experience",
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
            title: "Internships",
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
            title: "Projects",
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
            title: "Education",
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
            title: "Certifications",
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
            title: "Achievements",
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
            title: "Involvement & Activities",
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
            title: "Languages",
            items: [
              <div key="l" className="languages-inline-row">
                {languages.map((language, index) => (
                  <span key={index} className="lang-item">
                    <strong>{language.name}</strong> ({language.proficiency || "Fluent"})
                    {index < languages.length - 1 && <span className="lang-sep"> • </span>}
                  </span>
                ))}
              </div>,
            ],
          }
        : null,
  };

  customSections.forEach((cs) => {
    sections[cs.id] = () => {
      const title = (cs.title || "").trim() || "Custom Section";

      if (cs.type === "text") {
        return cs.text && cs.text.trim()
          ? { title, items: [<p key="t" className="resume-summary-text pre-line">{cs.text.trim()}</p>] }
          : null;
      }

      if (cs.type === "bullets") {
        const rows = (cs.items || []).map((i) => String(i.text || "").trim()).filter(Boolean);
        return rows.length
          ? {
              title,
              items: [
                <ul key="b" className="ats-bullet-list">
                  {rows.map((row, i) => (
                    <li key={i} className="ats-bullet-item">
                      <span>{row}</span>
                    </li>
                  ))}
                </ul>,
              ],
            }
          : null;
      }

      const rows = (cs.items || []).filter((i) => i.title || i.subtitle || i.description || i.date);
      return rows.length
        ? {
            title,
            items: rows.map((item, i) => (
              <div className="resume-entry" key={i}>
                {entryHead({ title: item.title || "Untitled", right: item.date, sub: item.subtitle })}
                {renderBulletList(item.description)}
              </div>
            )),
          }
        : null;
    };
  });

  const toBlocks = (ids, lead) => {
    const out = lead ? [...lead] : [];
    ids.forEach((id) => {
      const section = sections[id] ? sections[id]() : null;
      if (!section) return;
      section.items.forEach((item, i) => {
        out.push({
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
    return out;
  };

  const mainLead = [{ key: "header", node: header }];

  const mainBlocks = toBlocks(
    order.filter((id) => !sidebarIds.includes(id)),
    mainLead
  );
  const sideBlocks = isSidebar
    ? toBlocks(
        order.filter((id) => sidebarIds.includes(id)),
        [{ key: "contact", node: sideContact }]
      )
    : [];

  const measure = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;

    const read = (selector) => {
      const paper = root.querySelector(selector);
      if (!paper) return [];
      const heights = Array.from(paper.children).map((c) => c.getBoundingClientRect().height);
      return paginate(heights);
    };

    const next = { main: read(".m-main"), side: read(".m-side") };

    setPages((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

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

  useEffect(() => {
    let active = true;
    ensureFont(font).then(() => {
      if (active) measure();
    });
    return () => {
      active = false;
    };
  }, [font, measure]);

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

  const mainPages = pages && pages.main.length ? pages.main : [mainBlocks.map((_, i) => i)];
  const sidePages = isSidebar ? (pages && pages.side.length ? pages.side : [sideBlocks.map((_, i) => i)]) : [];
  const pageCount = Math.max(mainPages.length, sidePages.length, 1);

  useEffect(() => {
    if (onPagesChange) onPagesChange(pageCount);
  }, [pageCount, onPagesChange]);

  const totalHeight = pageCount * SHEET_HEIGHT_PX + (pageCount - 1) * PAGE_GAP_PX;

  const renderColumn = (indexes, blocks) =>
    (indexes || []).map(
      (blockIndex, k) =>
        blocks[blockIndex] && (
          <div key={blocks[blockIndex].key} className={`resume-block ${k === 0 ? "page-first" : ""}`}>
            {blocks[blockIndex].node}
          </div>
        )
    );

  return (
    <div className="preview-wrapper" ref={wrapperRef} style={{ overflow: zoom > 1 ? "visible" : "hidden" }}>
      <div className="resume-measure" ref={measureRef} aria-hidden="true">
        <div className={`resume-paper m-main ${className}`} style={style}>
          {mainBlocks.map((b) => (
            <div key={b.key} className="resume-block">
              {b.node}
            </div>
          ))}
        </div>
        {isSidebar && (
          <div className={`resume-paper m-side is-side ${className}`} style={style}>
            {sideBlocks.map((b) => (
              <div key={b.key} className="resume-block">
                {b.node}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="preview-scale-box" style={{ width: A4_WIDTH_PX * scale, height: totalHeight * scale }}>
        <div className="preview-scale-inner" style={{ transform: `scale(${scale})`, width: A4_WIDTH_PX }}>
          <div id={exportable ? "resume-paper" : undefined} className="resume-pages">
            {Array.from({ length: pageCount }, (_, p) =>
              isSidebar ? (
                <div className={`resume-sheet sheet-2col ${className}`} style={style} key={p}>
                  <aside className="sheet-side">
                    <div className={`resume-paper is-side ${className}`} style={style}>
                      {renderColumn(sidePages[p], sideBlocks)}
                    </div>
                  </aside>
                  <div className="sheet-main">
                    <div className={`resume-paper is-main ${className}`} style={style}>
                      {renderColumn(mainPages[p], mainBlocks)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`resume-sheet ${className}`} style={style} key={p}>
                  <div className={`resume-paper ${className}`} style={style}>
                    {renderColumn(mainPages[p], mainBlocks)}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}