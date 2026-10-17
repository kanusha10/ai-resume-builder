// Job-description-driven ATS analyzer.
// With a job description: scores keyword match, requirements fit and resume quality.
// Without one: scores resume quality only (no keyword guessing).

/* ------------------------------------------------------------------ */
/*  LEXICON (domain skill dictionary; only terms that appear in the JD  */
/*  are ever used)                                                     */
/* ------------------------------------------------------------------ */
const DOMAINS = {
  software: {
    label: "Software Engineering", tech: true,
    title: /software|developer|programmer|full\s?stack|front\s?end|back\s?end|web\s?dev|\bsde\b|java\b|python|react|\.net/,
    terms: ["java", "javascript", "typescript", "python", "c++", "c#", "golang", "rust", "php", "ruby", "kotlin", "swift", "scala", "react", "angular", "vue", "next.js", "node.js", "express", "spring boot", "spring", "hibernate", "jpa", "django", "flask", "fastapi", ".net", "asp.net", "laravel", "html", "css", "tailwind", "redux", "rest api", "graphql", "microservices", "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "kafka", "rabbitmq", "junit", "jest", "maven", "gradle", "git", "github", "gitlab", "jira", "agile", "scrum", "ci/cd", "jenkins", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "oauth", "jwt", "spring security", "data structures", "algorithms", "oop", "design patterns", "system design", "unit testing", "api", "websocket", "firebase"],
  },
  data: {
    label: "Data & AI", tech: true,
    title: /data (scientist|analyst|engineer)|machine learning|ml engineer|analytics|\bbi (developer|analyst)|\bai\b/,
    terms: ["python", "sql", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras", "machine learning", "deep learning", "nlp", "computer vision", "statistics", "data analysis", "data visualization", "tableau", "power bi", "excel", "spark", "hadoop", "airflow", "etl", "data warehouse", "snowflake", "bigquery", "databricks", "a/b testing", "regression", "feature engineering", "big data", "looker", "dbt", "data modeling", "data pipeline", "llm", "generative ai", "mlops"],
  },
  devops: {
    label: "DevOps & Cloud", tech: true,
    title: /devops|\bsre\b|site reliability|cloud engineer|platform engineer|infrastructure/,
    terms: ["docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "aws", "azure", "gcp", "linux", "bash", "prometheus", "grafana", "helm", "github actions", "gitlab ci", "nginx", "monitoring", "infrastructure as code", "cloud", "networking", "shell scripting"],
  },
  mobile: {
    label: "Mobile Development", tech: true,
    title: /android|\bios\b|mobile|flutter|react native/,
    terms: ["android", "ios", "kotlin", "swift", "flutter", "react native", "dart", "xcode", "android studio", "firebase", "mvvm", "jetpack compose", "swiftui", "sqlite", "play store", "app store"],
  },
  qa: {
    label: "Quality Assurance", tech: true,
    title: /\bqa\b|quality assurance|tester|testing engineer|sdet|automation test/,
    terms: ["selenium", "cypress", "playwright", "testng", "postman", "jmeter", "test cases", "test plan", "automation testing", "manual testing", "regression testing", "bug tracking", "api testing", "cucumber", "bdd", "performance testing", "sdlc", "stlc"],
  },
  design: {
    label: "Design", tech: false,
    title: /designer|\bux\b|ui\/ux|graphic|creative/,
    terms: ["figma", "adobe xd", "sketch", "photoshop", "illustrator", "wireframing", "prototyping", "user research", "usability testing", "design system", "ux", "ui", "typography", "interaction design", "accessibility", "user flows", "indesign", "after effects"],
  },
  product: {
    label: "Product & Project Management", tech: false,
    title: /product (manager|owner|analyst)|program manager|project manager/,
    terms: ["roadmap", "product strategy", "stakeholder management", "user stories", "backlog", "prioritization", "okr", "kpi", "market research", "product requirements", "go-to-market", "analytics", "pmp", "risk management", "budgeting"],
  },
  marketing: {
    label: "Marketing", tech: false,
    title: /marketing|\bseo\b|content (writer|strategist|manager)|social media|brand/,
    terms: ["seo", "sem", "google analytics", "google ads", "facebook ads", "content marketing", "social media", "email marketing", "copywriting", "hubspot", "marketing automation", "campaign management", "brand strategy", "crm", "ppc", "conversion rate optimization", "lead generation", "influencer marketing", "wordpress"],
  },
  sales: {
    label: "Sales & Customer Success", tech: false,
    title: /sales|business development|account (executive|manager)|customer success/,
    terms: ["lead generation", "crm", "salesforce", "b2b", "b2c", "negotiation", "cold calling", "account management", "pipeline management", "quota", "forecasting", "customer success", "upselling", "prospecting", "client relationship", "business development", "closing"],
  },
  finance: {
    label: "Finance & Accounting", tech: false,
    title: /financ|accountant|accounting|audit|\btax\b|banking|credit analyst/,
    terms: ["financial analysis", "financial modeling", "accounting", "gaap", "ifrs", "budgeting", "forecasting", "variance analysis", "reconciliation", "auditing", "taxation", "accounts payable", "accounts receivable", "sap", "tally", "quickbooks", "valuation", "risk management", "financial reporting", "bloomberg", "gst"],
  },
  hr: {
    label: "Human Resources", tech: false,
    title: /\bhr\b|human resources|recruit|talent|people (ops|partner)/,
    terms: ["recruitment", "talent acquisition", "onboarding", "employee engagement", "payroll", "hris", "performance management", "compensation", "benefits", "employee relations", "sourcing", "interviewing", "workday", "labor law", "training and development", "hr policies"],
  },
  operations: {
    label: "Operations & Supply Chain", tech: false,
    title: /operations|supply chain|logistics|procurement|scrum master/,
    terms: ["supply chain", "logistics", "inventory management", "procurement", "vendor management", "lean", "six sigma", "process improvement", "erp", "sap", "warehouse", "project management", "quality assurance", "operations management"],
  },
  engineering: {
    label: "Core Engineering", tech: false,
    title: /mechanical|civil|electrical|electronics|embedded|manufacturing|structural|hardware/,
    terms: ["autocad", "solidworks", "catia", "ansys", "cad", "cam", "gd&t", "matlab", "manufacturing", "thermodynamics", "fluid mechanics", "plc", "cnc", "3d printing", "fea", "cfd", "hvac", "pcb", "embedded systems", "vhdl", "verilog", "circuit design", "robotics", "civil 3d", "staad pro", "revit", "estimation"],
  },
};

const ALL_TERMS = [...new Set(Object.values(DOMAINS).flatMap((d) => d.terms))].sort((a, b) => b.length - a.length);

const ALIASES = [
  [/\breact\.?js\b/g, "react"],
  [/\bnode\s?js\b|\bnodejs\b/g, "node.js"],
  [/\bnext\s?js\b/g, "next.js"],
  [/\bvue\.?js\b/g, "vue"],
  [/\bangular\.?js\b/g, "angular"],
  [/\bpostgres\b/g, "postgresql"],
  [/\bmongo\b/g, "mongodb"],
  [/\bk8s\b/g, "kubernetes"],
  [/(?<![.\w])js\b/g, "javascript"],
  [/(?<![.\w])ts\b/g, "typescript"],
  [/\brestful( apis?| services?| web services?)?\b/g, "rest api"],
  [/\brest apis\b/g, "rest api"],
  [/\bml\b/g, "machine learning"],
  [/\bpower\s?bi\b/g, "power bi"],
  [/\bci\s?\/\s?cd\b/g, "ci/cd"],
  [/\bspringboot\b/g, "spring boot"],
  [/\bamazon web services\b/g, "aws"],
  [/\bgoogle cloud( platform)?\b/g, "gcp"],
  [/\bms excel\b|\bmicrosoft excel\b/g, "excel"],
  [/\bscikit learn\b|\bsklearn\b/g, "scikit-learn"],
  [/\bunit tests?\b/g, "unit testing"],
  [/\bdsa\b/g, "data structures"],
  [/\bobject[- ]oriented( programming)?\b/g, "oop"],
  [/\bhtml5\b/g, "html"],
  [/\bcss3\b/g, "css"],
  [/\bmy\s?sql\b/g, "mysql"],
  [/\bgen\s?ai\b/g, "generative ai"],
];

const normalize = (t) => {
  let s = String(t || "").toLowerCase();
  ALIASES.forEach(([re, rep]) => {
    s = s.replace(re, rep);
  });
  return s;
};

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termRegex = (t, flags = "i") => new RegExp(`(?<![a-z0-9])${esc(t)}(?:s|es)?(?![a-z0-9])`, flags);
const containsTerm = (text, term) => !!term && termRegex(term).test(text);
const countTerm = (text, term) => (text.match(termRegex(term, "gi")) || []).length;

const STOP = new Set(
  "a an the and or of to in on at by for with from as is are was were be been being this that these those it its we you your our their they them he she his her i not no but if then than so such can may might must should would could will shall do does did have has had into over under about across per via within without while who whom what when where which how all any each other more most some new etc also able".split(" ")
);
const GENERIC = new Set(
  "responsibilities responsibility requirements requirement qualifications qualification experience years year ability strong excellent skills skill knowledge looking candidate candidates company team teams role roles work working join opportunity benefits salary location apply including preferred required plus good great help build across environment fast paced passionate motivated collaborate job position hiring ideal minimum degree bachelor master related field equivalent responsible ensure support provide develop developing development using use used seeking based like time full part".split(" ")
);

const STRONG_VERBS = new Set(
  "accelerated achieved administered analyzed architected automated built collaborated configured conducted consolidated contributed coordinated created customized debugged decreased delivered deployed designed developed directed documented drove eliminated enabled enhanced engineered established evaluated executed expanded facilitated fixed generated guided identified implemented improved increased initiated integrated introduced launched led maintained managed migrated mentored modernized monitored optimized orchestrated organized oversaw partnered performed pioneered planned presented produced programmed published reduced refactored released resolved restructured reviewed scaled secured simplified solved spearheaded standardized streamlined strengthened supervised tested trained transformed troubleshot upgraded validated wrote researched prepared coded authored revamped boosted cut saved won ranked awarded conceptualized negotiated forecasted audited recruited closed generated".split(" ")
);
const WEAK_STARTS = new Set("worked helped assisted responsible involved tasked participated handled did made used was were am learned tried".split(" "));
const WEAK_PHRASES = /\b(responsible for|worked on|worked with|helped (to|with)?|assisted (with|in)|duties included|tasked with|involved in|in charge of|various tasks)\b/i;
const FIRST_PERSON = /\b(I|my|me|myself)\b/;
const METRIC_RE = /[%$₹€£]|\d\s?\+|\d[\d,.]*\s?(?:x|k|m|ms|users|clients|customers|hours|days|weeks|months|records|requests|endpoints|apis|modules|screens|features|tests|members|students|teams|projects|pages|leads|orders)\b|\b\d{2,}\b/i;

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */
export function extractBullets(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/\r?\n/).map((l) => l.replace(/^[\s•*\\\-–▪›>]+/, "").trim()).filter(Boolean);
}
const has = (v) => typeof v === "string" && v.trim().length > 0;
const wordsOf = (t) => (typeof t === "string" ? t.trim().split(/\s+/).filter(Boolean) : []);
const round1 = (n) => Math.round(n * 10) / 10;
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const startsStrong = (b) => {
  const f = (b.split(/\s+/)[0] || "").toLowerCase().replace(/[^a-z]/g, "");
  return !!f && !WEAK_STARTS.has(f) && STRONG_VERBS.has(f);
};
const firstWord = (b) => (b.split(/\s+/)[0] || "").toLowerCase().replace(/[^a-z]/g, "");

function getSkillCategories(skills) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) return [];
  return Object.entries(skills)
    .map(([category, values]) => {
      let list = [];
      if (Array.isArray(values)) list = values;
      else if (typeof values === "string") list = values.split(/[,;\n]/);
      return {
        category: String(category).trim(),
        skills: list.filter((s) => typeof s === "string" || typeof s === "number").map((s) => String(s).trim()).filter(Boolean),
      };
    })
    .filter((c) => c.category && c.skills.length > 0);
}

