import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

export interface PdfHandle {
  numPages: number;
  isScanned: boolean;
  getPageText: (pageNumber: number) => Promise<string>;
  /** Find the next page ≥ startPage that has text. Returns null if none found. */
  findNextPageWithText: (startPage: number, maxLook?: number) => Promise<number | null>;
  destroy: () => Promise<void>;
}

async function extractPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  if (pageNumber < 1 || pageNumber > doc.numPages) return "";
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  page.cleanup();
  return text;
}

export async function openPdf(file: File): Promise<PdfHandle> {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const doc: PDFDocumentProxy = await loadingTask.promise;

  // Sample up to 8 pages spread across the document to detect scanned PDFs
  const total = doc.numPages;
  const sampleIndices = new Set<number>();
  sampleIndices.add(1);
  if (total > 1) sampleIndices.add(Math.ceil(total * 0.1));
  if (total > 5) sampleIndices.add(Math.ceil(total * 0.25));
  if (total > 10) sampleIndices.add(Math.ceil(total * 0.5));
  if (total > 20) sampleIndices.add(Math.ceil(total * 0.75));

  let hasText = false;
  for (const idx of sampleIndices) {
    const t = await extractPageText(doc, Math.min(idx, total));
    if (t.trim().length > 20) { hasText = true; break; }
  }

  return {
    numPages: total,
    isScanned: !hasText,

    async getPageText(pageNumber: number): Promise<string> {
      return extractPageText(doc, pageNumber);
    },

    async findNextPageWithText(startPage: number, maxLook = 30): Promise<number | null> {
      const end = Math.min(startPage + maxLook - 1, total);
      for (let n = startPage; n <= end; n++) {
        const t = await extractPageText(doc, n);
        if (t.trim().length > 0) return n;
      }
      return null;
    },

    async destroy() {
      await doc.destroy();
    },
  };
}
