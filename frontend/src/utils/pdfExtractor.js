/**
 * Browser-native PDF text extractor with spatial position reconstruction.
 */
export async function extractTextFromPDF(file) {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = () => reject(new Error("Unable to load PDF parser"));
      document.head.appendChild(script);
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullDocumentText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by line based on Y coordinate
    const items = textContent.items.filter((item) => item.str && item.str.trim().length > 0);

    // Sort items: Top to bottom (higher Y first in PDF coordinates), then Left to Right (lower X first)
    items.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      const xA = a.transform[4];
      const xB = b.transform[4];

      // If Y is roughly on the same line (within 4 units)
      if (Math.abs(yA - yB) <= 4) {
        return xA - xB;
      }
      return yB - yA; // Higher Y coordinate comes first on the page
    });

    let pageLines = [];
    let currentLine = [];
    let currentY = null;

    for (const item of items) {
      const itemY = item.transform[5];

      if (currentY === null || Math.abs(itemY - currentY) <= 4) {
        currentLine.push(item.str);
        if (currentY === null) currentY = itemY;
      } else {
        pageLines.push(currentLine.join(" ").trim());
        currentLine = [item.str];
        currentY = itemY;
      }
    }

    if (currentLine.length > 0) {
      pageLines.push(currentLine.join(" ").trim());
    }

    fullDocumentText += pageLines.join("\n") + "\n\n";
  }

  return fullDocumentText;
}