import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

export interface PdfProgress {
  current: number;
  total: number;
}

export interface PdfPageRange {
  from: number;
  to: number;
}

const BATCH_SIZE = 10;

export async function getPdfPageCount(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const loadingTask = pdfjsLib.getDocument({ url });
    const pdf = await loadingTask.promise;
    const count = pdf.numPages;
    pdf.destroy();
    return count;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (p: PdfProgress) => void,
  range?: PdfPageRange
): Promise<string> {
  const url = URL.createObjectURL(file);

  try {
    const loadingTask = pdfjsLib.getDocument({ url });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const startPage = range ? Math.max(1, range.from) : 1;
    const endPage = range ? Math.min(totalPages, range.to) : totalPages;
    const pagesToProcess = endPage - startPage + 1;

    if (pagesToProcess <= 0) return "";

    const pageTexts = new Array<string>(pagesToProcess);
    let completed = 0;

    for (let batchStart = startPage; batchStart <= endPage; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, endPage);
      const pageNums: number[] = [];
      for (let n = batchStart; n <= batchEnd; n++) pageNums.push(n);

      await Promise.all(
        pageNums.map(async (n) => {
          try {
            const page = await pdf.getPage(n);
            const content = await page.getTextContent();
            pageTexts[n - startPage] = content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            page.cleanup();
          } catch {
            pageTexts[n - startPage] = "";
          }
          completed++;
          onProgress?.({ current: completed, total: pagesToProcess });
        })
      );
    }

    pdf.destroy();
    return pageTexts.filter(Boolean).join("\n\n");
  } finally {
    URL.revokeObjectURL(url);
  }
}
