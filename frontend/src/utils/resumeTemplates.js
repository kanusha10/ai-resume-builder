export const FONT_OPTIONS = [
  { id: "calibri", label: "Calibri", group: "Classic (ATS-safe)", stack: 'Calibri, Carlito, "Segoe UI", Arial, Helvetica, sans-serif' },
  { id: "arial", label: "Arial", group: "Classic (ATS-safe)", stack: "Arial, Helvetica, sans-serif" },
  { id: "helvetica", label: "Helvetica", group: "Classic (ATS-safe)", stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: "georgia", label: "Georgia", group: "Classic (ATS-safe)", stack: 'Georgia, "Times New Roman", serif' },
  { id: "times", label: "Times New Roman", group: "Classic (ATS-safe)", stack: '"Times New Roman", Times, serif' },
  { id: "inter", label: "Inter", group: "Modern sans", google: "Inter:wght@400;500;600;700;800", stack: 'Inter, "Segoe UI", Arial, sans-serif' },
  { id: "roboto", label: "Roboto", group: "Modern sans", google: "Roboto:wght@400;500;700", stack: "Roboto, Arial, sans-serif" },
  { id: "opensans", label: "Open Sans", group: "Modern sans", google: "Open+Sans:wght@400;600;700;800", stack: '"Open Sans", Arial, sans-serif' },
  { id: "lato", label: "Lato", group: "Modern sans", google: "Lato:wght@400;700;900", stack: "Lato, Arial, sans-serif" },
  { id: "sourcesans", label: "Source Sans 3", group: "Modern sans", google: "Source+Sans+3:wght@400;600;700;800", stack: '"Source Sans 3", Arial, sans-serif' },
  { id: "worksans", label: "Work Sans", group: "Modern sans", google: "Work+Sans:wght@400;500;600;700", stack: '"Work Sans", Arial, sans-serif' },
  { id: "montserrat", label: "Montserrat", group: "Display sans", google: "Montserrat:wght@400;500;600;700;800", stack: "Montserrat, Arial, sans-serif" },
  { id: "poppins", label: "Poppins", group: "Display sans", google: "Poppins:wght@400;500;600;700", stack: "Poppins, Arial, sans-serif" },
  { id: "raleway", label: "Raleway", group: "Display sans", google: "Raleway:wght@400;500;600;700;800", stack: "Raleway, Arial, sans-serif" },
  { id: "merriweather", label: "Merriweather", group: "Serif", google: "Merriweather:wght@400;700;900", stack: "Merriweather, Georgia, serif" },
  { id: "lora", label: "Lora", group: "Serif", google: "Lora:wght@400;500;600;700", stack: "Lora, Georgia, serif" },
  { id: "ptserif", label: "PT Serif", group: "Serif", google: "PT+Serif:wght@400;700", stack: '"PT Serif", Georgia, serif' },
  { id: "playfair", label: "Playfair Display", group: "Serif", google: "Playfair+Display:wght@400;600;700;800", stack: '"Playfair Display", Georgia, serif' },
  { id: "garamond", label: "EB Garamond", group: "Serif", google: "EB+Garamond:wght@400;500;600;700;800", stack: '"EB Garamond", Garamond, Georgia, serif' },
];

export const FONT_BY_ID = Object.fromEntries(FONT_OPTIONS.map((f) => [f.id, f]));

export const ACCENT_COLORS = [
  "#0f172a", "#1e3a8a", "#2563eb", "#0e7490", "#0f766e", "#15803d",
  "#4d7c0f", "#b45309", "#c2410c", "#b91c1c", "#be123c", "#a21caf",
  "#7c3aed", "#4f46e5", "#475569", "#000000",
];

export const TEXT_COLORS = ["#111827", "#1f2937", "#334155", "#0f172a", "#000000"];

