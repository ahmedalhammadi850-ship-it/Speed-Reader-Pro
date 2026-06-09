export type ReadingMode = "words" | "lines";

export function detectRTL(text: string): boolean {
  const firstWord = text.trim().split(/\s+/)[0] || "";
  return /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF]/.test(firstWord);
}

export function buildChunks(text: string, mode: ReadingMode, size: number): string[][] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  if (mode === "words") {
    const chunks: string[][] = [];
    for (let i = 0; i < words.length; i += size) {
      chunks.push([words.slice(i, i + size).join(" ")]);
    }
    return chunks;
  } else {
    // lines mode: group words into lines of ~8-10 words
    const lines: string[] = [];
    let currentLine: string[] = [];
    for (let i = 0; i < words.length; i++) {
      currentLine.push(words[i]);
      if (currentLine.length >= 9) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
    }
    if (currentLine.length > 0) lines.push(currentLine.join(" "));

    const chunks: string[][] = [];
    for (let i = 0; i < lines.length; i += size) {
      chunks.push(lines.slice(i, i + size));
    }
    return chunks;
  }
}
