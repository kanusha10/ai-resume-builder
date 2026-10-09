package com.anusha.resume_builder.pdf.service;

import com.anusha.resume_builder.resume.entity.Resume;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.state.RenderingMode;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfService {

    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();

    private static final float LEFT_MARGIN = 45;
    private static final float RIGHT_MARGIN = 45;
    private static final float TOP_MARGIN = 45;
    private static final float BOTTOM_MARGIN = 45;

    private static final float CONTENT_WIDTH =
            PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

    private final ObjectMapper objectMapper;

    public PdfService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public byte[] generateResumePdf(Resume resume) {
        try {
            JsonNode root = objectMapper.readTree(resume.getResumeData());

            try (PDDocument document = new PDDocument();
                 ByteArrayOutputStream outputStream =
                         new ByteArrayOutputStream()) {

                PdfWriter writer = new PdfWriter(document);

                writer.writePersonalInfo(
                        root.path("personalInfo")
                );

                writer.writeSummary(
                        root.path("summary")
                );

                writer.writeEducation(
                        root.path("education")
                );

                writer.writeExperience(
                        root.path("experience")
                );

                writer.writeProjects(
                        root.path("projects")
                );

                writer.writeSkills(
                        root.path("skills")
                );

                writer.writeCertifications(
                        root.path("certifications")
                );

                writer.writeAchievements(
                        root.path("achievements")
                );

                writer.writeLanguages(
                        root.path("languages")
                );

                writer.close();

                document.save(outputStream);

                return outputStream.toByteArray();
            }

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to generate resume PDF.",
                    exception
            );
        }
    }

    private static class PdfWriter {

        private final PDDocument document;

        private PDPage page;

        private PDPageContentStream contentStream;

        private float currentY;

        private final float contentWidth =
                CONTENT_WIDTH;

        private final PDType1Font regularFont =
                new PDType1Font(
                        Standard14Fonts.FontName.HELVETICA
                );

        private final PDType1Font boldFont =
                new PDType1Font(
                        Standard14Fonts.FontName.HELVETICA_BOLD
                );

        PdfWriter(PDDocument document) throws IOException {
            this.document = document;

            createPage();
        }

        private void createPage() throws IOException {
            if (contentStream != null) {
                contentStream.close();
            }

            page = new PDPage(PDRectangle.A4);

            document.addPage(page);

            contentStream =
                    new PDPageContentStream(
                            document,
                            page
                    );

            currentY =
                    PAGE_HEIGHT - TOP_MARGIN;
        }

        private void close() throws IOException {
            if (contentStream != null) {
                contentStream.close();
            }
        }

        private void ensureSpace(float requiredHeight)
                throws IOException {

            if (currentY - requiredHeight < BOTTOM_MARGIN) {
                createPage();
            }
        }

        private void writePersonalInfo(JsonNode personalInfo)
                throws IOException {

            String fullName =
                    text(personalInfo, "fullName");

            String jobTitle =
                    text(personalInfo, "jobTitle");

            String email =
                    text(personalInfo, "email");

            String phone =
                    text(personalInfo, "phone");

            String location =
                    text(personalInfo, "location");

            String linkedin =
                    text(personalInfo, "linkedin");

            String github =
                    text(personalInfo, "github");

            String website =
                    text(personalInfo, "website");

            ensureSpace(100);

            writeText(
                    fullName.isBlank()
                            ? "Your Name"
                            : fullName,
                    LEFT_MARGIN,
                    currentY,
                    boldFont,
                    22
            );

            currentY -= 27;

            if (!jobTitle.isBlank()) {
                writeText(
                        jobTitle,
                        LEFT_MARGIN,
                        currentY,
                        regularFont,
                        11
                );

                currentY -= 17;
            }

            List<String> contactDetails =
                    new ArrayList<>();

            addIfPresent(contactDetails, email);
            addIfPresent(contactDetails, phone);
            addIfPresent(contactDetails, location);
            addIfPresent(contactDetails, linkedin);
            addIfPresent(contactDetails, github);
            addIfPresent(contactDetails, website);

            if (!contactDetails.isEmpty()) {

                String contactLine =
                        String.join(
                                "  |  ",
                                contactDetails
                        );

                List<String> contactLines =
                        wrapText(
                                contactLine,
                                regularFont,
                                8,
                                contentWidth
                        );

                for (String line : contactLines) {

                    writeText(
                            line,
                            LEFT_MARGIN,
                            currentY,
                            regularFont,
                            8
                    );

                    currentY -= 12;
                }
            }

            currentY -= 8;

            drawLine();

            currentY -= 15;
        }

        private void writeSummary(JsonNode summaryNode)
                throws IOException {

            String summary =
                    summaryNode.asText("");

            if (summary.isBlank()) {
                return;
            }

            writeSectionTitle("Professional Summary");

            writeParagraph(
                    summary,
                    9.5f,
                    14
            );

            currentY -= 5;
        }

        private void writeEducation(JsonNode education)
                throws IOException {

            if (!education.isArray()) {
                return;
            }

            boolean hasContent = false;

            for (JsonNode item : education) {
                if (hasAnyValue(
                        item,
                        "institution",
                        "degree",
                        "field",
                        "description"
                )) {
                    hasContent = true;
                    break;
                }
            }

            if (!hasContent) {
                return;
            }

            writeSectionTitle("Education");

            for (JsonNode item : education) {

                if (!hasAnyValue(
                        item,
                        "institution",
                        "degree",
                        "field",
                        "description"
                )) {
                    continue;
                }

                String degree =
                        text(item, "degree");

                String field =
                        text(item, "field");

                String institution =
                        text(item, "institution");

                String dates =
                        dateRange(item);

                String heading =
                        buildDegreeHeading(
                                degree,
                                field
                        );

                writeEntryHeading(
                        heading,
                        institution,
                        dates
                );

                String description =
                        text(item, "description");

                if (!description.isBlank()) {
                    writeParagraph(
                            description,
                            9,
                            13
                    );
                }

                currentY -= 7;
            }
        }

        private void writeExperience(JsonNode experience)
                throws IOException {

            if (!experience.isArray()) {
                return;
            }

            boolean hasContent = false;

            for (JsonNode item : experience) {
                if (hasAnyValue(
                        item,
                        "company",
                        "position",
                        "description"
                )) {
                    hasContent = true;
                    break;
                }
            }

            if (!hasContent) {
                return;
            }

            writeSectionTitle("Experience");

            for (JsonNode item : experience) {

                if (!hasAnyValue(
                        item,
                        "company",
                        "position",
                        "description"
                )) {
                    continue;
                }

                String position =
                        text(item, "position");

                String company =
                        text(item, "company");

                String location =
                        text(item, "location");

                String dates =
                        dateRange(item);

                String organization =
                        company;

                if (!location.isBlank()) {
                    organization +=
                            " · " + location;
                }

                writeEntryHeading(
                        position,
                        organization,
                        dates
                );

                String description =
                        text(item, "description");

                if (!description.isBlank()) {
                    writeParagraph(
                            description,
                            9,
                            13
                    );
                }

                currentY -= 7;
            }
        }

        private void writeProjects(JsonNode projects)
                throws IOException {

            if (!projects.isArray()) {
                return;
            }

            boolean hasContent = false;

            for (JsonNode item : projects) {
                if (hasAnyValue(
                        item,
                        "name",
                        "technologies",
                        "description"
                )) {
                    hasContent = true;
                    break;
                }
            }

            if (!hasContent) {
                return;
            }

            writeSectionTitle("Projects");

            for (JsonNode item : projects) {

                if (!hasAnyValue(
                        item,
                        "name",
                        "technologies",
                        "description"
                )) {
                    continue;
                }

                String name =
                        text(item, "name");

                String technologies =
                        text(item, "technologies");

                String link =
                        text(item, "link");

                writeText(
                        name.isBlank()
                                ? "Project"
                                : name,
                        LEFT_MARGIN,
                        currentY,
                        boldFont,
                        10
                );

                currentY -= 13;

                if (!technologies.isBlank()) {
                    writeText(
                            technologies,
                            LEFT_MARGIN,
                            currentY,
                            regularFont,
                            8.5f
                    );

                    currentY -= 12;
                }

                String description =
                        text(item, "description");

                if (!description.isBlank()) {
                    writeParagraph(
                            description,
                            9,
                            13
                    );
                }

                if (!link.isBlank()) {
                    writeText(
                            link,
                            LEFT_MARGIN,
                            currentY,
                            regularFont,
                            8
                    );

                    currentY -= 12;
                }

                currentY -= 7;
            }
        }

        private void writeSkills(JsonNode skills)
                throws IOException {

            if (!skills.isArray()) {
                return;
            }

            List<String> validSkills =
                    new ArrayList<>();

            for (JsonNode skill : skills) {
                String value = skill.asText("");

                if (!value.isBlank()) {
                    validSkills.add(value.trim());
                }
            }

            if (validSkills.isEmpty()) {
                return;
            }

            writeSectionTitle("Skills");

            String skillsText =
                    String.join(
                            "  •  ",
                            validSkills
                    );

            writeParagraph(
                    skillsText,
                    9,
                    13
            );

            currentY -= 5;
        }

        private void writeCertifications(
                JsonNode certifications
        ) throws IOException {

            if (!certifications.isArray()) {
                return;
            }

            boolean hasContent = false;

            for (JsonNode item : certifications) {
                if (hasAnyValue(
                        item,
                        "name",
                        "issuer",
                        "date",
                        "link"
                )) {
                    hasContent = true;
                    break;
                }
            }

            if (!hasContent) {
                return;
            }

            writeSectionTitle("Certifications");

            for (JsonNode item : certifications) {

                if (!hasAnyValue(
                        item,
                        "name",
                        "issuer",
                        "date",
                        "link"
                )) {
                    continue;
                }

                String name =
                        text(item, "name");

                String issuer =
                        text(item, "issuer");

                String date =
                        text(item, "date");

                String link =
                        text(item, "link");

                writeEntryHeading(
                        name,
                        issuer,
                        date
                );

                if (!link.isBlank()) {
                    writeText(
                            link,
                            LEFT_MARGIN,
                            currentY,
                            regularFont,
                            8
                    );

                    currentY -= 12;
                }

                currentY -= 7;
            }
        }

        private void writeAchievements(
                JsonNode achievements
        ) throws IOException {

            if (!achievements.isArray()) {
                return;
            }

            List<String> validAchievements =
                    new ArrayList<>();

            for (JsonNode item : achievements) {
                String value = item.asText("");

                if (!value.isBlank()) {
                    validAchievements.add(
                            value.trim()
                    );
                }
            }

            if (validAchievements.isEmpty()) {
                return;
            }

            writeSectionTitle("Achievements");

            for (String achievement :
                    validAchievements) {

                writeBulletParagraph(
                        achievement
                );
            }

            currentY -= 5;
        }

        private void writeLanguages(JsonNode languages)
                throws IOException {

            if (!languages.isArray()) {
                return;
            }

            List<String> validLanguages =
                    new ArrayList<>();

            for (JsonNode item : languages) {
                String value = item.asText("");

                if (!value.isBlank()) {
                    validLanguages.add(
                            value.trim()
                    );
                }
            }

            if (validLanguages.isEmpty()) {
                return;
            }

            writeSectionTitle("Languages");

            writeParagraph(
                    String.join(
                            "  •  ",
                            validLanguages
                    ),
                    9,
                    13
            );
        }

        private void writeSectionTitle(String title)
                throws IOException {

            ensureSpace(35);

            currentY -= 4;

            writeText(
                    title.toUpperCase(),
                    LEFT_MARGIN,
                    currentY,
                    boldFont,
                    10
            );

            currentY -= 5;

            drawLine();

            currentY -= 12;
        }

        private void writeEntryHeading(
                String title,
                String organization,
                String date
        ) throws IOException {

            ensureSpace(55);

            if (!title.isBlank()) {
                writeText(
                        title,
                        LEFT_MARGIN,
                        currentY,
                        boldFont,
                        10
                );

                currentY -= 13;
            }

            String organizationLine =
                    organization;

            if (!date.isBlank()) {
                if (!organizationLine.isBlank()) {
                    organizationLine +=
                            "  |  ";
                }

                organizationLine += date;
            }

            if (!organizationLine.isBlank()) {
                writeText(
                        organizationLine,
                        LEFT_MARGIN,
                        currentY,
                        regularFont,
                        8.5f
                );

                currentY -= 13;
            }
        }

        private void writeParagraph(
                String text,
                float fontSize,
                float lineHeight
        ) throws IOException {

            List<String> lines =
                    wrapText(
                            text,
                            regularFont,
                            fontSize,
                            contentWidth
                    );

            for (String line : lines) {

                ensureSpace(lineHeight + 3);

                writeText(
                        line,
                        LEFT_MARGIN,
                        currentY,
                        regularFont,
                        fontSize
                );

                currentY -= lineHeight;
            }
        }

        private void writeBulletParagraph(
                String text
        ) throws IOException {

            float fontSize = 9;
            float lineHeight = 13;

            List<String> lines =
                    wrapText(
                            text,
                            regularFont,
                            fontSize,
                            contentWidth - 12
                    );

            for (int index = 0;
                 index < lines.size();
                 index++) {

                ensureSpace(lineHeight + 3);

                String prefix =
                        index == 0
                                ? "• "
                                : "  ";

                writeText(
                        prefix + lines.get(index),
                        LEFT_MARGIN,
                        currentY,
                        regularFont,
                        fontSize
                );

                currentY -= lineHeight;
            }
        }

        private void writeText(
                String text,
                float x,
                float y,
                PDType1Font font,
                float fontSize
        ) throws IOException {

            contentStream.beginText();

            contentStream.setFont(
                    font,
                    fontSize
            );

            contentStream.newLineAtOffset(
                    x,
                    y
            );

            contentStream.showText(
                    sanitize(text)
            );

            contentStream.endText();
        }

        private void drawLine() throws IOException {

            contentStream.moveTo(
                    LEFT_MARGIN,
                    currentY
            );

            contentStream.lineTo(
                    PAGE_WIDTH - RIGHT_MARGIN,
                    currentY
            );

            contentStream.setLineWidth(0.5f);

            contentStream.stroke();
        }

        private List<String> wrapText(
                String text,
                PDType1Font font,
                float fontSize,
                float maxWidth
        ) throws IOException{

            List<String> lines =
                    new ArrayList<>();

            String[] paragraphs =
                    text.replace("\r", "")
                            .split("\n");

            for (String paragraph :
                    paragraphs) {

                String trimmed =
                        paragraph.trim();

                if (trimmed.isEmpty()) {
                    lines.add("");
                    continue;
                }

                String[] words =
                        trimmed.split("\\s+");

                StringBuilder currentLine =
                        new StringBuilder();

                for (String word : words) {

                    String candidate =
                            currentLine.length() == 0
                                    ? word
                                    : currentLine +
                                    " " +
                                    word;

                    float width =
                            font.getStringWidth(
                                    sanitize(candidate)
                            ) /
                                    1000 *
                                    fontSize;

                    if (width <= maxWidth) {
                        currentLine =
                                new StringBuilder(
                                        candidate
                                );
                    } else {

                        if (currentLine.length() > 0) {
                            lines.add(
                                    currentLine.toString()
                            );
                        }

                        currentLine =
                                new StringBuilder(
                                        word
                                );
                    }
                }

                if (currentLine.length() > 0) {
                    lines.add(
                            currentLine.toString()
                    );
                }
            }

            return lines;
        }

        private String text(
                JsonNode node,
                String field
        ) {
            return node.path(field)
                    .asText("")
                    .trim();
        }

        private boolean hasAnyValue(
                JsonNode node,
                String... fields
        ) {

            for (String field : fields) {
                if (!text(node, field).isBlank()) {
                    return true;
                }
            }

            return false;
        }

        private String dateRange(JsonNode item) {

            String start =
                    text(item, "startDate");

            String end =
                    text(item, "endDate");

            if (!start.isBlank()
                    && !end.isBlank()) {

                return start + " - " + end;
            }

            if (!start.isBlank()) {
                return start;
            }

            return end;
        }

        private String buildDegreeHeading(
                String degree,
                String field
        ) {

            if (degree.isBlank()
                    && field.isBlank()) {

                return "Degree";
            }

            if (degree.isBlank()) {
                return field;
            }

            if (field.isBlank()) {
                return degree;
            }

            return degree + " in " + field;
        }

        private void addIfPresent(
                List<String> values,
                String value
        ) {

            if (value != null
                    && !value.isBlank()) {

                values.add(value);
            }
        }

        private String sanitize(String text) {

            if (text == null) {
                return "";
            }

            return text
                    .replace("•", "-")
                    .replace("–", "-")
                    .replace("—", "-")
                    .replace("’", "'")
                    .replace("“", "\"")
                    .replace("”", "\"")
                    .replace("₹", "Rs.");
        }
    }
}