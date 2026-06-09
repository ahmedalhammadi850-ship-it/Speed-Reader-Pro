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
  /** Render a page to an HTMLCanvasElement (for OCR). */
  renderPageToCanvas: (pageNumber: number, scale?: number) => Promise<HTMLCanvasElement>;
  /** Find the next page ≥ startPage that has embedded text. Returns null if none found. */
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

  const total = doc.numPages;

  // Sample up to 6 pages spread across the document to detect scanned PDFs
  const sampleIndices = new Set<number>([
    1,
    Math.ceil(total * 0.15),
    Math.ceil(total * 0.3),
    Math.ceil(total * 0.5),
    Math.ceil(total * 0.7),
    Math.ceil(total * 0.9),
  ]);

  let hasText = false;
  for (const idx of sampleIndices) {
    const t = await extractPageText(doc, Math.min(idx, total));
    if (t.trim().length > 20) {
      hasText = true;
      break;
    }
  }

  return {
    numPages: total,
    isScanned: !hasText,

    async getPageText(pageNumber: number): Promise<string> {
      return extractPageText(doc, pageNumber);
    },

    async renderPageToCanvas(pageNumber: number, scale = 2.5): Promise<HTMLCanvasElement> {
      if (pageNumber < 1 || pageNumber > doc.numPages) {
        throw new Error(`Page ${pageNumber} out of range`);
      }
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      page.cleanup();
      return canvas;
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
