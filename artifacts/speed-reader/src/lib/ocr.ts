import { createWorker } from "tesseract.js";
import type { Worker } from "tesseract.js";

let workerCache: Worker | null = null;
let workerLang = "";

export type OcrProgress = {
  status: string;
  progress: number; // 0–1
};

/** Get (or create) a cached Tesseract worker for the given language(s). */
async function getWorker(lang: string): Promise<Worker> {
  if (workerCache && workerLang === lang) return workerCache;
  if (workerCache) await workerCache.terminate();
  workerCache = await createWorker(lang);
  workerLang = lang;
  return workerCache;
}

/**
 * Run OCR on an HTMLCanvasElement and return the extracted text.
 * @param canvas - canvas with the page rendered into it
 * @param lang   - tesseract language code(s), e.g. "ara" or "ara+eng"
 * @param onProgress - optional progress callback
 */
export async function ocrCanvas(
  canvas: HTMLCanvasElement,
  lang = "ara+eng",
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (onProgress && typeof m.progress === "number") {
        onProgress({ status: m.status, progress: m.progress });
      }
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

/** Terminate the shared worker on cleanup. */
export async function terminateOcrWorker() {
  if (workerCache) {
    await workerCache.terminate();
    workerCache = null;
    workerLang = "";
  }
}
