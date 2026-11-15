import { useEffect, useMemo, useState } from "react";
import {
  Check,
  LayoutTemplate,
  Type,
  Palette,
  SlidersHorizontal,
  RotateCcw,
  X,
  ShieldCheck,
  AlertTriangle,
  Minus,
  Plus,
} from "lucide-react";

import ResumePreview from "../preview/ResumePreview";
import {
  ACCENT_COLORS,
  FONT_OPTIONS,
  HEADING_STYLES,
  TEMPLATES,
  TEXT_COLORS,
  isDark,
  mixHex,
  resolveDesign,
} from "../../utils/resumeTemplates";
import { ensureAllFonts } from "../../utils/fontLoader";
import "./DesignStudio.css";

const TABS = [
  { id: "templates", label: "Templates", Icon: LayoutTemplate },
  { id: "text", label: "Text", Icon: Type },
  { id: "colors", label: "Colors", Icon: Palette },
  { id: "layout", label: "Layout", Icon: SlidersHorizontal },
];

const FONT_GROUPS = [...new Set(FONT_OPTIONS.map((f) => f.group))];

const SAMPLE = {
  role: "Software Engineer",
  personal: {
    fullName: "Alex Morgan",
    email: "alex@email.com",
    phone: "+1 555 0100",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/alex",
    github: "github.com/alex",
  },
  summary: "Engineer who builds reliable, fast web products and enjoys turning complex problems into simple tools.",
  skills: { Languages: ["Java", "Python", "SQL"], Tools: ["Docker", "Git", "AWS"] },
  experience: [
    {
      role: "Software Engineer",
      company: "Northwind",
      location: "Austin",
      startDate: "2022",
      endDate: "Present",
      description: "• Built APIs serving 2M requests a day\n• Cut page load time by 40%",
    },
  ],
  education: [
    { level: "Bachelor", degree: "B.S. Computer Science", institution: "State University", startDate: "2018", endDate: "2022" },
  ],
  certifications: [{ name: "AWS Certified Developer", issuer: "AWS", date: "2023" }],
  languages: [{ name: "English", proficiency: "Native" }],
};

function Mini({ tpl, accent, design }) {
  const resume = useMemo(
    () => ({ ...SAMPLE, template: tpl.id, color: accent, design }),
    [tpl.id, accent, design]
  );

  return (
    <div className="ds-mini" aria-hidden="true">
      <ResumePreview resume={resume} exportable={false} />
    </div>
  );
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="ds-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={value === o.id ? "active" : ""} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Swatches({ value, colors, onChange, label }) {
  const current = String(value).toLowerCase();
  const isCustom = !colors.some((c) => c.toLowerCase() === current);

  return (
    <div className="ds-swatches" role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} type="button" className={`ds-swatch ${current === c.toLowerCase() ? "active" : ""}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={`${label} ${c}`} title={c}>
          {current === c.toLowerCase() && <Check size={14} color={isDark(c) ? "#fff" : "#111"} />}
        </button>
      ))}
      <label className={`ds-swatch ds-custom ${isCustom ? "active" : ""}`} title="Pick any color">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} aria-label={`Custom ${label}`} />
        <span style={isCustom ? { background: value } : undefined}>+</span>
      </label>
    </div>
  );
}

function Block({ title, hint, value, children }) {
  return (
    <section className="ds-block">
      <div className="ds-block-head">
        <h4>{title}</h4>
        {value ? <em>{value}</em> : null}
      </div>
      {hint ? <p className="ds-block-hint">{hint}</p> : null}
      {children}
    </section>
  );
}

function HeadingSample({ id, label, active, accent, fontStack, onClick }) {
  const vars = {
    "--rc": accent,
    "--ras": mixHex(accent, "#ffffff", 0.9),
    "--rcon": isDark(accent) ? "#ffffff" : "#111827",
    "--rtext": "#111827",
    "--rs": "8.5pt",
    "--rsg": "0px",
    "--rf": fontStack,
  };

  return (
    <button type="button" className={`ds-hd ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}>
      <div className={`resume-paper hd-${id} up`} style={vars}>
        <h2 className="section-title">
          <span>Experience</span>
        </h2>
      </div>
      <span>{label}</span>
    </button>
  );
}

