import React, { useState, useCallback } from "react";
import { SetupPanel, ViewMode } from "./SetupPanel";
import { ReaderView } from "./ReaderView";
import { PageReaderView } from "./PageReaderView";
import { CompletionScreen } from "./CompletionScreen";
import { ReadingMode } from "@/lib/speed-reader";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/lib/i18n";
import { PdfHandle } from "@/lib/pdf-extract";

const SAMPLE_EN = `The ability to read faster and comprehend more is a vital skill in the modern world. Speed reading is not just about moving your eyes quickly across the page; it's about training your brain to process information in chunks rather than reading word by word. By minimizing subvocalization—the internal voice that pronounces every word—you can dramatically increase your reading rate. This tool is designed to help you focus, maintain a steady rhythm, and gradually push your limits. Take a deep breath, clear your mind, and let the words flow.`;

const SAMPLE_AR = `القراءة السريعة مهارة حيوية في عالم اليوم المتسارع. هي ليست مجرد تحريك العيون بسرعة عبر الصفحة، بل هي تدريب العقل على معالجة المعلومات في مجموعات بدلاً من قراءة كل كلمة على حدة. من خلال تقليل النطق الداخلي، وهو الصوت الداخلي الذي يلفظ كل كلمة، يمكنك زيادة سرعة القراءة بشكل ملحوظ. هذه الأداة مصممة لمساعدتك على التركيز والحفاظ على إيقاع ثابت ودفع حدودك تدريجياً. خذ نفساً عميقاً، وأفرغ ذهنك، ودع الكلمات تتدفق.`;

type View = "setup" | "loading" | "reading" | "completed";

export function SpeedReader() {
  const { lang, toggle } = useLanguage();
  const t = translations[lang];

  const [view, setView] = useState<View>("setup");
  const [text, setText] = useState(() => lang === "ar" ? SAMPLE_AR : SAMPLE_EN);
  const [wpm, setWpm] = useState(300);
  const [mode, setMode] = useState<ReadingMode>("words");
  const [chunkSize, setChunkSize] = useState(3);
  const [directionOverride, setDirectionOverride] = useState<"auto" | "ltr" | "rtl">("auto");
  const [viewMode, setViewMode] = useState<ViewMode>("focused");
  const [stats, setStats] = useState({ totalWords: 0, timeMs: 0, avgWpm: 0 });

  // PDF state
  const [pdfHandle, setPdfHandle] = useState<PdfHandle | null>(null);
  const [pdfStartPage, setPdfStartPage] = useState(1);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pageLoadError, setPageLoadError] = useState("");

  // Active reading text (may differ from text when in PDF mode)
  const [readingText, setReadingText] = useState("");

  const loadPdfPage = useCallback(async (handle: PdfHandle, pageNum: number): Promise<string> => {
    let pageText = await handle.getPageText(pageNum);
    // If this page is empty, try a few forward pages automatically
    if (!pageText.trim()) {
      for (let next = pageNum + 1; next <= Math.min(pageNum + 3, handle.numPages); next++) {
        pageText = await handle.getPageText(next);
        if (pageText.trim()) {
          setPdfCurrentPage(next);
          return pageText;
        }
      }
    }
    return pageText;
  }, []);

  const handleStart = useCallback(async () => {
    if (pdfHandle) {
      setView("loading");
      setPageLoadError("");
      try {
        const pageText = await loadPdfPage(pdfHandle, pdfStartPage);
        setPdfCurrentPage(pdfStartPage);
        if (!pageText.trim()) {
          setPageLoadError(t.pdfPageEmpty);
          setView("setup");
          return;
        }
        setReadingText(pageText);
        setView("reading");
      } catch {
        setPageLoadError(t.pdfError);
        setView("setup");
      }
    } else {
      setReadingText(text);
      setPdfCurrentPage(0);
      setView("reading");
    }
  }, [pdfHandle, pdfStartPage, text, loadPdfPage, t]);

  const handleComplete = useCallback((s: { totalWords: number; timeMs: number; avgWpm: number }) => {
    setStats(s);
    setView("completed");
  }, []);

  const handleNextPage = useCallback(async () => {
    if (!pdfHandle) return;
    const next = pdfCurrentPage + 1;
    if (next > pdfHandle.numPages) return;
    setView("loading");
    setPageLoadError("");
    try {
      const pageText = await loadPdfPage(pdfHandle, next);
      setPdfCurrentPage(next);
      if (!pageText.trim()) {
        setPageLoadError(t.pdfPageEmpty);
        setView("completed");
        return;
      }
      setReadingText(pageText);
      setView("reading");
    } catch {
      setPageLoadError(t.pdfError);
      setView("completed");
    }
  }, [pdfHandle, pdfCurrentPage, loadPdfPage, t]);

  const handlePrevPage = useCallback(async () => {
    if (!pdfHandle) return;
    const prev = pdfCurrentPage - 1;
    if (prev < 1) return;
    setView("loading");
    setPageLoadError("");
    try {
      const pageText = await loadPdfPage(pdfHandle, prev);
      setPdfCurrentPage(prev);
      if (!pageText.trim()) {
        setPageLoadError(t.pdfPageEmpty);
        setView("completed");
        return;
      }
      setReadingText(pageText);
      setView("reading");
    } catch {
      setPageLoadError(t.pdfError);
      setView("completed");
    }
  }, [pdfHandle, pdfCurrentPage, loadPdfPage, t]);

  const sharedReaderProps = {
    text: readingText,
    wpm,
    mode,
    chunkSize,
    directionOverride,
    onBack: () => setView("setup"),
    onComplete: handleComplete,
    t,
    lang,
    onToggleLang: toggle,
    pdfPageInfo: pdfHandle
      ? { current: pdfCurrentPage, total: pdfHandle.numPages }
      : undefined,
  };

  return (
    <>
      {view === "setup" && (
        <div className="min-h-[100dvh] pt-12 pb-24">
          <SetupPanel
            text={text}
            setText={setText}
            wpm={wpm}
            setWpm={setWpm}
            mode={mode}
            setMode={setMode}
            chunkSize={chunkSize}
            setChunkSize={setChunkSize}
            directionOverride={directionOverride}
            setDirectionOverride={setDirectionOverride}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onStart={handleStart}
            pdfHandle={pdfHandle}
            setPdfHandle={setPdfHandle}
            pdfStartPage={pdfStartPage}
            setPdfStartPage={setPdfStartPage}
            t={t}
            lang={lang}
            onToggleLang={toggle}
          />
          {pageLoadError && (
            <p className="text-center text-destructive text-sm mt-4">{pageLoadError}</p>
          )}
        </div>
      )}

      {view === "loading" && (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">
              {t.pdfReadingPage} {pdfCurrentPage || pdfStartPage}…
            </p>
          </div>
        </div>
      )}

      {view === "reading" && viewMode === "focused" && (
        <ReaderView {...sharedReaderProps} />
      )}

      {view === "reading" && viewMode === "page" && (
        <PageReaderView {...sharedReaderProps} />
      )}

      {view === "completed" && (
        <CompletionScreen
          stats={stats}
          onRestart={() => {
            setView("reading");
          }}
          onSetup={() => setView("setup")}
          t={t}
          lang={lang}
          onToggleLang={toggle}
          pdfNav={pdfHandle ? {
            current: pdfCurrentPage,
            total: pdfHandle.numPages,
            onNext: pdfCurrentPage < pdfHandle.numPages ? handleNextPage : undefined,
            onPrev: pdfCurrentPage > 1 ? handlePrevPage : undefined,
            error: pageLoadError || undefined,
          } : undefined}
        />
      )}
    </>
  );
}
