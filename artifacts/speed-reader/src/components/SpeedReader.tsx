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

  const [pdfHandle, setPdfHandle] = useState<PdfHandle | null>(null);
  const [pdfStartPage, setPdfStartPage] = useState(1);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pageLoadError, setPageLoadError] = useState("");
  const [readingText, setReadingText] = useState("");

  /** Load a page, skipping empties. Returns { text, page } — page is the actual page used. */
  const loadPage = useCallback(async (
    handle: PdfHandle,
    startPage: number
  ): Promise<{ text: string; page: number } | null> => {
    const foundPage = await handle.findNextPageWithText(startPage);
    if (foundPage === null) return null;
    const text = await handle.getPageText(foundPage);
    return { text, page: foundPage };
  }, []);

  const handleStart = useCallback(async () => {
    if (pdfHandle) {
      setView("loading");
      setPageLoadError("");
      try {
        const result = await loadPage(pdfHandle, pdfStartPage);
        if (!result) {
          setPageLoadError(t.pdfPageEmpty);
          setView("setup");
          return;
        }
        setPdfCurrentPage(result.page);
        setReadingText(result.text);
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
  }, [pdfHandle, pdfStartPage, text, loadPage, t]);

  const handleComplete = useCallback((s: { totalWords: number; timeMs: number; avgWpm: number }) => {
    setStats(s);
    setView("completed");
  }, []);

  const handleNextPage = useCallback(async () => {
    if (!pdfHandle) return;
    const nextStart = pdfCurrentPage + 1;
    if (nextStart > pdfHandle.numPages) return;
    setView("loading");
    setPageLoadError("");
    try {
      const result = await loadPage(pdfHandle, nextStart);
      if (!result) {
        setPageLoadError(t.pdfPageEmpty);
        setView("completed");
        return;
      }
      setPdfCurrentPage(result.page);
      setReadingText(result.text);
      setView("reading");
    } catch {
      setPageLoadError(t.pdfError);
      setView("completed");
    }
  }, [pdfHandle, pdfCurrentPage, loadPage, t]);

  const handlePrevPage = useCallback(async () => {
    if (!pdfHandle) return;
    const prevStart = pdfCurrentPage - 1;
    if (prevStart < 1) return;
    setView("loading");
    setPageLoadError("");
    try {
      // Search backward: try up to 30 pages back
      let found: { text: string; page: number } | null = null;
      for (let p = prevStart; p >= Math.max(1, prevStart - 29); p--) {
        const txt = await pdfHandle.getPageText(p);
        if (txt.trim()) { found = { text: txt, page: p }; break; }
      }
      if (!found) {
        setPageLoadError(t.pdfPageEmpty);
        setView("completed");
        return;
      }
      setPdfCurrentPage(found.page);
      setReadingText(found.text);
      setView("reading");
    } catch {
      setPageLoadError(t.pdfError);
      setView("completed");
    }
  }, [pdfHandle, pdfCurrentPage, t]);

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
            pageLoadError={pageLoadError}
            t={t}
            lang={lang}
            onToggleLang={toggle}
          />
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
          onRestart={() => setView("reading")}
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
