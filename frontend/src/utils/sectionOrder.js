export const DEFAULT_SECTION_ORDER = [
  "summary",
  "skills",
  "experience",
  "internships",
  "projects",
  "education",
  "certifications",
  "achievements",
  "involvement",
  "languages",
];

export const SECTION_LABELS = {
  summary: "Summary",
  skills: "Technical Skills",
  experience: "Work Experience",
  internships: "Internships",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  involvement: "Involvement & Activities",
  languages: "Languages",
};

export function normalizeSectionOrder(order, customIds = []) {
  const valid = [...DEFAULT_SECTION_ORDER, ...customIds];
  const saved = Array.isArray(order) ? order.filter((id) => valid.includes(id)) : [];
  const unique = [...new Set(saved)];
  valid.forEach((id) => {
    if (!unique.includes(id)) unique.push(id);
  });
  return unique;
}