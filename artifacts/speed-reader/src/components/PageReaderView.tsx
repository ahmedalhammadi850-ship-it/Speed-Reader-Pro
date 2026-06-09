import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { buildChunks, ReadingMode, detectRTL } from "@/lib/speed-reader";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  ArrowLeft, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Lang, translations } from "@/lib/i18n";

const CHUNKS_PER_PAGE = 35;

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

  const allChunks = useMemo(() => buildChunks(text, mode, chunkSize), [text, mode, chunkSize]);

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

  const [pageIndex, setPageIndex] = useState(0);
  const [chunkInPage, setChunkInPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

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

  const goNextPage = useCallback(() => {
    if (pageIndex + 1 < pages.length) {
      setIsPlaying(false); clearTimer();
      setSlideDir(1); setPageIndex(p => p + 1); setChunkInPage(0);
    }
  }, [pageIndex, pages.length, clearTimer]);

  const goPrevPage = useCallback(() => {
    if (pageIndex > 0) {
      setIsPlaying(false); clearTimer();
      setSlideDir(-1); setPageIndex(p => p - 1); setChunkInPage(0);
    }
  }, [pageIndex, clearTimer]);

  const handleReset = useCallback(() => {
    clearTimer(); setIsPlaying(false);
    setSlideDir(-1); setPageIndex(0); setChunkInPage(0); setStartTime(null);
  }, [clearTimer]);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => {
      if (!p && startTime === null) setStartTime(Date.now());
      return !p;
    });
  }, [startTime]);

  // Auto-hide controls while playing
  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlayingRef.current) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2000);
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowControls(true);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      revealControls();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNextPage(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrevPage(); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleReset(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, goNextPage, goPrevPage, handleReset, revealControls]);

  const BackIcon = uiDir === "rtl" ? ArrowRight : ArrowLeft;
  const progressPct = allChunks.length > 0 ? (globalChunkIndex / allChunks.length) * 100 : 0;
  const estimatedMinutesRemaining = Math.ceil((totalWords - wordsRead) / Math.max(wpm, 1));

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const currentPageChunks = pages[pageIndex] ?? [];

  // Dynamic font size — fewer chunks on page = bigger text to fill the screen
  const dynamicFontSize = useMemo(() => {
    const n = currentPageChunks.length;
    if (n <= 5)  return "2.8rem";
    if (n <= 10) return "2.2rem";
    if (n <= 18) return "1.85rem";
    if (n <= 26) return "1.55rem";
    return "1.3rem";
  }, [currentPageChunks.length]);

  // Dynamic line height — give the text room to breathe and fill vertical space
  const dynamicLineHeight = useMemo(() => {
    const n = currentPageChunks.length;
    if (n <= 5)  return "3.2";
    if (n <= 10) return "2.8";
    if (n <= 18) return "2.5";
    if (n <= 26) return "2.3";
    return "2.1";
  }, [currentPageChunks.length]);

  return (
    <div
      className="relative w-full h-[100dvh] bg-background overflow-hidden select-none"
      dir={uiDir}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
    >
      {/* ── Full-screen sliding text ── */}
      <AnimatePresence initial={false} custom={slideDir} mode="wait">
        <motion.div
          key={pageIndex}
          custom={slideDir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
          data-testid={`page-${pageIndex}`}
        >
          {/* Page text — full viewport */}
          <div
            className="w-full h-full px-10 md:px-20 pt-20 pb-28 overflow-hidden"
            dir={textDir}
          >
            <p
              className="w-full h-full font-serif text-justify overflow-hidden break-words"
              style={{
                fontSize: dynamicFontSize,
                lineHeight: dynamicLineHeight,
                wordSpacing: "0.12em",
                hyphens: "auto",
              } as React.CSSProperties}
            >
              {currentPageChunks.map((chunk, idx) => {
                const isActive = idx === chunkInPage;
                const isPast = idx < chunkInPage;
                return (
                  <span
                    key={idx}
                    data-testid={`chunk-p${pageIndex}-${idx}`}
                    className={[
                      "inline rounded-sm px-1 transition-colors duration-150",
                      isActive
                        ? "bg-amber-400 dark:bg-amber-500 text-black font-bold"
                        : isPast
                        ? "text-foreground/25"
                        : "text-foreground",
                    ].join(" ")}
                  >
                    {chunk.join(" ")}{" "}
                  </span>
                );
              })}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── TOP overlay: back + page number + wpm + toggles ── */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -8 }}
        transition={{ duration: 0.25 }}
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3
                   bg-gradient-to-b from-background/95 via-background/60 to-transparent pointer-events-none"
        style={{ pointerEvents: showControls ? "auto" : "none" }}
        dir={uiDir}
      >
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground" data-testid="button-back-page">
          <BackIcon className="w-4 h-4 me-1.5" />
          {t.backToSetup}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-muted/80 px-2 py-1 rounded">
            {pageIndex + 1} / {pages.length}
          </span>
          <span className="text-xs font-mono text-muted-foreground bg-muted/80 px-2 py-1 rounded">
            {wpm} WPM
          </span>
          <Button variant="outline" size="sm" onClick={onToggleLang} className="font-semibold min-w-[4rem]" data-testid="button-toggle-lang-page">
            {t.toggleLanguage}
          </Button>
          <ThemeToggle />
        </div>
      </motion.div>

      {/* ── Thin progress bar at top ── */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-muted/40 z-10">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ── BOTTOM overlay: playback controls ── */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 8 }}
        transition={{ duration: 0.25 }}
        className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-2 px-4 py-4
                   bg-gradient-to-t from-background/95 via-background/60 to-transparent"
        style={{ pointerEvents: showControls ? "auto" : "none" }}
      >
        <div className="flex items-center justify-between w-full max-w-lg text-xs font-mono text-muted-foreground mb-1">
          <span>{wordsRead} / {totalWords} {t.wordsOf}</span>
          <span>~{estimatedMinutesRemaining} {t.minLeft}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleReset} title={t.reset} data-testid="button-reset-page">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            onClick={textDir === "rtl" ? goNextPage : goPrevPage}
            disabled={textDir === "rtl" ? pageIndex >= pages.length - 1 : pageIndex === 0}
            title={t.previous} data-testid="button-prev-page"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="default" size="lg"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full shadow-lg"
            title={t.playPause} data-testid="button-play-pause-page"
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ms-0.5" />}
          </Button>
          <Button
            variant="outline" size="icon"
            onClick={textDir === "rtl" ? goPrevPage : goNextPage}
            disabled={textDir === "rtl" ? pageIndex === 0 : pageIndex >= pages.length - 1}
            title={t.next} data-testid="button-next-page"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* ── Side tap zones for page flip ── */}
      <button
        onClick={textDir === "rtl" ? goNextPage : goPrevPage}
        disabled={textDir === "rtl" ? pageIndex >= pages.length - 1 : pageIndex === 0}
        className="absolute start-0 top-1/4 h-1/2 w-16 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 disabled:pointer-events-none"
        data-testid="button-side-prev"
        aria-label={t.previous}
      >
        <div className="w-8 h-8 rounded-full bg-background/70 border border-border flex items-center justify-center shadow">
          <SkipBack className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
      <button
        onClick={textDir === "rtl" ? goPrevPage : goNextPage}
        disabled={textDir === "rtl" ? pageIndex === 0 : pageIndex >= pages.length - 1}
        className="absolute end-0 top-1/4 h-1/2 w-16 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 disabled:pointer-events-none"
        data-testid="button-side-next"
        aria-label={t.next}
      >
        <div className="w-8 h-8 rounded-full bg-background/70 border border-border flex items-center justify-center shadow">
          <SkipForward className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    </div>
  );
}
