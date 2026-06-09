import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, BookOpen, FileText, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { ReadingMode } from "@/lib/speed-reader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lang, translations } from "@/lib/i18n";
import { openPdf, PdfHandle } from "@/lib/pdf-extract";

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
  pdfHandle: PdfHandle | null;
  setPdfHandle: (h: PdfHandle | null) => void;
  pdfStartPage: number;
  setPdfStartPage: (n: number) => void;
  pageLoadError: string;
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
  onStart,
  pdfHandle, setPdfHandle,
  pdfStartPage, setPdfStartPage,
  pageLoadError,
  t, lang, onToggleLang
}: SetupPanelProps) {
  const txtInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setText(ev.target.result);
        setPdfHandle(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPdfError("");
    setPdfLoading(true);
    try {
      if (pdfHandle) await pdfHandle.destroy();
      const handle = await openPdf(file);
      setPdfHandle(handle);
      setPdfStartPage(1);
      setText("");
    } catch (err) {
      console.error("PDF open error:", err);
      setPdfError(t.pdfError);
      setPdfHandle(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const canStart = pdfHandle ? true : text.trim().length > 0;

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

      {/* Text / PDF Input */}
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
                ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t.pdfLoading}</>
                : <><FileText className="w-4 h-4 me-2" />{t.uploadPdf}</>
              }
            </Button>
          </div>
        </div>

        {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}

        {/* PDF loaded — page picker */}
        {pdfHandle && !pdfLoading && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="w-4 h-4 shrink-0" />
              {t.pdfLoaded} — {pdfHandle.numPages} {t.pdfPages}
            </div>

            {/* Scanned PDF — OCR notice */}
            {pdfHandle.isScanned && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 space-y-1">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t.pdfScannedWarning}</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70">{t.pdfScannedHint}</p>
              </div>
            )}

            {/* pageLoadError feedback */}
            {pageLoadError && (
              <p className="text-sm text-destructive font-medium">{pageLoadError}</p>
            )}

            {/* Page picker — always show */}
            {(
              <div className="flex items-center gap-3">
                <Label className="text-sm whitespace-nowrap">{t.pdfStartPage}</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPdfStartPage(Math.max(1, pdfStartPage - 1))}
                    disabled={pdfStartPage <= 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <input
                    type="number"
                    min={1}
                    max={pdfHandle.numPages}
                    value={pdfStartPage}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1 && v <= pdfHandle.numPages) setPdfStartPage(v);
                    }}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPdfStartPage(Math.min(pdfHandle.numPages, pdfStartPage + 1))}
                    disabled={pdfStartPage >= pdfHandle.numPages}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ms-1">/ {pdfHandle.numPages}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plain text input (shown only when no PDF) */}
        {!pdfHandle && (
          <Textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.pastePlaceholder}
            className="min-h-[200px] resize-y font-serif text-base"
            dir="auto"
            data-testid="input-text"
          />
        )}
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
          disabled={!canStart || pdfLoading}
          className="w-full md:w-auto text-lg px-8 py-6 h-auto"
          data-testid="button-start"
        >
          {t.startReading}
          {pdfHandle && (
            <span className="ms-2 text-sm opacity-70">
              ({t.pdfPage} {pdfStartPage})
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
