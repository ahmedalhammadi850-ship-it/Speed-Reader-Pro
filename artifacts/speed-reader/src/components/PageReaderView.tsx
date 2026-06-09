import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { buildChunks, ReadingMode, detectRTL } from "@/lib/speed-reader";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Lang, translations } from "@/lib/i18n";

const CHUNKS_PER_PAGE = 12;

interface PageReaderViewProps {
  text: string;
  wpm: number;
  mode: ReadingMode;
  chunkSize: number;
  directionOverride: "auto" | "ltr" | "rtl";
  onBack: () => void;
  onComplete: (stats: { totalWords: number; timeMs: number; avgWpm: number }) => void;
  t: typeof translations["en"];
  lang: Lang;
  onToggleLang: () => void;
}

export function PageReaderView({
  text, wpm, mode, chunkSize, directionOverride, onBack, onComplete, t, lang, onToggleLang
}: PageReaderViewProps) {
  const textDir = useMemo(() => {
    if (directionOverride !== "auto") return directionOverride;
    return detectRTL(text) ? "rtl" : "ltr";
  }, [text, directionOverride]);

  const uiDir = lang === "ar" ? "rtl" : "ltr";

  // Build all chunks
  const allChunks = useMemo(() => buildChunks(text, mode, chunkSize), [text, mode, chunkSize]);

  // Split chunks into pages
  const pages = useMemo(() => {
    const result: string[][][] = [];
    for (let i = 0; i < allChunks.length; i += CHUNKS_PER_PAGE) {
      result.push(allChunks.slice(i, i + CHUNKS_PER_PAGE));
    }
    return result;
  }, [allChunks]);

  const totalWords = useMemo(
    () => allChunks.reduce((acc, c) => acc + c.join(" ").split(/\s+/).filter(Boolean).length, 0),
    [allChunks]
  );

  // State
  const [pageIndex, setPageIndex] = useState(0);
  const [chunkInPage, setChunkInPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<1 | -1>(1); // 1 = forward (RTL slide), -1 = backward

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const globalChunkIndex = useMemo(
    () => pageIndex * CHUNKS_PER_PAGE + chunkInPage,
    [pageIndex, chunkInPage]
  );

  const wordsRead = useMemo(
    () => allChunks.slice(0, globalChunkIndex).reduce(
      (acc, c) => acc + c.join(" ").split(/\s+/).filter(Boolean).length, 0
    ),
    [allChunks, globalChunkIndex]
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    const timeMs = startTime ? Date.now() - startTime : 0;
    const avgWpm = timeMs > 0 ? Math.round((totalWords / (timeMs / 1000)) * 60) : 0;
    onCompleteRef.current({ totalWords, timeMs, avgWpm });
  }, [clearTimer, startTime, totalWords]);

  // Advance one step
  const advance = useCallback(() => {
    const currentPage = pages[pageIndex];
    if (!currentPage) return;

    if (chunkInPage + 1 < currentPage.length) {
      setChunkInPage(c => c + 1);
    } else if (pageIndex + 1 < pages.length) {
      setSlideDir(1);
      setPageIndex(p => p + 1);
      setChunkInPage(0);
    } else {
      finish();
    }
  }, [pages, pageIndex, chunkInPage, finish]);

  // Schedule next chunk
  useEffect(() => {
    clearTimer();
    if (!isPlaying) return;
    const currentPage = pages[pageIndex];
    const currentChunk = currentPage?.[chunkInPage];
    if (!currentChunk) return;
    const wordCount = currentChunk.join(" ").split(/\s+/).filter(Boolean).length || 1;
    const intervalMs = Math.max(100, (60 / wpm) * 1000 * wordCount);
    timerRef.current = setTimeout(advance, intervalMs);
    return clearTimer;
  }, [isPlaying, pageIndex, chunkInPage, wpm, pages, advance, clearTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNextPage(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrevPage(); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleReset(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pages.length]);

  const goNextPage = useCallback(() => {
    if (pageIndex + 1 < pages.length) {
      setIsPlaying(false);
      clearTimer();
      setSlideDir(1);
      setPageIndex(p => p + 1);
      setChunkInPage(0);
    }
  }, [pageIndex, pages.length, clearTimer]);

  const goPrevPage = useCallback(() => {
    if (pageIndex > 0) {
      setIsPlaying(false);
      clearTimer();
      setSlideDir(-1);
      setPageIndex(p => p - 1);
      setChunkInPage(0);
    }
  }, [pageIndex, clearTimer]);

  const handleReset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setSlideDir(-1);
    setPageIndex(0);
    setChunkInPage(0);
    setStartTime(null);
  }, [clearTimer]);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => {
      if (!p && startTime === null) setStartTime(Date.now());
      return !p;
    });
  }, [startTime]);

  const BackIcon = uiDir === "rtl" ? ArrowRight : ArrowLeft;
  const estimatedMinutesRemaining = Math.ceil((totalWords - wordsRead) / wpm);

  // Slide animation variants — always slide RTL for content (pages come from right)
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const currentPageChunks = pages[pageIndex] ?? [];

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden" dir={uiDir}>
      {/* Top Bar */}
      <header className="flex-none px-4 py-3 flex items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground" data-testid="button-back-page">
          <BackIcon className="w-4 h-4 me-1.5" />
          {t.backToSetup}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
            {t.chunk} {pageIndex + 1} / {pages.length}
          </span>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{wpm} WPM</span>
          <Button variant="outline" size="sm" onClick={onToggleLang} data-testid="button-toggle-lang-page" className="font-semibold min-w-[4rem]">
            {t.toggleLanguage}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Progress bar */}
      <div className="flex-none h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${allChunks.length > 0 ? (globalChunkIndex / allChunks.length) * 100 : 0}%` }}
        />
      </div>

      {/* Sliding page content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={slideDir} mode="wait">
          <motion.div
            key={pageIndex}
            custom={slideDir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 overflow-y-auto"
            data-testid={`page-${pageIndex}`}
          >
            <div
              className="max-w-3xl mx-auto px-8 py-10 text-lg md:text-xl leading-loose font-serif"
              dir={textDir}
            >
              {currentPageChunks.map((chunk, idx) => {
                const isActive = idx === chunkInPage;
                const isPast = idx < chunkInPage;
                return (
                  <span
                    key={idx}
                    data-testid={`chunk-p${pageIndex}-${idx}`}
                    className={[
                      "inline rounded px-0.5 py-0.5 transition-all duration-150",
                      isActive
                        ? "bg-amber-400/85 dark:bg-amber-500/85 text-black dark:text-black font-bold shadow-sm"
                        : isPast
                        ? "text-muted-foreground/40"
                        : "text-foreground",
                    ].join(" ")}
                  >
                    {chunk.join(" ")}{" "}
                  </span>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Page-flip nav arrows on sides */}
        <button
          onClick={textDir === "rtl" ? goNextPage : goPrevPage}
          disabled={textDir === "rtl" ? pageIndex >= pages.length - 1 : pageIndex === 0}
          className="absolute start-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 border border-border flex items-center justify-center shadow hover:bg-muted disabled:opacity-20 transition-opacity z-10"
          data-testid="button-side-prev"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={textDir === "rtl" ? goPrevPage : goNextPage}
          disabled={textDir === "rtl" ? pageIndex === 0 : pageIndex >= pages.length - 1}
          className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 border border-border flex items-center justify-center shadow hover:bg-muted disabled:opacity-20 transition-opacity z-10"
          data-testid="button-side-next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls */}
      <footer className="flex-none px-6 py-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{wordsRead} / {totalWords} {t.wordsOf}</span>
            <span>~{estimatedMinutesRemaining} {t.minLeft}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={handleReset} title={t.reset} data-testid="button-reset-page">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline" size="icon"
              onClick={textDir === "rtl" ? goNextPage : goPrevPage}
              disabled={textDir === "rtl" ? pageIndex >= pages.length - 1 : pageIndex === 0}
              title={t.previous}
              data-testid="button-prev-page"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="default" size="lg"
              onClick={togglePlay}
              className="w-16 h-16 rounded-full shadow-lg"
              title={t.playPause}
              data-testid="button-play-pause-page"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ms-0.5" />}
            </Button>
            <Button
              variant="outline" size="icon"
              onClick={textDir === "rtl" ? goPrevPage : goNextPage}
              disabled={textDir === "rtl" ? pageIndex === 0 : pageIndex >= pages.length - 1}
              title={t.next}
              data-testid="button-next-page"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
