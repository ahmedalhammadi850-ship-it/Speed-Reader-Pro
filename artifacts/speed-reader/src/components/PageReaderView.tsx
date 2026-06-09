import React, { useMemo, useEffect, useRef } from "react";
import { useSpeedReader } from "@/hooks/use-speed-reader";
import { ReadingMode, detectRTL } from "@/lib/speed-reader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { Lang, translations } from "@/lib/i18n";

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
  const {
    chunks,
    chunkIndex,
    isPlaying,
    togglePlay,
    next,
    prev,
    reset,
    progress,
    wordsRead,
    totalWords,
  } = useSpeedReader({ text, wpm, mode, chunkSize, onComplete });

  const textDir = useMemo(() => {
    if (directionOverride !== "auto") return directionOverride;
    return detectRTL(text) ? "rtl" : "ltr";
  }, [text, directionOverride]);

  const uiDir = lang === "ar" ? "rtl" : "ltr";
  const estimatedMinutesRemaining = Math.ceil((totalWords - wordsRead) / wpm);
  const BackIcon = uiDir === "rtl" ? ArrowRight : ArrowLeft;

  const activeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chunkIndex]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background" dir={uiDir}>
      {/* Top Bar */}
      <header className="flex-none p-4 flex items-center justify-between border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-back-page"
        >
          <BackIcon className="w-4 h-4 me-2" />
          {t.backToSetup}
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
            {wpm} WPM
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLang}
            data-testid="button-toggle-lang-page"
            className="font-semibold min-w-[4rem]"
          >
            {t.toggleLanguage}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Scrollable text page */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div
          className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed font-serif"
          dir={textDir}
          data-testid="page-text-body"
        >
          {chunks.map((chunk, idx) => {
            const isActive = idx === chunkIndex;
            const isPast = idx < chunkIndex;
            return (
              <span
                key={idx}
                ref={isActive ? activeRef : undefined}
                data-testid={`chunk-${idx}`}
                className={[
                  "inline transition-all duration-200 rounded px-0.5",
                  isActive
                    ? "bg-amber-400/80 dark:bg-amber-500/80 text-black dark:text-black font-bold shadow-sm"
                    : isPast
                    ? "text-muted-foreground/50"
                    : "text-foreground",
                ].join(" ")}
              >
                {chunk.join(" ")}{" "}
              </span>
            );
          })}
        </div>
      </main>

      {/* Controls */}
      <footer className="flex-none p-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground font-mono">
            <span data-testid="text-progress-words-page">{wordsRead} / {totalWords} {t.wordsOf}</span>
            <span>~{estimatedMinutesRemaining} {t.minLeft}</span>
          </div>

          <Progress value={progress * 100} className="h-1.5" />

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={reset} title={t.reset} data-testid="button-reset-page">
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={textDir === "rtl" ? next : prev}
              title={t.previous}
              disabled={textDir === "rtl" ? chunkIndex >= chunks.length - 1 : chunkIndex === 0}
              data-testid="button-prev-page"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={togglePlay}
              className="w-16 h-16 rounded-full shadow-lg"
              title={t.playPause}
              data-testid="button-play-pause-page"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ms-0.5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={textDir === "rtl" ? prev : next}
              title={t.next}
              disabled={textDir === "rtl" ? chunkIndex === 0 : chunkIndex >= chunks.length - 1}
              data-testid="button-next-page"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground font-mono">
            {t.chunk} {chunkIndex + 1} {t.of} {chunks.length}
          </p>
        </div>
      </footer>
    </div>
  );
}
