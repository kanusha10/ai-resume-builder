
/**
 * Exports the live resume preview to PDF and Word (.doc).
 * PDF uses the browser's print engine to preserve template styling
 * and allows content to flow naturally across multiple A4 pages.
 */

// 1. Export resume preview to a multi-page A4 PDF.
export async function exportPreviewToPdf(
  elementId = "resume-paper",
  filename = "resume"
) {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error("Preview element not found with ID:", elementId);
    return;
  }

  const styles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((style) => style.outerHTML)
    .join("\n");

  const printFrame = document.createElement("iframe");

  printFrame.setAttribute("aria-hidden", "true");
  printFrame.setAttribute("title", "Resume PDF export");

  Object.assign(printFrame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  });

  document.body.appendChild(printFrame);

  const frameWindow = printFrame.contentWindow;
  const frameDoc = frameWindow.document;

  const safeFilename =
    String(filename)
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .trim() || "resume";

  const escapedElementId =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(elementId)
      : elementId.replace(/[^a-zA-Z0-9_-]/g, "");

  frameDoc.open();

  frameDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <base href="${document.baseURI}" />
        <title>${safeFilename}</title>

        ${styles}

        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          *,
          *::before,
          *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            background: #ffffff !important;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
          }

          /*
           * Remove screen-only wrapper spacing.
           */
          .preview-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /*
           * Remove the screen preview's padding and shadow.
           * The 12mm @page margin supplies the print margin.
           */
          #${escapedElementId} {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            min-height: 0 !important;
            height: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;

            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;

            break-inside: auto;
            page-break-inside: auto;
          }

          /*
           * Override template-specific screen padding.
           */
          #${escapedElementId}.template-minimal {
            padding: 0 !important;
          }

          #${escapedElementId} * {
            max-height: none;
          }

          /*
           * Keep individual resume entries together when possible.
           * Long entries may still flow naturally onto another page.
           */
          #${escapedElementId} .resume-entry,
          #${escapedElementId} .resume-entry-top,
          #${escapedElementId} .edu-entry,
          #${escapedElementId} .ats-bullet-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          #${escapedElementId} .section-title {
            break-after: avoid;
            page-break-after: avoid;
          }

          img,
          svg {
            max-width: 100%;
          }

          p,
          li {
            orphans: 2;
            widows: 2;
          }

          a {
            overflow-wrap: anywhere;
          }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              min-width: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }

            #${escapedElementId} {
              width: 100% !important;
              max-width: none !important;
              min-height: 0 !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;

              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>

      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  frameDoc.close();

  try {
    // Wait for fonts to finish loading.
    if (frameDoc.fonts?.ready) {
      await frameDoc.fonts.ready;
    }

    // Wait for images to load.
    const images = Array.from(frameDoc.images);

    await Promise.all(
      images.map((img) => {
        if (img.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // Allow layout and styles to settle before printing.
    await new Promise((resolve) => setTimeout(resolve, 300));

    frameWindow.focus();
    frameWindow.print();
  } catch (error) {
    console.error("Unable to prepare resume for printing:", error);
  } finally {
    // Give the print dialog time to open before removing the iframe.
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
    }, 1500);
  }
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
