/**
 * Exports the live resume preview to PDF and Word (.doc).
 * PDF uses the browser's print engine to preserve template styling
 * and allows content to flow naturally across multiple A4 pages.
 */

// 1. Export resume preview to a multi-page A4 PDF.
export function exportPreviewToPdf(elementId = "resume-paper", fileName = "resume") {
  const container = document.getElementById(elementId);
  const sheets = container ? Array.from(container.querySelectorAll(".resume-sheet")) : [];

  if (sheets.length === 0) {
    console.error(`exportPreviewToPdf: no .resume-sheet pages found inside #${elementId}`);
    return Promise.resolve();
  }

  let documentCss = "";
  const linkTags = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (rules) {
        for (const rule of Array.from(rules)) documentCss += rule.cssText + "\n";
      }
    } catch (e) {
      if (sheet.href) linkTags.push(`<link rel="stylesheet" href="${sheet.href}">`);
    }
  }

  // Overrides the app's global CSS (e.g. body{overflow:hidden; display:flex}) which
  // otherwise makes the print frame render only the first page.
  const printCss = `
    @page { size: A4 portrait; margin: 0; }

    html, body {
      display: block !important;
      position: static !important;
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      place-items: unset !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .resume-pages {
      display: block !important;
      gap: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      overflow: visible !important;
    }

    .resume-sheet {
      display: block !important;
      margin: 0 !important;
      box-shadow: none !important;
      width: 210mm !important;
      height: 296.4mm !important;
      overflow: hidden !important;
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
    }

    .resume-sheet:last-child {
      break-after: auto !important;
      page-break-after: auto !important;
    }

    .resume-paper h2.section-title {
      font-weight: 700 !important;
      font-synthesis: none;
    }
  `;

  const pagesMarkup = sheets.map((s) => s.outerHTML).join("\n");

  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // Real A4 width so layout is computed at page size, not 0x0
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const originalTitle = document.title;
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      document.title = originalTitle;
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 500);
      resolve();
    };

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${fileName}</title>
    ${linkTags.join("\n")}
    <style>${documentCss}</style>
    <style>${printCss}</style>
  </head>
  <body><div class="resume-pages">${pagesMarkup}</div></body>
