import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, BookOpen, FileText, Loader2 } from "lucide-react";
import { ReadingMode } from "@/lib/speed-reader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lang, translations } from "@/lib/i18n";
import { extractTextFromPdf } from "@/lib/pdf-extract";

// Files larger than this size (bytes) are treated as "large" → show range picker
const LARGE_PDF_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB ≈ 100+ pages for typical PDFs

export type ViewMode = "focused" | "page";

interface SetupPanelProps {
  text: string;
  setText: (v: string) => void;
  wpm: number;
  setWpm: (v: number) => void;
  mode: ReadingMode;
  setMode: (v: ReadingMode) => void;
  chunkSize: number;
  setChunkSize: (v: number) => void;
  directionOverride: "auto" | "ltr" | "rtl";
  setDirectionOverride: (v: "auto" | "ltr" | "rtl") => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onStart: () => void;
  t: typeof translations["en"];
  lang: Lang;
  onToggleLang: () => void;
}

export function SetupPanel({
  text, setText,
  wpm, setWpm,
  mode, setMode,
  chunkSize, setChunkSize,
  directionOverride, setDirectionOverride,
  viewMode, setViewMode,
  onStart, t, lang, onToggleLang
}: SetupPanelProps) {
  const txtInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfError, setPdfError] = useState("");

  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [pdfRangeFrom, setPdfRangeFrom] = useState("1");
  const [pdfRangeTo, setPdfRangeTo] = useState("100");
  const [showRangePicker, setShowRangePicker] = useState(false);

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") setText(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const runExtraction = async (file: File, range?: { from: number; to: number }) => {
    setPdfLoading(true);
    setPdfProgress(null);
    setPdfError("");
    setShowRangePicker(false);
    try {
      const { text: extracted, totalPages } = await extractTextFromPdf(
        file,
        (p) => setPdfProgress(p),
        range
      );
      setPdfTotalPages(totalPages);
      if (!extracted.trim()) {
        setPdfError(lang === "ar"
          ? "لا يحتوي هذا الملف على نص قابل للاستخراج (قد يكون مسحاً ضوئياً)."
          : "No extractable text found. This PDF may be a scanned image.");
      } else {
        setText(extracted);
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      setPdfError(t.pdfError);
    } finally {
      setPdfLoading(false);
      setPdfProgress(null);
      setPendingPdfFile(null);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setPdfError("");
    setShowRangePicker(false);
    setPdfTotalPages(null);

    if (file.size > LARGE_PDF_SIZE_BYTES) {
      setPendingPdfFile(file);
      setPdfRangeFrom("1");
      setPdfRangeTo("100");
      setShowRangePicker(true);
    } else {
      runExtraction(file);
    }
  };

  const handleExtractAll = () => {
    if (pendingPdfFile) runExtraction(pendingPdfFile);
  };

  const handleExtractRange = () => {
    if (!pendingPdfFile) return;
    const from = parseInt(pdfRangeFrom, 10);
    const to = parseInt(pdfRangeTo, 10);
    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      setPdfError(t.pdfPageRangeError);
      return;
    }
    setPdfError("");
    runExtraction(pendingPdfFile, { from, to });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary shrink-0" />
            {t.appTitle}
          </h1>
          <p className="text-muted-foreground">{t.appSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLang}
            data-testid="button-toggle-lang"
            className="font-semibold min-w-[4rem]"
          >
            {t.toggleLanguage}
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Text Input */}
      <div className="space-y-4 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label htmlFor="text-input" className="text-base font-semibold">{t.yourText}</Label>
          <div className="flex items-center gap-2">
            <input type="file" accept=".txt" className="hidden" ref={txtInputRef} onChange={handleTxtUpload} data-testid="input-file-txt" />
            <Button variant="outline" size="sm" onClick={() => txtInputRef.current?.click()} data-testid="button-upload-txt">
              <Upload className="w-4 h-4 me-2" />
              {t.uploadTxt}
            </Button>
            <input type="file" accept=".pdf,application/pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} data-testid="input-file-pdf" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pdfInputRef.current?.click()}
              disabled={pdfLoading}
              data-testid="button-upload-pdf"
            >
              {pdfLoading
                ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t.uploadingPdf}</>
                : <><FileText className="w-4 h-4 me-2" />{t.uploadPdf}</>
              }
            </Button>
          </div>
        </div>

        {/* Large PDF range picker */}
        {showRangePicker && !pdfLoading && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t.pdfLargeFile}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {lang === "ar"
                ? "الملف كبير. يمكنك استخراج كل الصفحات أو تحديد نطاق معين لتسريع المعالجة."
                : "Large file detected. Extract all pages or choose a range for faster processing."}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t.pdfPageFrom}</Label>
                <input
                  type="number"
                  min={1}
                  value={pdfRangeFrom}
                  onChange={(e) => setPdfRangeFrom(e.target.value)}
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-sm text-center"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t.pdfPageTo}</Label>
                <input
                  type="number"
                  min={1}
                  value={pdfRangeTo}
                  onChange={(e) => setPdfRangeTo(e.target.value)}
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-sm text-center"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleExtractRange}>
                {t.pdfExtractRange}
              </Button>
              <Button size="sm" onClick={handleExtractAll}>
                {t.pdfExtractAll}
              </Button>
            </div>
            {pdfTotalPages !== null && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {lang === "ar" ? `إجمالي الصفحات: ${pdfTotalPages}` : `Total pages: ${pdfTotalPages}`}
              </p>
            )}
          </div>
        )}

        {/* PDF progress bar */}
        {pdfLoading && (
          <div className="space-y-1.5" data-testid="pdf-progress">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{t.uploadingPdf}</span>
              {pdfProgress && (
                <span>{pdfProgress.current} / {pdfProgress.total} {lang === "ar" ? "صفحة" : "pages"}</span>
              )}
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200 rounded-full"
                style={{ width: pdfProgress ? `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%` : "5%" }}
              />
            </div>
            {pdfProgress && (
              <p className="text-xs text-muted-foreground text-center">
                {Math.round((pdfProgress.current / pdfProgress.total) * 100)}%
              </p>
            )}
          </div>
        )}

        {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}
        <Textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.pastePlaceholder}
          className="min-h-[200px] resize-y font-serif text-base"
          dir="auto"
          data-testid="input-text"
        />
      </div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Speed + Mode */}
        <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
          {/* WPM */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">{t.readingSpeed}</Label>
              <span className="font-mono bg-muted px-2 py-1 rounded text-sm" data-testid="text-wpm">{wpm} WPM</span>
            </div>
            <Slider
              value={[wpm]}
              onValueChange={([v]) => setWpm(v)}
              min={100} max={1000} step={10}
              className="py-4"
              data-testid="slider-wpm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100</span><span>1000</span>
            </div>
          </div>

          {/* Chunk mode */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">{t.displayMode}</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v: ReadingMode) => { setMode(v); setChunkSize(1); }}
              className="flex gap-4"
              data-testid="radio-group-mode"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="words" id="mode-words" data-testid="radio-mode-words" />
                <Label htmlFor="mode-words">{t.words}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lines" id="mode-lines" data-testid="radio-mode-lines" />
                <Label htmlFor="mode-lines">{t.lines}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Chunk size */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              {mode === "words" ? t.wordsPerChunk : t.linesPerChunk}
            </Label>
            <Select value={chunkSize.toString()} onValueChange={(v) => setChunkSize(parseInt(v))}>
              <SelectTrigger data-testid="select-chunk-size"><SelectValue /></SelectTrigger>
              <SelectContent>
                {mode === "words"
                  ? Array.from({ length: 7 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={n.toString()} data-testid={`select-chunk-${n}`}>
                      {n} {n === 1 ? t.word : t.wordPlural}
                    </SelectItem>
                  ))
                  : Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={n.toString()} data-testid={`select-chunk-${n}`}>
                      {n} {n === 1 ? t.line : t.linePlural}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Direction + View Mode */}
        <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
          {/* Direction */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">{t.textDirection}</Label>
            <Select
              value={directionOverride}
              onValueChange={(v: "auto" | "ltr" | "rtl") => setDirectionOverride(v)}
            >
              <SelectTrigger data-testid="select-direction"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t.autoDetect}</SelectItem>
                <SelectItem value="ltr">{t.leftToRight}</SelectItem>
                <SelectItem value="rtl">{t.rightToLeft}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t.autoDetectHint}</p>
          </div>

          {/* View Mode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t.readingView}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setViewMode("focused")}
                data-testid="button-view-focused"
                className={[
                  "p-3 rounded-lg border-2 text-start transition-all",
                  viewMode === "focused"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                ].join(" ")}
              >
                <div className="font-semibold text-sm mb-1">{t.focusedView}</div>
                <div className="text-xs text-muted-foreground">{t.focusedViewDesc}</div>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("page")}
                data-testid="button-view-page"
                className={[
                  "p-3 rounded-lg border-2 text-start transition-all",
                  viewMode === "page"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                ].join(" ")}
              >
                <div className="font-semibold text-sm mb-1">{t.pageView}</div>
                <div className="text-xs text-muted-foreground">{t.pageViewDesc}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={onStart}
          disabled={!text.trim() || pdfLoading}
          className="w-full md:w-auto text-lg px-8 py-6 h-auto"
          data-testid="button-start"
        >
          {t.startReading}
        </Button>
      </div>
    </div>
  );
}