export const HEADING_STYLES = [
  { id: "rule", label: "Underline" },
  { id: "rule-wide", label: "Wide caps" },
  { id: "bar", label: "Side bar" },
  { id: "short", label: "Short rule" },
  { id: "plain", label: "Plain" },
  { id: "pill", label: "Pill" },
  { id: "band", label: "Band" },
  { id: "dot", label: "Dotted line" },
  { id: "lines", label: "Centered" },
];

export const SPACING_PX = { tight: 6, normal: 10, relaxed: 15 };

const base = { size: 9.5, lineHeight: 1.4, spacing: "normal", text: "#111827" };

export const TEMPLATES = [
  {
    id: "default", name: "Modern", tagline: "Centered header, clean rules",
    layout: "single", header: "center", heading: "rule", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "calibri", accent: "#0f172a" },
  },
  {
    id: "technical", name: "Developer", tagline: "Top accent bar, tinted headings",
    layout: "single", header: "left", heading: "bar", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "arial", lineHeight: 1.36, accent: "#1e3a8a" },
  },
  {
    id: "executive", name: "Executive", tagline: "Serif, double rule, wide caps",
    layout: "single", header: "left-heavy", heading: "rule-wide", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "georgia", lineHeight: 1.46, accent: "#7f1d1d" },
  },
  {
    id: "harvard", name: "Classic", tagline: "Academic, centered small caps",
    layout: "single", header: "center-plain", heading: "rule", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "times", size: 10, lineHeight: 1.34, accent: "#0f172a" },
  },
  {
    id: "minimal", name: "Minimal", tagline: "Airy, with a skills grid",
    layout: "single", header: "bar", heading: "short", entry: "inline", skills: "grid", ats: true,
    defaults: { ...base, font: "helvetica", lineHeight: 1.5, accent: "#0f172a" },
  },
  {
    id: "elegant", name: "Elegant", tagline: "Centered serif with ornaments",
    layout: "single", header: "elegant", heading: "lines", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "garamond", size: 10.25, lineHeight: 1.45, accent: "#8a6d3b" },
  },
  {
    id: "banner", name: "Banner", tagline: "Full-width colored header",
    layout: "single", header: "banner", heading: "plain", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "inter", size: 9.25, accent: "#4f46e5" },
  },
  {
    id: "duo", name: "Duo", tagline: "Name left, contact right",
    layout: "single", header: "duo", heading: "bar", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "sourcesans", size: 9.75, accent: "#7c3aed" },
  },
  {
    id: "edge", name: "Edge", tagline: "Color edge, numbered sections",
    layout: "single", header: "left", heading: "plain", entry: "inline", skills: "lines", ats: true,
    defaults: { ...base, font: "lato", accent: "#0e7490" },
  },
  {
    id: "timeline", name: "Timeline", tagline: "Vertical line, date chips",
    layout: "single", header: "left", heading: "dot", entry: "timeline", skills: "lines", ats: true,
    defaults: { ...base, font: "opensans", size: 9.25, accent: "#0f766e" },
  },
  {
    id: "split", name: "Split Dates", tagline: "Dates in a left column",
    layout: "single", header: "left", heading: "short", entry: "datecol", skills: "grid", ats: true,
    defaults: { ...base, font: "worksans", accent: "#be123c" },
  },
  {
    id: "card", name: "Cards", tagline: "Soft page, white entry cards",
    layout: "single", header: "card", heading: "plain", entry: "inline", skills: "lines", ats: false,
    defaults: { ...base, font: "inter", size: 9.25, accent: "#2563eb" },
  },
  {
    id: "bold", name: "Bold", tagline: "Big name, pills and chips",
    layout: "single", header: "bold", heading: "pill", entry: "inline", skills: "chips", ats: false,
    defaults: { ...base, font: "montserrat", size: 9, accent: "#0f766e" },
  },
  {
    id: "sidebar", name: "Sidebar", tagline: "Dark colored left column",
    layout: "sidebar", header: "main", heading: "rule", entry: "inline", skills: "lines", ats: false,
    sidebar: { side: "left", width: 68, tone: "solid", sections: ["skills", "languages", "certifications", "achievements"] },
    defaults: { ...base, font: "roboto", size: 9.25, accent: "#1e3a8a" },
  },
  {
    id: "sidebar-right", name: "Sidebar Right", tagline: "Tinted right column",
    layout: "sidebar", header: "main", heading: "short", entry: "inline", skills: "lines", ats: false,
    sidebar: { side: "right", width: 64, tone: "soft", sections: ["skills", "languages", "certifications", "achievements"] },
    defaults: { ...base, font: "poppins", size: 9, accent: "#c2410c" },
  },
  {
    id: "sidebar-soft", name: "Sidebar Soft", tagline: "Light tinted left column",
    layout: "sidebar", header: "main", heading: "short", entry: "inline", skills: "lines", ats: false,
    sidebar: { side: "left", width: 66, tone: "soft", sections: ["skills", "languages", "certifications", "achievements"] },
    defaults: { ...base, font: "worksans", size: 9.25, accent: "#0f766e" },
  },
];