export function getScoreLevel(score) {
  if (score >= 85) return { label: "Excellent", tone: "excellent" };
  if (score >= 70) return { label: "Good", tone: "good" };
  if (score >= 55) return { label: "Fair", tone: "fair" };
  return { label: "Needs Work", tone: "poor" };
}

export function parseResumeRecord(record) {
  if (!record || typeof record !== "object") return null;
  let data = record.resumeData || record.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  if (data && typeof data === "object") return { ...record, ...data, personal: data.personal || record.personal || {} };
  if (record.personal || record.experience || record.skills || record.summary) return record;
  return null;
}

/* ---------- dates / experience ---------- */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDate(str, isEnd) {
  const s = String(str || "").toLowerCase().trim();
  if (!s) return null;
  if (/present|current|now|ongoing|till date/.test(s)) return new Date();
  const y = s.match(/(19|20)\d{2}/);
  if (!y) return null;
  const m = s.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
  return new Date(parseInt(y[0], 10), m ? MONTHS[m[0]] : isEnd ? 11 : 0, 1);
}
function entryMonths(item) {
  const a = parseDate(item.startDate, false);
  const b = parseDate(item.endDate, true) || (a ? new Date() : null);
  if (!a || !b) return 0;
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1);
}

/* ---------- degree ---------- */
function degreeLevelsIn(text) {
  const t = String(text || "").toLowerCase();
  const levels = [];
  if (/ph\.?\s?d|doctorate/.test(t)) levels.push(3);
  if (/\bmaster|m\.?\s?tech|\bm\.?\s?e\b|m\.?\s?sc|\bmba\b|\bmca\b/.test(t)) levels.push(2);
  if (/bachelor|b\.?\s?tech|\bb\.?\s?e\b|b\.?\s?sc|\bbca\b|b\.?\s?com|\bbba\b|undergraduate|\bdegree\b/.test(t)) levels.push(1);
  if (/diploma/.test(t)) levels.push(0.5);
  return levels;
}

