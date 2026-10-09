/**
 * Production-grade heuristic resume parser
 */

const SECTION_HEADERS = {
  summary: [
    "SUMMARY",
    "PROFESSIONAL SUMMARY",
    "CAREER OBJECTIVE",
    "OBJECTIVE",
    "PROFILE",
    "ABOUT ME",
    "ABOUT",
  ],
  education: [
    "EDUCATION",
    "ACADEMIC QUALIFICATIONS",
    "ACADEMICS",
    "QUALIFICATIONS",
    "ACADEMIC BACKGROUND",
    "EDUCATIONAL BACKGROUND",
  ],
  experience: [
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "PROFESSIONAL EXPERIENCE",
    "INTERNSHIPS",
    "INTERNSHIP",
    "EMPLOYMENT HISTORY",
    "WORK HISTORY",
  ],
  projects: [
    "PROJECTS",
    "TECHNICAL PROJECTS",
    "ACADEMIC PROJECTS",
    "KEY PROJECTS",
    "PERSONAL PROJECTS",
  ],
  skills: [
    "SKILLS",
    "TECHNICAL SKILLS",
    "KEY SKILLS",
    "AREAS OF EXPERTISE",
    "CORE COMPETENCIES",
    "TECH STACK",
    "TECHNOLOGIES",
  ],
  certifications: [
    "CERTIFICATIONS",
    "CERTIFICATES",
    "LICENSES",
    "ACHIEVEMENTS",
    "COURSES & CERTIFICATIONS",
  ],
};

export function parseResumeText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return createEmptyResume();
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed = createEmptyResume();

  // --- 1. PERSONAL DETAILS ---
  // Email
  const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) parsed.personal.email = emailMatch[1].trim();

  // Phone (Indian & International patterns)
  const phoneMatch = rawText.match(/(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 10) {
    parsed.personal.phone = phoneMatch[0].trim();
  }

  // LinkedIn
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) parsed.personal.linkedin = linkedinMatch[0];

  // GitHub
  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (githubMatch) parsed.personal.github = githubMatch[0];

  // Full Name Detection (Top non-contact lines)
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const candidate = lines[i];
    if (
      !candidate.includes("@") &&
      !candidate.includes("github.com") &&
      !candidate.includes("linkedin.com") &&
      !/\d{5,}/.test(candidate) &&
      !isAnySectionHeader(candidate) &&
      candidate.length >= 2 &&
      candidate.length <= 45 &&
      /^[A-Za-z\s.]+$/.test(candidate)
    ) {
      parsed.personal.fullName = candidate.trim();
      break;
    }
  }

  // Location detection
  const locationMatch = rawText.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),\s*(Karnataka|Maharashtra|Tamil Nadu|Telangana|Delhi|India|[A-Z]{2})\b/);
  if (locationMatch) {
    parsed.personal.location = locationMatch[0];
  }

  // --- 2. SEGMENT INTO SECTIONS ---
  const sections = {
    summary: [],
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
  };

  let currentKey = null;

  for (const line of lines) {
    const detectedKey = detectSectionKey(line);
    if (detectedKey) {
      currentKey = detectedKey;
    } else if (currentKey) {
      sections[currentKey].push(line);
    }
  }

  // --- 3. PARSE SUMMARY ---
  if (sections.summary.length > 0) {
    parsed.summary = sections.summary.join(" ").slice(0, 600);
  }

  // --- 4. PARSE EDUCATION ---
  if (sections.education.length > 0) {
    parsed.education = extractEducation(sections.education);
  }

  // --- 5. PARSE EXPERIENCE ---
  if (sections.experience.length > 0) {
    parsed.experience = extractExperience(sections.experience);
  }

  // --- 6. PARSE PROJECTS ---
  if (sections.projects.length > 0) {
    parsed.projects = extractProjects(sections.projects);
  }

  // --- 7. PARSE SKILLS (Categorized) ---
  if (sections.skills.length > 0) {
    parsed.skills = extractCategorizedSkills(sections.skills);
  }

  // --- 8. PARSE CERTIFICATIONS ---
  if (sections.certifications.length > 0) {
    parsed.certifications = extractCertifications(sections.certifications);
  }

  return parsed;
}

// ---------------- Helper Extractors ----------------

function isAnySectionHeader(line) {
  const clean = line.toUpperCase().replace(/[^A-Z\s]/g, "").trim();
  return Object.values(SECTION_HEADERS).some((arr) => arr.includes(clean));
}

function detectSectionKey(line) {
  const clean = line.toUpperCase().replace(/[^A-Z\s]/g, "").trim();
  for (const [key, headers] of Object.entries(SECTION_HEADERS)) {
    if (headers.includes(clean)) return key;
  }
  return null;
}