function SkillsSample({ id, label, active, onClick }) {
  return (
    <button type="button" className={`ds-sk ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}>
      <div className={`ds-sk-art ds-sk-${id}`}>
        {id === "chips" ? (
          <>
            <i /><i /><i /><i /><i />
          </>
        ) : (
          <>
            <b /><span /><b /><span />
          </>
        )}
      </div>
      <span>{label}</span>
    </button>
  );
}

export default function DesignStudio({ open, onClose, resume, onChange }) {
  const [tab, setTab] = useState("templates");
  const [filter, setFilter] = useState("all");
  const { tpl, resolved, font } = resolveDesign(resume);
  const design = resume?.design || {};

  useEffect(() => {
    if (!open) return undefined;

    ensureAllFonts(FONT_OPTIONS);

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setDesign = (patch) => onChange({ design: { ...design, ...patch } });
  const setAccent = (color) => onChange({ color, primaryColor: color });

  const chooseTemplate = (next) =>
    onChange({ template: next.id, design: {}, color: next.defaults.accent, primaryColor: next.defaults.accent });

  const reset = () => onChange({ design: {}, color: tpl.defaults.accent, primaryColor: tpl.defaults.accent });

  const list = TEMPLATES.filter((t) => (filter === "ats" ? t.ats : filter === "styled" ? !t.ats : true));

  return (
    <aside className="ds-drawer" role="dialog" aria-label="Design studio">
      <header className="ds-head">
        <div>
          <h3>Design Studio</h3>
          <p>
            {tpl.name} · {font.label} · {resolved.size}pt
          </p>
        </div>
        <button type="button" className="ds-close" onClick={onClose} aria-label="Close design studio">
          <X size={18} />
        </button>
      </header>

      <nav className="ds-tabs" role="tablist" aria-label="Design sections">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="ds-body">
        {tab === "templates" && (
          <>
            <div className="ds-filters" role="group" aria-label="Filter templates">
              {[
                { id: "all", label: `All ${TEMPLATES.length}` },
                { id: "ats", label: "ATS-friendly" },
                { id: "styled", label: "Stylized" },
              ].map((f) => (
                <button key={f.id} type="button" className={filter === f.id ? "active" : ""} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ds-grid">
              {list.map((t) => {
                const active = t.id === tpl.id;
                return (
                  <button key={t.id} type="button" className={`ds-card ${active ? "active" : ""}`} onClick={() => chooseTemplate(t)} aria-pressed={active}>
                    <Mini tpl={t} accent={active ? resolved.accent : t.defaults.accent} design={active ? design : undefined} />
                    {active && (
                      <span className="ds-picked">
                        <Check size={13} /> Selected
                      </span>
                    )}
                    <span className="ds-card-name">{t.name}</span>
                    <span className="ds-card-tag">{t.tagline}</span>
                    <span className={`ds-ats ${t.ats ? "ok" : "warn"}`} title={t.ats ? "Single column: reads reliably in applicant tracking systems" : "Columns or decoration can read less reliably in some applicant tracking systems"}>
                      {t.ats ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
                      {t.ats ? "ATS-friendly" : "Stylized"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="ds-note">Choosing a template resets fonts and colors to its defaults. Fine-tune them in the other tabs.</p>
          </>
        )}

        {tab === "text" && (
          <>
            <Block title="Font" value={font.label}>
              <div className="ds-fonts">
                {FONT_GROUPS.map((group) => (
                  <div key={group}>
                    <div className="ds-font-group">{group}</div>
                    <div className="ds-font-grid">
                      {FONT_OPTIONS.filter((f) => f.group === group).map((f) => (
                        <button key={f.id} type="button" className={`ds-font ${font.id === f.id ? "active" : ""}`} onClick={() => setDesign({ font: f.id })} aria-pressed={font.id === f.id}>
                          <b style={{ fontFamily: f.stack }}>Aa</b>
                          <span style={{ fontFamily: f.stack }}>{f.label}</span>
                          {font.id === f.id && <Check size={13} className="ds-font-check" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Text size" value={`${resolved.size} pt`}>
              <div className="ds-stepper">
                <button type="button" onClick={() => setDesign({ size: Math.max(8, +(resolved.size - 0.25).toFixed(2)) })} aria-label="Smaller text">
                  <Minus size={15} />
                </button>
                <input type="range" min="8" max="11.5" step="0.25" value={resolved.size} onChange={(e) => setDesign({ size: Number(e.target.value) })} aria-label="Text size" />
                <button type="button" onClick={() => setDesign({ size: Math.min(11.5, +(resolved.size + 0.25).toFixed(2)) })} aria-label="Larger text">
                  <Plus size={15} />
                </button>
              </div>
            </Block>

            <Block title="Line spacing" value={resolved.lineHeight.toFixed(2)}>
              <input className="ds-range" type="range" min="1.2" max="1.7" step="0.02" value={resolved.lineHeight} onChange={(e) => setDesign({ lineHeight: Number(e.target.value) })} aria-label="Line spacing" />
            </Block>

            <Block title="Heading case">
              <Segmented label="Heading case" value={resolved.uppercase ? "up" : "normal"} onChange={(v) => setDesign({ uppercase: v === "up" })} options={[{ id: "up", label: "UPPERCASE" }, { id: "normal", label: "Capitalized" }]} />
            </Block>
          </>
        )}

        {tab === "colors" && (
          <>
            <Block title="Accent color" hint="Used for your name, headings and highlights." value={resolved.accent}>
              <Swatches label="Accent color" value={resolved.accent} colors={ACCENT_COLORS} onChange={setAccent} />
            </Block>

            {tpl.layout === "sidebar" && (
              <Block title="Sidebar color" value={resolved.sidebarBg}>
                <Swatches label="Sidebar color" value={resolved.sidebarBg} colors={ACCENT_COLORS} onChange={(c) => setDesign({ sidebarColor: c })} />
              </Block>
            )}

            <Block title="Text color" hint="Dark colors stay easy to read when printed.">
              <Swatches label="Text color" value={resolved.text} colors={TEXT_COLORS} onChange={(c) => setDesign({ text: c })} />
            </Block>
          </>
        )}

        {tab === "layout" && (
          <>
            <Block title="Section spacing">
              <Segmented label="Section spacing" value={resolved.spacing} onChange={(v) => setDesign({ spacing: v })} options={[{ id: "tight", label: "Tight" }, { id: "normal", label: "Normal" }, { id: "relaxed", label: "Relaxed" }]} />
            </Block>

            <Block title="Heading style" hint="Tap a style to see how your section titles will look.">
              <div className="ds-hd-grid">
                {HEADING_STYLES.map((h) => (
                  <HeadingSample key={h.id} id={h.id} label={h.label} active={resolved.heading === h.id} accent={resolved.accent} fontStack={font.stack} onClick={() => setDesign({ headingStyle: h.id })} />
                ))}
              </div>
            </Block>

            <Block title="Skills layout">
              <div className="ds-sk-grid">
                {[{ id: "lines", label: "Lines" }, { id: "grid", label: "Grid" }, { id: "chips", label: "Chips" }].map((s) => (
                  <SkillsSample key={s.id} id={s.id} label={s.label} active={resolved.skills === s.id} onClick={() => setDesign({ skillsStyle: s.id })} />
                ))}
              </div>
            </Block>

            <Block title="Photo shape">
              <div className="ds-photo-grid">
                {[{ id: "circle", label: "Circle" }, { id: "rounded", label: "Rounded" }, { id: "square", label: "Square" }].map((p) => (
                  <button key={p.id} type="button" className={`ds-photo ${resolved.photo === p.id ? "active" : ""}`} onClick={() => setDesign({ photoShape: p.id })} aria-pressed={resolved.photo === p.id}>
                    <i className={`ds-shape ds-shape-${p.id}`} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </Block>
          </>
        )}
      </div>

      <footer className="ds-foot">
        <button type="button" className="ds-reset" onClick={reset}>
          <RotateCcw size={14} />
          Reset
        </button>
        <button type="button" className="ds-done" onClick={onClose}>
          Done
        </button>
      </footer>
    </aside>
  );
}