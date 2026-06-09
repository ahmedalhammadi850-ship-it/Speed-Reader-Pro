import React, { useMemo } from "react";
import { useSpeedReader } from "@/hooks/use-speed-reader";
import { ReadingMode, detectRTL } from "@/lib/speed-reader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReaderViewProps {
  text: string;
  wpm: number;
  mode: ReadingMode;
  chunkSize: number;
  directionOverride: "auto" | "ltr" | "rtl";
  onBack: () => void;
  onComplete: (stats: { totalWords: number; timeMs: number; avgWpm: number }) => void;
}

export function ReaderView({
  text, wpm, mode, chunkSize, directionOverride, onBack, onComplete
}: ReaderViewProps) {
  const {
    chunks,
    chunkIndex,
    currentChunk,
    isPlaying,
    togglePlay,
    next,
    prev,
    reset,
    progress,
    wordsRead,
    totalWords
  } = useSpeedReader({ text, wpm, mode, chunkSize, onComplete });

  const dir = useMemo(() => {
    if (directionOverride !== "auto") return directionOverride;
    return detectRTL(text) ? "rtl" : "ltr";
  }, [text, directionOverride]);

  const estimatedMinutesRemaining = Math.ceil((totalWords - wordsRead) / wpm);

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Top Bar */}
      <header className="flex-none p-4 flex items-center justify-between border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
            {wpm} WPM
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={chunkIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className={`w-full max-w-4xl text-center flex flex-col gap-2 ${isPlaying ? 'pulse-glow' : ''}`}
            dir={dir}
          >
            {currentChunk.map((line, i) => (
              <p 
                key={i} 
                className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif leading-tight md:leading-tight lg:leading-tight text-foreground px-4 py-1 rounded-lg"
              >
                {line}
              </p>
            ))}
          </motion.div>
        </AnimatePresence>
        
        {/* Visual anchor point for the eye */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-32 border-y-2 border-highlight/20 pointer-events-none rounded-lg" />
      </main>

      {/* Bottom Controls */}
      <footer className="flex-none p-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground font-mono">
            <span>{wordsRead} / {totalWords} words</span>
            <span>~{estimatedMinutesRemaining} min left</span>
          </div>
          
          <Progress value={progress * 100} className="h-1.5" />

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={reset} title="Reset (R)">
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={prev} title="Previous (Left Arrow)" disabled={chunkIndex === 0}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button 
              variant="default" 
              size="lg" 
              onClick={togglePlay} 
              className="w-20 h-20 rounded-full shadow-lg"
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={next} title="Next (Right Arrow)" disabled={chunkIndex >= chunks.length - 1}>
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}