function extractEducation(lines) {
  const entries = [];
  let current = null;

  const degreeRegex = /(B\.?E|B\.?Tech|M\.?Tech|BCA|MCA|B\.?Sc|M\.?Sc|Bachelor|Master|Diploma|PUC|12th|SSLC|10th|High School)/i;
  const yearRegex = /\b(19\d{2}|20\d{2})\b/g;

  for (const line of lines) {
    const hasDegree = degreeRegex.test(line);

    if (hasDegree || !current) {
      if (current) entries.push(current);

      let level = "Bachelor's Degree";
      if (/PUC|12th/i.test(line)) level = "PUC / 12th Standard";
      else if (/SSLC|10th|High School/i.test(line)) level = "SSLC / 10th Standard / High School";
      else if (/Master|M\.?Tech|MCA/i.test(line)) level = "Master's Degree";
      else if (/Diploma/i.test(line)) level = "Diploma";

      current = {
        level,
        institution: hasDegree ? "" : line,
        degree: hasDegree ? line : "B.E. / B.Tech",
        field: "Computer Science",
        startDate: "",
        endDate: "",
        grade: "",
      };
    } else {
      if (!current.institution && !hasDegree) {
        current.institution = line;
      }
      const years = line.match(yearRegex);
      if (years) {
        if (years.length >= 2) {
          current.startDate = years[0];
          current.endDate = years[1];
        } else if (years.length === 1) {
          current.endDate = years[0];
        }
      }
      const gradeMatch = line.match(/(\d+(?:\.\d+)?\s*(?:%|CGPA|GPA))/i);
      if (gradeMatch) {
        current.grade = gradeMatch[0];
      }
    }
  }

  if (current) entries.push(current);
  return entries.length > 0 ? entries : [
    {
      level: "Bachelor's Degree",
      institution: lines[0] || "College Name",
      degree: "Bachelor of Engineering",
      field: "Computer Science",
      startDate: "2022",
      endDate: "2026",
      grade: ""
    }
  ];
}

function extractExperience(lines) {
  const entries = [];
  let current = null;

  const roleKeywords = /(Intern|Developer|Engineer|Trainee|Analyst|Consultant|Associate|Lead)/i;
  const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s*\d{4}\b|\bPresent\b/gi;

  for (const line of lines) {
    const isNewRole = roleKeywords.test(line) && line.length < 60;

    if (isNewRole) {
      if (current) entries.push(current);
      current = {
        role: line,
        company: "Company / Organization",
        location: "",
        startDate: "",
        endDate: "Present",
        description: "",
      };
    } else if (current) {
      const dates = line.match(dateRegex);
      if (dates && dates.length >= 2) {
        current.startDate = dates[0];
        current.endDate = dates[1];
      } else if (!current.company || current.company === "Company / Organization") {
        current.company = line;
      } else {
        current.description += (current.description ? " " : "") + line.replace(/^[•\-\*]\s*/, "");
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

function extractProjects(lines) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const isHeaderLine = line.length < 50 && !line.startsWith("•") && !line.startsWith("-");

    if (isHeaderLine) {
      if (current) entries.push(current);
      current = {
        name: line.replace(/^Project:?\s*/i, ""),
        technologies: "",
        link: "",
        description: "",
      };
    } else if (current) {
      if (/https?:\/\/|github\.com/i.test(line)) {
        const urlMatch = line.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) current.link = urlMatch[0];
      } else if (!current.technologies && /(Java|Spring|React|Node|SQL|Python|AWS|HTML|CSS)/i.test(line)) {
        current.technologies = line;
      } else {
        current.description += (current.description ? " " : "") + line.replace(/^[•\-\*]\s*/, "");
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

function extractCategorizedSkills(lines) {
  const rawTokens = lines
    .join(", ")
    .split(/[,|•\n\/]/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
    .filter((s) => s.length >= 2 && s.length <= 30 && !isAnySectionHeader(s));

  const unique = Array.from(new Set(rawTokens));

  const categories = {
    "Languages": [],
    "Backend & Frameworks": [],
    "Frontend": [],
    "Databases": [],
    "Tools & Others": [],
  };

  const languageMap = /^(Java|Python|C\+\+|C|JavaScript|TypeScript|HTML|CSS|Go|Rust|Kotlin|PHP)$/i;
  const backendMap = /^(Spring Boot|Spring|Hibernate|REST API|Node\.js|Express|Servlets|JSP|Django)$/i;
  const frontendMap = /^(React|React\.js|Redux|Tailwind|Bootstrap|Vue|Angular)$/i;
  const dbMap = /^(MySQL|PostgreSQL|MongoDB|SQL|Oracle|Redis)$/i;

  unique.forEach((skill) => {
    if (languageMap.test(skill)) categories["Languages"].push(skill);
    else if (backendMap.test(skill)) categories["Backend & Frameworks"].push(skill);
    else if (frontendMap.test(skill)) categories["Frontend"].push(skill);
    else if (dbMap.test(skill)) categories["Databases"].push(skill);
    else categories["Tools & Others"].push(skill);
  });

  // Remove empty categories
  const result = {};
  for (const [k, v] of Object.entries(categories)) {
    if (v.length > 0) result[k] = v;
  }

  return Object.keys(result).length > 0 ? result : { "Technical Skills": unique.slice(0, 15) };
}

function extractCertifications(lines) {
  return lines
    .filter((l) => l.length > 4 && l.length < 80 && !isAnySectionHeader(l))
    .slice(0, 5)
    .map((cert) => ({
      name: cert.replace(/^[•\-\*]\s*/, ""),
      issuer: "Authorized Issuer",
      date: "",
      credentialId: "",
      url: "",
    }));
}

function createEmptyResume() {
  return {
    personal: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      website: "",
    },
    summary: "",
    education: [],
    experience: [],
    projects: [],
    skills: {
      "Technical Skills": [],
    },
    certifications: [],
  };
}