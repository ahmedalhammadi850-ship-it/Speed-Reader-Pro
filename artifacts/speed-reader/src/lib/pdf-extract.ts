import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

export interface PdfProgress {
  current: number;
  total: number;
}

const BATCH_SIZE = 20; // process 20 pages concurrently

export async function extractTextFromPdf(
  file: File,
  onProgress?: (p: PdfProgress) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    // disable range requests so the whole buffer is used in-memory
    disableRange: true,
    disableStream: true,
  });

  const pdf = await loadingTask.promise;
  const total = pdf.numPages;

  if (total === 0) return "";

  const pageTexts = new Array<string>(total);
  let completed = 0;

  // Process pages in concurrent batches to stay fast on large files
  for (let batchStart = 1; batchStart <= total; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, total);
    const pageNums = [];
    for (let n = batchStart; n <= batchEnd; n++) pageNums.push(n);

    await Promise.all(
      pageNums.map(async (n) => {
        try {
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          pageTexts[n - 1] = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          page.cleanup();
        } catch {
          pageTexts[n - 1] = ""; // skip unreadable pages silently
        }
        completed++;
        onProgress?.({ current: completed, total });
      })
    );
  }

  // Join pages, separating by blank line
  return pageTexts.filter(Boolean).join("\n\n");
}
