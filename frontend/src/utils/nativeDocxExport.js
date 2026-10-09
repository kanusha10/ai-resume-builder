import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} from "docx";
import { saveAs } from "file-saver";

export async function exportToRealDocx(resume, filename = "resume") {
  const personal = resume.personal || {};
  const education = resume.education || [];
  const experience = resume.experience || [];
  const projects = resume.projects || [];
  const skills = resume.skills || {};
  const certifications = resume.certifications || [];

  // Extract clean hex color (strip '#' for OpenXML)
  const rawColor = resume.color || resume.primaryColor || "#0f172a";
  const hexColor = rawColor.replace("#", "");

  const isClassic = resume.template === "classic";
  const fontName = isClassic ? "Georgia" : "Calibri";

  // Creates ATS-friendly Section Header with colored bottom rule
  const createSectionHeader = (title) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      border: {
        bottom: {
          color: hexColor,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          font: fontName,
          size: 22, // 11pt
          color: hexColor,
        }),
      ],
    });
  };

  // Two-column layout line: Title on left, Right-aligned dates on right
  const createTwoColumnHeader = (leftText, rightText, isBold = true) => {
    return new Paragraph({
      tabStops: [
        {
          type: TabStopType.RIGHT,
          position: TabStopPosition.MAX, // Aligns flush to right page margin
        },
      ],
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({
          text: leftText || "",
          bold: isBold,
          font: fontName,
          size: 20, // 10pt
          color: "0f172a",
        }),
        new TextRun({
          text: `\t${rightText || ""}`,
          bold: false,
          font: fontName,
          size: 18, // 9pt
          color: "64748b",
        }),
      ],
    });
  };

  const docChildren = [];

  // 1. Full Name
  docChildren.push(
    new Paragraph({
      alignment: isClassic ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: personal.fullName || "Your Name",
          bold: true,
          font: fontName,
          size: 40, // 20pt
          color: hexColor,
        }),
      ],
    })
  );

  // 2. Contact details line
  const contactParts = [
    personal.email,
    personal.phone,
    personal.location,
    personal.linkedin,
    personal.github,
    personal.website,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    docChildren.push(
      new Paragraph({
        alignment: isClassic ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 200 },
        border: {
          bottom: {
            color: hexColor,
            space: 6,
            style: BorderStyle.SINGLE,
            size: 14,
          },
        },
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            font: fontName,
            size: 18, // 9pt
            color: "475569",
          }),
        ],
      })
    );
  }

  // 3. Summary
  if (resume.summary) {
    docChildren.push(createSectionHeader("Summary"));
    docChildren.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: resume.summary,
            font: fontName,
            size: 20,
            color: "334155",
          }),
        ],
      })
    );
  }

  // 4. Education
  if (education.length > 0) {
    docChildren.push(createSectionHeader("Education"));
    education.forEach((edu) => {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      docChildren.push(createTwoColumnHeader(edu.institution, dates, true));

      const subInfo = [edu.degree, edu.field].filter(Boolean).join(", ");
      if (subInfo || edu.grade) {
        docChildren.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: subInfo,
                font: fontName,
                size: 19,
                color: "334155",
              }),
              new TextRun({
                text: edu.grade ? `\t${edu.grade}` : "",
                font: fontName,
                size: 18,
                color: "64748b",
              }),
            ],
          })
        );
      }
    });
  }

  // 5. Experience
  if (experience.length > 0) {
    docChildren.push(createSectionHeader("Experience"));
    experience.forEach((exp) => {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      docChildren.push(createTwoColumnHeader(exp.role, dates, true));

      const companyLine = [exp.company, exp.location].filter(Boolean).join("  ·  ");
      if (companyLine) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: companyLine,
                font: fontName,
                size: 19,
                color: "475569",
              }),
            ],
          })
        );
      }

      if (exp.description) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: exp.description,
                font: fontName,
                size: 19,
                color: "334155",
              }),
            ],
          })
        );
      }
    });
  }

  // 6. Projects
  if (projects.length > 0) {
    docChildren.push(createSectionHeader("Projects"));
    projects.forEach((proj) => {
      docChildren.push(createTwoColumnHeader(proj.name || proj.title, proj.link, true));

      if (proj.technologies) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: proj.technologies,
                italics: true,
                font: fontName,
                size: 18,
                color: "64748b",
              }),
            ],
          })
        );
      }

      if (proj.description) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: proj.description,
                font: fontName,
                size: 19,
                color: "334155",
              }),
            ],
          })
        );
      }
    });
  }

  // 7. Skills
  const skillEntries = Object.entries(skills).filter(
    ([_, list]) => Array.isArray(list) && list.length > 0
  );

  if (skillEntries.length > 0) {
    docChildren.push(createSectionHeader("Skills"));
    skillEntries.forEach(([category, list]) => {
      const catLabel = category.charAt(0).toUpperCase() + category.slice(1);
      docChildren.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${catLabel}: `,
              bold: true,
              font: fontName,
              size: 19,
              color: "0f172a",
            }),
            new TextRun({
              text: list.join(", "),
              font: fontName,
              size: 19,
              color: "334155",
            }),
          ],
        })
      );
    });
  }

  // 8. Certifications
  if (certifications.length > 0) {
    docChildren.push(createSectionHeader("Certifications"));
    certifications.forEach((cert) => {
      docChildren.push(createTwoColumnHeader(cert.name || cert.title, cert.date, true));
      if (cert.issuer) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: cert.issuer,
                font: fontName,
                size: 18,
                color: "475569",
              }),
            ],
          })
        );
      }
    });
  }

  // Document Section Settings
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch (720 twips)
              right: 864,  // 0.6 inch
              bottom: 720, // 0.5 inch
              left: 864,   // 0.6 inch
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  // Client-Side Binary Blob Packaging and Streaming
  const blob = await Packer.toBlob(doc);
  const cleanFilename = `${(filename || "resume").replace(/\s+/g, "_")}.docx`;
  saveAs(blob, cleanFilename);
}