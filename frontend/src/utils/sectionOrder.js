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

// Always returns every known section exactly once, honoring the saved order.
export function normalizeSectionOrder(order) {
  const saved = Array.isArray(order)
    ? order.filter((id) => DEFAULT_SECTION_ORDER.includes(id))
    : [];
  const unique = [...new Set(saved)];
  DEFAULT_SECTION_ORDER.forEach((id) => {
    if (!unique.includes(id)) unique.push(id);
  });
  return unique;
}