/* ------------------------------------------------------------------ */
/*  JOB DESCRIPTION PARSING                                            */
/* ------------------------------------------------------------------ */
function parseJob(jd, explicitTitle) {
  const lines = String(jd || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let mode = "required";
  const req = [];
  const pref = [];
  const PREF_HEAD = /(preferred|nice to have|good to have|bonus|desirable|added advantage|a plus)/i;
  const REQ_HEAD = /(requirements?|qualifications?|responsibilit|what you|must have|required|skills|who you are|about you|you will|key)/i;

  lines.forEach((line) => {
    const short = line.length < 60;
    if (short && PREF_HEAD.test(line)) { mode = "preferred"; return; }
    if (short && REQ_HEAD.test(line)) { mode = "required"; return; }
    const inlinePref = line.length >= 60 && /\b(preferred|nice to have|good to have|bonus|a plus|desirable|added advantage)\b/i.test(line);
    (mode === "preferred" || inlinePref ? pref : req).push(line);
  });

  let title = String(explicitTitle || "").trim();
  if (!title && lines[0] && wordsOf(lines[0]).length <= 10 && !/[.!?]$/.test(lines[0])) {
    title = lines[0].replace(/^(job title|role|position)\s*[:\-]\s*/i, "");
  }
  return { reqText: req.join("\n"), prefText: pref.join("\n"), fullText: lines.join("\n"), title };
}

function extractJobKeywords(parsed) {
  const req = normalize(parsed.reqText);
  const pref = normalize(parsed.prefText);
  const all = `${req}\n${pref}`;

  const found = [];
  ALL_TERMS.forEach((term) => {
    const inReq = containsTerm(req, term);
    const inPref = containsTerm(pref, term);
    if (inReq || inPref) found.push({ term, kind: inReq ? "required" : "preferred", count: countTerm(all, term) });
  });
  const kept = found.filter((f) => !found.some((o) => o !== f && o.term.length > f.term.length && o.term.includes(f.term)));

  const list = kept.map((k) => ({
    term: k.term,
    kind: k.kind,
    weight: k.kind === "required" ? 1 + Math.min(k.count - 1, 3) * 0.15 : 0.5,
  }));

  // extra phrases from the posting itself (works for non-tech domains)
  const segments = all.split(/[\n.;,:()•\-–|/]+/);
  const uni = {};
  const bi = {};
  segments.forEach((seg) => {
    const toks = seg.split(/\s+/).map((w) => w.replace(/[^a-z+#&]/g, "")).filter(Boolean);
    toks.forEach((w, i) => {
      const ok = (x) => x.length >= 4 && !STOP.has(x) && !GENERIC.has(x);
      if (ok(w)) uni[w] = (uni[w] || 0) + 1;
      if (i < toks.length - 1 && ok(w) && ok(toks[i + 1])) {
        const k = `${w} ${toks[i + 1]}`;
        bi[k] = (bi[k] || 0) + 1;
      }
    });
  });
  const covered = (p) => kept.some((k) => k.term.includes(p) || p.includes(k.term));
  const extras = [];
  Object.entries(bi).filter(([p, c]) => c >= 2 && !covered(p)).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .forEach(([p]) => extras.push(p));
  Object.entries(uni).filter(([w, c]) => c >= 3 && !covered(w) && !extras.some((e) => e.includes(w))).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .forEach(([w]) => extras.push(w));
  extras.forEach((p) => list.push({ term: p, kind: "other", weight: 0.4 }));

  return list.slice(0, 45);
}

function detectDomain(roleText, jobTitle, bodyText) {
  const titleText = `${roleText} ${jobTitle}`.toLowerCase();
  let best = null;
  let bestScore = 0;
  Object.entries(DOMAINS).forEach(([key, d]) => {
    let s = d.title.test(titleText) ? 6 : 0;
    d.terms.forEach((t) => {
      if (containsTerm(bodyText, t)) s += 1;
    });
    if (s > bestScore) {
      bestScore = s;
      best = key;
    }
  });
  return bestScore >= 3 ? { key: best, label: DOMAINS[best].label, tech: DOMAINS[best].tech } : null;
}

/* ------------------------------------------------------------------ */
/*  MAIN                                                               */
/* ------------------------------------------------------------------ */
const WEIGHTS = { keywords: 38, requirements: 12, bullets: 20, format: 8, sections: 5, summary: 6, skills: 6, education: 5 };
const LABELS = {
  keywords: "Job Keyword Match",
  requirements: "Job Requirements Fit",
  bullets: "Experience & Impact",
  format: "Format & Contact",
  sections: "Standard Sections",
  summary: "Summary",
  skills: "Skills Section",
  education: "Education",
};

export function analyzeResume(resume, options = {}) {
  const r = resume || {};
  const personal = r.personal || {};
  const summary = typeof r.summary === "string" ? r.summary : "";
  const education = Array.isArray(r.education) ? r.education : [];
  const experience = Array.isArray(r.experience) ? r.experience : [];
  const internships = Array.isArray(r.internships) ? r.internships : [];
  const projects = Array.isArray(r.projects) ? r.projects : [];
  const certifications = Array.isArray(r.certifications) ? r.certifications : [];
  const achievements = Array.isArray(r.achievements) ? r.achievements : [];
  const involvement = Array.isArray(r.involvement) ? r.involvement : [];
  const languages = Array.isArray(r.languages) ? r.languages : [];
  const categories = getSkillCategories(r.skills);
  const allSkills = categories.flatMap((c) => c.skills);

  const strengths = [];
  const missing = [];
  const suggestions = [];

  const bullets = [...experience, ...internships, ...projects].flatMap((i) => extractBullets(i && i.description));

  const contextText = normalize(
    [
      ...experience.flatMap((e) => [e.role, e.company, e.description]),
      ...internships.flatMap((e) => [e.role, e.company, e.description]),
      ...projects.flatMap((p) => [p.name, p.technologies, p.description]),
      ...achievements.flatMap((a) => [a.title, a.description]),
      ...involvement.flatMap((i) => [i.role, i.organization, i.description]),
    ].filter(Boolean).join(" \n ")
  );
  const listText = normalize(
    [
      r.role, summary, ...allSkills,
      ...certifications.flatMap((c) => [c.name, c.issuer]),
      ...education.flatMap((e) => [e.degree, e.field, e.institution]),
      ...languages.map((l) => l.name),
    ].filter(Boolean).join(" \n ")
  );
  const fullText = `${contextText}\n${listText}`;
  const totalWords = wordsOf(fullText).length;

  /* ---------- job description ---------- */
  const jdRaw = typeof options.jobDescription === "string" ? options.jobDescription.trim() : "";
  const hasJob = jdRaw.length >= 40;
  const parsedJob = hasJob ? parseJob(jdRaw, options.jobTitle) : null;
  const jobKeywords = hasJob ? extractJobKeywords(parsedJob) : [];
  const roleText = [r.role, ...experience.map((e) => e.role), ...internships.map((e) => e.role)].filter(Boolean).join(" ");
  const domain = detectDomain(roleText, parsedJob?.title || options.jobTitle || "", hasJob ? normalize(parsedJob.fullText) : fullText);
  const isTech = domain ? domain.tech : false;

  const ratios = {};
  const applicable = {};

  /* ---------- FORMAT & CONTACT ---------- */
  {
    let pts = 0;
    const checks = [
      ["Email", 3, has(personal.email)],
      ["Phone number", 2, has(personal.phone)],
      ["Location", 1, has(personal.location)],
      ["LinkedIn profile", 2, has(personal.linkedin)],
    ];
    checks.forEach(([label, p, ok]) => {
      if (ok) pts += p;
      else missing.push(`${label} is missing from the contact header`);
    });
    if (isTech) {
      if (has(personal.github) || has(personal.website)) pts += 1;
      else missing.push("GitHub / portfolio link is missing (expected for technical roles)");
    } else {
      pts += 1;
    }
    if (totalWords >= 300 && totalWords <= 800) {
      pts += 3;
      strengths.push(`Resume length is ideal (~${totalWords} words)`);
    } else if ((totalWords >= 200 && totalWords < 300) || (totalWords > 800 && totalWords <= 1000)) {
      pts += 1.5;
      suggestions.push(`Resume is ~${totalWords} words. Aim for 300–800 (one page for freshers, two for experienced).`);
    } else {
      missing.push(totalWords < 200 ? "Resume content is too thin" : "Resume is too long for a quick recruiter scan");
    }
    if (has(personal.photo)) {
      pts = Math.max(0, pts - 2);
      missing.push("Profile photo included; many ATS parsers and recruiters discourage photos");
      suggestions.push("Remove the photo when applying through company ATS portals.");
    }
    if (checks.every(([, , ok]) => ok)) strengths.push("Contact header is complete");
    ratios.format = clamp01(pts / 12);
    applicable.format = true;
  }

  /* ---------- SECTIONS ---------- */
  {
    const checks = [
      ["Professional Summary", has(summary)],
      ["Skills", categories.length > 0],
      ["Experience, Internships or Projects", experience.length + internships.length + projects.length > 0],
      ["Education", education.length > 0],
      ["Certifications, Achievements or Activities", certifications.length + achievements.length + involvement.length > 0],
    ];
    checks.forEach(([label, ok]) => {
      if (!ok) missing.push(`Section not found: ${label}`);
    });
    if (checks.every(([, ok]) => ok)) strengths.push("All standard ATS sections are present");
    ratios.sections = checks.filter(([, ok]) => ok).length / checks.length;
    applicable.sections = true;
  }

  /* ---------- SUMMARY ---------- */
  {
    let pts = 0;
    const words = wordsOf(summary).length;
    if (words === 0) {
      missing.push("Professional summary is missing");
      suggestions.push("Add a 40–70 word summary with your role, key strengths and one result.");
    } else {
      pts += 2;
      if (words >= 40 && words <= 75) {
        pts += 3;
        strengths.push(`Summary length is ideal (${words} words)`);
      } else if ((words >= 25 && words < 40) || (words > 75 && words <= 100)) {
        pts += 1.5;
        suggestions.push(`Summary is ${words} words; aim for 40–75.`);
      } else {
        missing.push(words < 25 ? "Summary is too short" : "Summary is too long");
      }
      const sumNorm = normalize(summary);
      const pool = hasJob ? jobKeywords.filter((k) => k.kind === "required").map((k) => k.term) : allSkills.map((s) => s.toLowerCase());
      const hits = pool.filter((t) => containsTerm(sumNorm, t)).length;
      if (hits >= 3) {
        pts += 3;
        strengths.push(hasJob ? "Summary uses keywords from the job posting" : "Summary mentions your core skills");
      } else {
        pts += hits;
        suggestions.push(hasJob ? "Work 3+ of the job's required keywords into your summary (only ones you genuinely have)." : "Name at least 3 of your core skills in the summary.");
      }
      if (FIRST_PERSON.test(summary)) {
        pts = Math.max(0, pts - 1);
        suggestions.push('Avoid "I" / "my" in the summary.');
      }
    }
    ratios.summary = clamp01(pts / 8);
    applicable.summary = true;
  }

  /* ---------- EXPERIENCE & IMPACT ---------- */
  {
    const total = bullets.length;
    let pts = 0;
    if (total === 0) {
      missing.push("No bullet points found in experience, internships or projects");
      suggestions.push("Add 2–4 bullets per role or project showing what you did and the result.");
    } else {
      pts += clamp01(total / 10) * 6;
      if (total >= 10) strengths.push(`Good bullet coverage (${total} bullets)`);
      else missing.push(`Only ${total} bullet point${total === 1 ? "" : "s"} (aim for 10+)`);

      const inRange = bullets.filter((b) => { const n = wordsOf(b).length; return n >= 8 && n <= 30; }).length;
      pts += clamp01(inRange / total / 0.8) * 4;
      if (inRange / total < 0.8) suggestions.push("Keep bullets between 8 and 30 words.");

      const strong = bullets.filter(startsStrong).length;
      pts += clamp01(strong / total / 0.9) * 6;
      if (strong / total >= 0.9) strengths.push(`${strong}/${total} bullets open with strong action verbs`);
      else {
        missing.push(`Only ${strong} of ${total} bullets start with a strong action verb`);
        suggestions.push('Start bullets with verbs like "Built", "Led", "Reduced", "Negotiated".');
      }

      const quantified = bullets.filter((b) => METRIC_RE.test(b)).length;
      pts += clamp01(quantified / total / 0.5) * 8;
      if (quantified / total >= 0.5) strengths.push(`${quantified}/${total} bullets show measurable impact`);
      else {
        missing.push(`Only ${quantified} of ${total} bullets include numbers or results`);
        suggestions.push("Quantify impact (%, counts, time saved, revenue, users).");
      }

      const verbs = bullets.map(firstWord).filter(Boolean);
      pts += clamp01((verbs.length ? new Set(verbs).size / verbs.length : 0) / 0.75) * 3;

      const weak = bullets.filter((b) => WEAK_PHRASES.test(b) || FIRST_PERSON.test(b)).length;
      pts += weak === 0 ? 3 : Math.max(0, 3 - weak);
      if (weak > 0) missing.push(`${weak} bullet${weak === 1 ? "" : "s"} use weak phrasing ("responsible for", "worked on", "I", "my")`);
    }
    ratios.bullets = clamp01(pts / 30);
    applicable.bullets = true;
  }

  /* ---------- SKILLS SECTION ---------- */
  {
    let pts = 0;
    if (categories.length === 0) {
      missing.push("Skills section is empty");
      suggestions.push("Add a skills section grouped into clear categories.");
    } else {
      pts += clamp01(categories.length / 3) * 5;
      pts += clamp01(allSkills.length / 12) * 5;
      if (categories.length < 3) suggestions.push("Group skills into at least 3 categories.");
      const evidence = normalize([summary, ...bullets, ...projects.map((p) => p.technologies)].join(" "));
      const proven = allSkills.filter((s) => containsTerm(evidence, s.toLowerCase())).length;
      const ratio = allSkills.length ? proven / allSkills.length : 0;
      pts += clamp01(ratio / 0.5) * 5;
      if (ratio >= 0.5) strengths.push("Listed skills are backed by your bullets and projects");
      else suggestions.push("Many listed skills never appear in your experience or projects. Mention them in bullets to prove them.");
    }
    ratios.skills = clamp01(pts / 15);
    applicable.skills = true;
  }

  /* ---------- EDUCATION ---------- */
  {
    let pts = 0;
    if (education.length === 0) {
      missing.push("Education section is empty");
    } else {
      pts += 2;
      const checks = [
        ["Degree", education.some((e) => e && (has(e.degree) || has(e.level)))],
        ["Institution", education.some((e) => e && has(e.institution))],
        ["Grade / CGPA", education.some((e) => e && has(e.grade))],
        ["Dates", education.some((e) => e && (has(e.startDate) || has(e.endDate)))],
      ];
      checks.forEach(([label, ok]) => {
        if (ok) pts += 2;
        else missing.push(`${label} missing in education`);
      });
      if (checks.every(([, ok]) => ok)) strengths.push("Education is complete");
    }
    ratios.education = clamp01(pts / 10);
    applicable.education = true;
  }

  /* ---------- JOB-SPECIFIC CATEGORIES ---------- */
  let job = null;
  if (hasJob) {
    // keyword match
    const kwResults = jobKeywords.map((k) => {
      const inContext = containsTerm(contextText, k.term);
      const inList = containsTerm(listText, k.term);
      return { ...k, credit: inContext ? 1 : inList ? 0.7 : 0, where: inContext ? "experience" : inList ? "skills" : null };
    });
    const totalW = kwResults.reduce((s, k) => s + k.weight, 0);
    const gotW = kwResults.reduce((s, k) => s + k.weight * k.credit, 0);
    const kwRatio = totalW ? gotW / totalW : 0;
    ratios.keywords = clamp01(kwRatio / 0.9);
    applicable.keywords = kwResults.length > 0;

    const matched = kwResults.filter((k) => k.credit > 0);
    const missReq = kwResults.filter((k) => k.credit === 0 && k.kind === "required").map((k) => k.term);
    const missPref = kwResults.filter((k) => k.credit === 0 && k.kind !== "required").map((k) => k.term);
    const reqTotal = kwResults.filter((k) => k.kind === "required").length;
    const reqMatched = matched.filter((k) => k.kind === "required").length;

    if (applicable.keywords) {
      if (kwRatio >= 0.75) strengths.push(`Strong job match: ${reqMatched} of ${reqTotal} required keywords found`);
      else missing.push(`Job keyword match is ${Math.round(kwRatio * 100)}% (${reqMatched} of ${reqTotal} required keywords found)`);
      if (missReq.length) suggestions.push(`The posting asks for: ${missReq.slice(0, 8).join(", ")}. Add them to your skills and use them in a bullet, but only if you genuinely have the experience.`);
      const listOnly = matched.filter((k) => k.where === "skills" && k.kind === "required").map((k) => k.term);
      if (listOnly.length) suggestions.push(`Show these in action (they appear only in skills/summary): ${listOnly.slice(0, 6).join(", ")}.`);
    }

    // requirements fit
    const checks = [];
    let reqPts = 0;
    let reqMax = 0;

    const STOP_TITLE = new Set(["senior", "junior", "jr", "sr", "lead", "staff", "principal", "associate", "intern", "trainee", "the", "and", "for", "with"]);
    const synonym = (w) => (/^(developer|engineer|programmer|sde)$/.test(w) ? "engineer" : w);
    const titleWords = (parsedJob.title || "").toLowerCase().split(/[^a-z+#.]+/).filter((w) => w.length >= 3 && !STOP_TITLE.has(w)).map(synonym);
    if (titleWords.length) {
      const resumeTitle = normalize(`${roleText} ${summary.slice(0, 220)}`).split(/[^a-z+#.]+/).map(synonym);
      const hit = titleWords.filter((w) => resumeTitle.includes(w)).length / titleWords.length;
      reqMax += 4;
      reqPts += hit * 4;
      checks.push({
        label: `Job title: "${parsedJob.title}"`,
        status: hit >= 0.99 ? "ok" : hit >= 0.5 ? "warn" : "fail",
        detail: hit >= 0.99 ? "Your title/role matches the posting" : "Your role or summary doesn't clearly mirror this job title",
      });
      if (hit < 0.99) suggestions.push(`Use the posting's title ("${parsedJob.title}") wording in your role line or summary where accurate.`);
    }

    const yearsMatches = [];
    String(jdRaw).split(/[.\n]/).forEach((sent) => {
      if (!/experience/i.test(sent)) return;
      const re = /(\d{1,2})\s*\+?\s*(?:-|–|to)?\s*(?:\d{1,2}\s*)?\+?\s*years?/gi;
      let m;
      while ((m = re.exec(sent))) yearsMatches.push(parseInt(m[1], 10));
    });
    if (yearsMatches.length) {
      const need = Math.max(...yearsMatches);
      const months = experience.reduce((s, e) => s + entryMonths(e), 0) + internships.reduce((s, e) => s + entryMonths(e) * 0.5, 0);
      const have = months / 12;
      const ratio = need > 0 ? clamp01(have / need) : 1;
      reqMax += 4;
      reqPts += ratio * 4;
      checks.push({
        label: `Experience: ${need}+ years requested`,
        status: ratio >= 0.99 ? "ok" : ratio >= 0.6 ? "warn" : "fail",
        detail: `Your resume shows about ${have.toFixed(1)} year${have.toFixed(1) === "1.0" ? "" : "s"} of experience`,
      });
      if (ratio < 0.99) missing.push(`Posting asks for ${need}+ years of experience; your resume shows ~${have.toFixed(1)}`);
    }

    const jdLevels = degreeLevelsIn(jdRaw);
    if (jdLevels.length) {
      const needLevel = Math.min(...jdLevels);
      let haveLevel = 0;
      education.forEach((e) => {
        const txt = `${e.degree || ""} ${e.level || ""} ${e.field || ""}`;
        if (/sslc|10th|puc|12th/i.test(txt) && !degreeLevelsIn(txt).length) return;
        const lv = degreeLevelsIn(txt);
        haveLevel = Math.max(haveLevel, lv.length ? Math.max(...lv) : has(e.degree) ? 1 : 0);
      });
      const ratio = haveLevel >= needLevel ? 1 : haveLevel >= needLevel - 1 && haveLevel > 0 ? 0.5 : 0;
      reqMax += 4;
      reqPts += ratio * 4;
      const names = { 0.5: "Diploma", 1: "Bachelor's degree", 2: "Master's degree", 3: "PhD" };
      checks.push({
        label: `Education: ${names[needLevel] || "Degree"} requested`,
        status: ratio === 1 ? "ok" : ratio > 0 ? "warn" : "fail",
        detail: ratio === 1 ? "Your education meets this requirement" : "Your listed education may not meet this requirement",
      });
      if (ratio < 1) missing.push(`Posting expects a ${names[needLevel] || "degree"}; check your education entries`);
    }

    applicable.requirements = reqMax > 0;
    ratios.requirements = reqMax > 0 ? clamp01(reqPts / reqMax) : 0;
    if (checks.every((c) => c.status === "ok") && checks.length) strengths.push("You meet the posting's title, experience and education requirements");

    job = {
      title: parsedJob.title,
      keywordRatio: kwRatio,
      matched: matched.map((k) => ({ term: k.term, kind: k.kind, where: k.where })),
      missingRequired: missReq,
      missingPreferred: missPref,
      checks,
      keywordCount: kwResults.length,
    };
  } else {
    applicable.keywords = false;
    applicable.requirements = false;
    suggestions.unshift("Paste the job description to see a job-specific keyword and requirements match.");
  }

  /* ---------- COMBINE ---------- */
  const activeKeys = Object.keys(WEIGHTS).filter((k) => applicable[k]);
  const totalWeight = activeKeys.reduce((s, k) => s + WEIGHTS[k], 0);
  const breakdown = activeKeys.map((k) => {
    const max = (WEIGHTS[k] / totalWeight) * 100;
    return { key: k, label: LABELS[k], earned: round1((ratios[k] || 0) * max), max: round1(max) };
  });
  let score = breakdown.reduce((s, b) => s + b.earned, 0);

  let cap = 100;
  let capReason = "";
  if (bullets.length === 0) { cap = 45; capReason = "Score capped at 45: no experience, internship or project bullets."; }
  else if (bullets.length < 4) { cap = 62; capReason = "Score capped at 62: fewer than 4 bullet points."; }
  if (categories.length === 0 && cap > 68) { cap = 68; capReason = "Score capped at 68: no skills section."; }
  if (!has(personal.email) && cap > 60) { cap = 60; capReason = "Score capped at 60: no email address."; }
  if (job && job.keywordCount >= 5) {
    if (job.keywordRatio < 0.25 && cap > 55) { cap = 55; capReason = "Score capped at 55: very low match with this job posting."; }
    else if (job.keywordRatio < 0.45 && cap > 70) { cap = 70; capReason = "Score capped at 70: low keyword match with this job posting."; }
  }
  if (score > cap) {
    score = cap;
    suggestions.unshift(capReason);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const level = getScoreLevel(score);
  if (suggestions.length === 0) suggestions.push("Excellent. Re-check against each new job posting before you apply.");

  return {
    score,
    label: level.label,
    tone: level.tone,
    mode: hasJob ? "job" : "general",
    domain: domain ? domain.label : null,
    breakdown,
    strengths,
    missing,
    suggestions,
    job,
    stats: {
      words: totalWords,
      bullets: bullets.length,
      strongVerbs: bullets.filter(startsStrong).length,
      quantified: bullets.filter((b) => METRIC_RE.test(b)).length,
      skills: allSkills.length,
    },
  };
}