</html>`);
    doc.close();

    const triggerPrint = async () => {
      try {
        if (iframe.contentDocument?.fonts?.ready) await iframe.contentDocument.fonts.ready;
      } catch (e) {
        // ignore
      }
      setTimeout(() => {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          return;
        }
        document.title = fileName; // suggested PDF filename
        win.addEventListener("afterprint", cleanup);
        win.focus();
        win.print();
        setTimeout(cleanup, 60000);
      }, 300);
    };

    if (iframe.contentDocument?.readyState === "complete") triggerPrint();
    else iframe.onload = triggerPrint;
  });
}
// 2. Export Word (.doc) formatted specifically for Microsoft Word's engine.
// Kept unchanged.
export function exportResumeToWord(resume, filename = "resume") {
  const personal = resume.personal || {};
  const education = resume.education || [];
  const experience = resume.experience || [];
  const projects = resume.projects || [];
  const skills = resume.skills || {};
  const certifications = resume.certifications || [];

  const accentColor = resume.color || resume.primaryColor || "#0f172a";
  const isClassic = resume.template === "classic";
  const fontFamily = isClassic
    ? "Georgia, serif"
    : "Arial, Helvetica, sans-serif";
  const textAlign = isClassic ? "center" : "left";

  const contactList = [
    personal.email,
    personal.phone,
    personal.location,
    personal.linkedin,
    personal.github,
    personal.website,
  ].filter(Boolean);

  const skillsFormatted = Object.entries(skills)
    .filter(([_, list]) => Array.isArray(list) && list.length > 0)
    .map(
      ([cat, list]) => `
      <p style="margin: 3pt 0; font-size: 10pt; color: #1e293b;">
        <strong style="color: #0f172a;">${cat.charAt(0).toUpperCase() + cat.slice(1)}:</strong> ${list.join(", ")}
      </p>`
    )
    .join("");

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt;
          margin: 0.6in 0.65in 0.6in 0.65in;
          mso-header-margin: 0in;
          mso-footer-margin: 0in;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: ${fontFamily};
          color: #1e293b;
          background-color: #ffffff;
          line-height: 1.4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 3pt;
        }
        td {
          padding: 0;
          vertical-align: top;
        }
        .section-header {
          border-bottom: 1.5pt solid ${accentColor};
          margin-top: 10pt;
          margin-bottom: 6pt;
          padding-bottom: 2pt;
        }
        .section-title {
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
          color: ${accentColor};
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <div style="border-bottom: 2pt solid ${accentColor}; padding-bottom: 8pt; margin-bottom: 10pt; text-align: ${textAlign};">
          <h1 style="font-size: 22pt; font-weight: 800; color: ${accentColor}; margin: 0 0 4pt; letter-spacing: -0.5pt;">
            ${personal.fullName || "Your Name"}
          </h1>
          ${
            contactList.length > 0
              ? `<p style="font-size: 9.5pt; color: #475569; margin: 0 0 3pt;">
                   ${contactList.join(" &nbsp;•&nbsp; ")}
                 </p>`
              : ""
          }
        </div>

        ${
          resume.summary
            ? `
          <div class="section-header"><div class="section-title">SUMMARY</div></div>
          <p style="font-size: 10pt; color: #334155; margin: 0 0 8pt; line-height: 1.45;">
            ${resume.summary}
          </p>`
            : ""
        }

        ${
          education.length > 0
            ? `
          <div class="section-header"><div class="section-title">EDUCATION</div></div>
          ${education
            .map(
              (edu) => `
            <table style="margin-bottom: 5pt;">
              <tr>
                <td style="font-size: 10pt; font-weight: bold; color: #0f172a; text-align: left;">
                  ${edu.institution || ""}
                </td>
                <td style="font-size: 9.5pt; color: #64748b; text-align: right; white-space: nowrap;">
                  ${[edu.startDate, edu.endDate].filter(Boolean).join(" - ")}
                </td>
              </tr>
              <tr>
                <td style="font-size: 9.5pt; color: #334155; text-align: left;">
                  ${edu.degree || ""}${edu.field ? `, ${edu.field}` : ""}
                </td>
                <td style="font-size: 9.5pt; color: #475569; text-align: right;">
                  ${edu.grade || ""}
                </td>
              </tr>
            </table>`
            )
            .join("")}`
            : ""
        }

        ${
          experience.length > 0
            ? `
          <div class="section-header"><div class="section-title">EXPERIENCE</div></div>
          ${experience
            .map(
              (exp) => `
            <table style="margin-bottom: 2pt;">
              <tr>
                <td style="font-size: 10pt; font-weight: bold; color: #0f172a; text-align: left;">
                  ${exp.role || ""}
                </td>
                <td style="font-size: 9.5pt; color: #64748b; text-align: right; white-space: nowrap;">
                  ${[exp.startDate, exp.endDate].filter(Boolean).join(" - ")}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="font-size: 9.5pt; color: #475569; font-weight: 500; padding-bottom: 2pt;">
                  ${exp.company || ""}${exp.location ? ` &nbsp;·&nbsp; ${exp.location}` : ""}
                </td>
              </tr>
            </table>
            ${
              exp.description
                ? `<p style="font-size: 9.5pt; color: #334155; margin: 0 0 6pt; line-height: 1.4;">${exp.description}</p>`
                : ""
            }`
            )
            .join("")}`
            : ""
        }

        ${
          projects.length > 0
            ? `
          <div class="section-header"><div class="section-title">PROJECTS</div></div>
          ${projects
            .map(
              (proj) => `
            <table style="margin-bottom: 2pt;">
              <tr>
                <td style="font-size: 10pt; font-weight: bold; color: #0f172a; text-align: left;">
                  ${proj.name || proj.title || ""}
                </td>
                <td style="font-size: 9pt; color: #0284c7; text-align: right;">
                  ${proj.link || ""}
                </td>
              </tr>
              ${
                proj.technologies
                  ? `<tr>
                      <td colspan="2" style="font-size: 9pt; color: #64748b; font-style: italic; padding-bottom: 2pt;">
                        ${proj.technologies}
                      </td>
                    </tr>`
                  : ""
              }
            </table>
            ${
              proj.description
                ? `<p style="font-size: 9.5pt; color: #334155; margin: 0 0 6pt; line-height: 1.4;">${proj.description}</p>`
                : ""
            }`
            )
            .join("")}`
            : ""
        }

        ${
          skillsFormatted
            ? `
          <div class="section-header"><div class="section-title">SKILLS</div></div>
          <div style="margin-bottom: 8pt;">
            ${skillsFormatted}
          </div>`
            : ""
        }

        ${
          certifications.length > 0
            ? `
          <div class="section-header"><div class="section-title">CERTIFICATIONS</div></div>
          ${certifications
            .map(
              (cert) => `
            <table style="margin-bottom: 4pt;">
              <tr>
                <td style="font-size: 9.5pt; font-weight: bold; color: #0f172a;">
                  ${cert.name || cert.title || ""}
                </td>
                <td style="font-size: 9pt; color: #64748b; text-align: right;">
                  ${cert.date || ""}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="font-size: 9pt; color: #475569;">
                  ${cert.issuer || ""}
                </td>
              </tr>
            </table>`
            )
            .join("")}`
            : ""
        }
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", wordHtml], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${filename.replace(/\s+/g, "_")}.doc`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}