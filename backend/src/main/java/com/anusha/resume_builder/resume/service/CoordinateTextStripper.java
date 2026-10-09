package com.anusha.resume_builder.resume.service;

import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.util.*;

public class CoordinateTextStripper extends PDFTextStripper {

    public static class TextBlock {
        public String text;
        public float x;
        public float y;
        public float width;
        public float height;

        public TextBlock(String text, float x, float y, float width, float height) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        @Override
        public String toString() {
            return String.format("[%.1f, %.1f] %s", x, y, text);
        }
    }

    public static class VisualLine {
        public float y;
        public List<TextBlock> elements = new ArrayList<>();

        public VisualLine(float y) {
            this.y = y;
        }

        public void add(TextBlock b) {
            elements.add(b);
            // Always keep elements sorted Left-to-Right
            elements.sort(Comparator.comparingDouble(e -> e.x));
        }

        public String getLineText() {
            StringBuilder sb = new StringBuilder();
            float lastX = -1;
            for (TextBlock el : elements) {
                if (lastX > 0 && (el.x - lastX) > 25) {
                    // Significant gap -> Column separator / Tab delimiter
                    sb.append("   |   ");
                } else if (sb.length() > 0 && !sb.toString().endsWith(" ")) {
                    sb.append(" ");
                }
                sb.append(el.text);
                lastX = el.x + el.width;
            }
            return sb.toString().trim();
        }
    }

    private final List<VisualLine> lines = new ArrayList<>();
    private final List<TextBlock> currentWordList = new ArrayList<>();
    private StringBuilder currentWord = new StringBuilder();
    private float wordStartX = 0;
    private float wordStartY = 0;
    private float wordWidth = 0;
    private float wordHeight = 0;

    public CoordinateTextStripper() throws IOException {
        super();
        setSortByPosition(true);
    }

    @Override
    protected void writeString(String string, List<TextPosition> textPositions) throws IOException {
        if (textPositions.isEmpty()) return;

        for (TextPosition tp : textPositions) {
            String ch = tp.getUnicode();
            if (ch == null) continue;

            if (ch.trim().isEmpty()) {
                flushWord();
            } else {
                if (currentWord.length() == 0) {
                    wordStartX = tp.getXDirAdj();
                    wordStartY = tp.getYDirAdj();
                    wordWidth = tp.getWidthDirAdj();
                    wordHeight = tp.getHeightDir();
                } else {
                    wordWidth += tp.getWidthDirAdj();
                }
                currentWord.append(ch);
            }
        }
        flushWord();
    }

    private void flushWord() {
        if (currentWord.length() > 0) {
            TextBlock block = new TextBlock(currentWord.toString(), wordStartX, wordStartY, wordWidth, wordHeight);
            assignToLine(block);
            currentWord.setLength(0);
        }
    }

    private void assignToLine(TextBlock block) {
        // Find existing line within vertical threshold (Y coordinate within ~3.5 pt)
        VisualLine matched = null;
        for (VisualLine vl : lines) {
            if (Math.abs(vl.y - block.y) <= 3.8f) {
                matched = vl;
                break;
            }
        }

        if (matched != null) {
            matched.add(block);
        } else {
            VisualLine newLine = new VisualLine(block.y);
            newLine.add(block);
            lines.add(newLine);
        }
    }

    public List<VisualLine> getExtractedLines() {
        // Sort lines top to bottom by Y coordinate
        lines.sort(Comparator.comparingDouble(l -> l.y));
        return lines;
    }
}