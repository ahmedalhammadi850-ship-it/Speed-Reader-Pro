import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

export interface PdfHandle {
  numPages: number;
  getPageText: (pageNumber: number) => Promise<string>;
  destroy: () => Promise<void>;
}

export async function openPdf(file: File): Promise<PdfHandle> {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const doc: PDFDocumentProxy = await loadingTask.promise;

  return {
    numPages: doc.numPages,
    async getPageText(pageNumber: number): Promise<string> {
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
    },
    async destroy() {
      await doc.destroy();
    },
  };
}
