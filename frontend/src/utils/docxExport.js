export function downloadResumeDocx(resume) {
  const personal = resume.personal || {};
  const education = resume.education || [];
  const experience = resume.experience || [];
  const projects = resume.projects || [];
  const skills = resume.skills || {};
  const certifications = resume.certifications || [];

  const skillsFormatted = Object.entries(skills)
    .filter(([_, list]) => Array.isArray(list) && list.length > 0)
    .map(([cat, list]) => `<p><b>${cat.toUpperCase()}:</b> ${list.join(", ")}</p>`)
    .join("");

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${resume.name || "Resume"}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 1in; }
      h1 { font-size: 20pt; margin: 0 0 4pt; text-transform: uppercase; color: #111; }
      .role { font-size: 13pt; color: #333; font-weight: bold; margin-bottom: 6pt; }
      .contact { font-size: 9.5pt; color: #555; margin-bottom: 14pt; border-bottom: 1.5pt solid #111; padding-bottom: 4pt; }
      h2 { font-size: 12pt; text-transform: uppercase; border-bottom: 1pt solid #ccc; padding-bottom: 2pt; margin: 12pt 0 4pt; color: #111; }
      p { margin: 2pt 0; }
      ul { margin: 2pt 0 6pt 18pt; padding: 0; }
      li { margin-bottom: 2pt; }
      .job-header { display: flex; justify-content: space-between; font-weight: bold; }
    </style>
    </head>
    <body>
      <h1>${personal.fullName || "Your Name"}</h1>
      <div class="role">${resume.role || personal.jobTitle || ""}</div>
      <div class="contact">
        ${[personal.email, personal.phone, personal.location, personal.linkedin, personal.github].filter(Boolean).join(" | ")}
      </div>

      ${resume.summary ? `<h2>Professional Summary</h2><p>${resume.summary}</p>` : ""}

      ${skillsFormatted ? `<h2>Technical Skills</h2>${skillsFormatted}` : ""}

      ${experience.length ? `<h2>Experience</h2>${experience.map(exp => `
        <p><b>${exp.role || exp.title || ""}</b> — ${exp.company || ""} (${exp.startDate || ""} - ${exp.endDate || "Present"})</p>
        ${exp.description ? `<p>${exp.description}</p>` : ""}
      `).join("")}` : ""}

      ${projects.length ? `<h2>Projects</h2>${projects.map(proj => `
        <p><b>${proj.title || proj.name || ""}</b> ${proj.technologies ? `[${proj.technologies}]` : ""}</p>
        ${proj.description ? `<p>${proj.description}</p>` : ""}
      `).join("")}` : ""}

      ${education.length ? `<h2>Education</h2>${education.map(edu => `
        <p><b>${edu.degree || ""}</b> — ${edu.institution || edu.school || ""} (${edu.year || edu.startDate || ""})</p>
      `).join("")}` : ""}

      ${certifications.length ? `<h2>Certifications</h2>${certifications.map(c => `
        <p>• ${c.name || c.title || ""} (${c.issuer || ""})</p>
      `).join("")}` : ""}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', content], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(resume.name || "Resume").replace(/\s+/g, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}