export const TEMPLATE_ALIASES = {
  default: "default",
  emma: "default",
  technical: "technical",
  aaditya: "technical",
  executive: "executive",
  harvard: "harvard",
  classic: "harvard",
  minimal: "minimal",
  banner: "banner",
  timeline: "timeline",
  split: "split",
  bold: "bold",
  sidebar: "sidebar",
  "sidebar-soft": "sidebar-soft",
  "sidebar-right": "sidebar-right",
  elegant: "elegant",
  duo: "duo",
  edge: "edge",
  card: "card",
};

export function getTemplate(id) {
  const key = TEMPLATE_ALIASES[String(id || "default").toLowerCase()] || "default";
  return TEMPLATES.find((t) => t.id === key) || TEMPLATES[0];
}

function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [15, 23, 42];
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const out = A.map((v, i) => Math.round(v * (1 - t) + B[i] * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function isDark(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}

export function resolveDesign(resume) {
  const tpl = getTemplate(resume?.template);
  const d = resume?.design || {};
  const df = tpl.defaults;

  const font = FONT_BY_ID[d.font] || FONT_BY_ID[df.font];
  const accent = resume?.color || resume?.primaryColor || df.accent;
  const text = d.text || df.text;
  const size = Number(d.size) || df.size;
  const lineHeight = Number(d.lineHeight) || df.lineHeight;
  const spacing = SPACING_PX[d.spacing] ? d.spacing : df.spacing;

  const sb = tpl.sidebar;
  const sidebarBg = sb
    ? d.sidebarColor || (sb.tone === "solid" ? accent : mixHex(accent, "#ffffff", 0.88))
    : accent;

  const heading = d.headingStyle || tpl.heading;
  const skills = d.skillsStyle || tpl.skills;
  const uppercase = d.uppercase === undefined ? true : Boolean(d.uppercase);
  const photo = d.photoShape || "circle";

  const style = {
    "--rf": font.stack,
    "--rs": `${size}pt`,
    "--rlh": lineHeight,
    "--rsg": `${SPACING_PX[spacing]}px`,
    "--rc": accent,
    "--ras": mixHex(accent, "#ffffff", 0.9),
    "--rcon": isDark(accent) ? "#ffffff" : "#111827",
    "--rtext": text,
    "--rmuted": mixHex(text, "#ffffff", 0.35),
    "--rsb": sidebarBg,
    "--rsbt": isDark(sidebarBg) ? "#ffffff" : "#111827",
    "--sbw": `${sb ? sb.width : 0}mm`,
  };

  const className = [
    `tpl-${tpl.id}`,
    `layout-${tpl.layout}`,
    `hdr-${tpl.header}`,
    `hd-${heading}`,
    `ent-${tpl.entry}`,
    `sk-${skills}`,
    `ph-${photo}`,
    uppercase ? "up" : "",
    sb ? `sb-${sb.tone}` : "",
    sb ? `sbpos-${sb.side || "left"}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { tpl, font, style, className, resolved: { size, lineHeight, spacing, heading, skills, uppercase, photo, accent, text, sidebarBg } };
}