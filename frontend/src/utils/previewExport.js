/**
 * Exports the live preview element to PDF and Word (.doc) with full styling fidelity.
 */

// 1. Export identical PDF using browser printing / vector capture
export async function exportPreviewToPdf(elementId = "resume-paper", filename = "resume") {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Preview element not found with ID:", elementId);
    return;
  }

  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((s) => s.outerHTML)
    .join("\n");

  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            font-family: inherit;
          }
          #${elementId} {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 100vh !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  frameDoc.close();

  setTimeout(() => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }, 400);
}

// 2. Export Word (.doc) formatted specifically for Microsoft Word's engine
export function exportResumeToWord(resume, filename = "resume") {
  const personal = resume.personal || {};
  const education = resume.education || [];
  const experience = resume.experience || [];
  const projects = resume.projects || [];
  const skills = resume.skills || {};
  const certifications = resume.certifications || [];

  // Theme Accent Color (Default to dark slate if not selected)
  const accentColor = resume.color || resume.primaryColor || "#0f172a";
  const isClassic = resume.template === "classic";
  const fontFamily = isClassic ? "Georgia, serif" : "Arial, Helvetica, sans-serif";
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
          size: 595.3pt 841.9pt; /* A4 */
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
        <!-- HEADER -->
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

        <!-- SUMMARY -->
        ${
          resume.summary
            ? `
          <div class="section-header"><div class="section-title">SUMMARY</div></div>
          <p style="font-size: 10pt; color: #334155; margin: 0 0 8pt; line-height: 1.45;">
            ${resume.summary}
          </p>`
            : ""
        }

        <!-- EDUCATION -->
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

        <!-- EXPERIENCE -->
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

        <!-- PROJECTS -->
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

        <!-- SKILLS -->
        ${
          skillsFormatted
            ? `
          <div class="section-header"><div class="section-title">SKILLS</div></div>
          <div style="margin-bottom: 8pt;">
            ${skillsFormatted}
          </div>`
            : ""
        }

        <!-- CERTIFICATIONS -->
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
  URL.revokeObjectURL(url);
}