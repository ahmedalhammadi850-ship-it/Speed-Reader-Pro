import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Settings, ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lang, translations } from "@/lib/i18n";

interface PdfNav {
  current: number;
  total: number;
  onNext?: () => void;
  onPrev?: () => void;
  error?: string;
}

interface CompletionScreenProps {
  stats: {
    totalWords: number;
    timeMs: number;
    avgWpm: number;
  };
  onRestart: () => void;
  onSetup: () => void;
  t: typeof translations["en"];
  lang: Lang;
  onToggleLang: () => void;
  pdfNav?: PdfNav;
}

export function CompletionScreen({ stats, onRestart, onSetup, t, lang, onToggleLang, pdfNav }: CompletionScreenProps) {
  const timeSeconds = Math.round(stats.timeMs / 1000);
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = timeSeconds % 60;
  const uiDir = lang === "ar" ? "rtl" : "ltr";

  const PrevIcon = uiDir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = uiDir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background" dir={uiDir}>
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleLang}
          data-testid="button-toggle-lang-complete"
          className="font-semibold min-w-[4rem]"
        >
          {t.toggleLanguage}
        </Button>
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-lg text-center space-y-8"
        data-testid="card-completion"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-2" data-testid="text-session-complete">{t.sessionComplete}</h2>
          <p className="text-muted-foreground">{t.sessionCompleteSubtitle}</p>
          {pdfNav && (
            <p className="text-sm text-primary mt-2 font-medium">
              {t.pdfPage} {pdfNav.current} / {pdfNav.total}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-xl">
            <div className="text-sm text-muted-foreground font-medium mb-1">{t.totalWords}</div>
            <div className="text-3xl font-bold font-mono" data-testid="text-total-words">{stats.totalWords}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-xl">
            <div className="text-sm text-muted-foreground font-medium mb-1">{t.averageWpm}</div>
            <div className="text-3xl font-bold font-mono text-primary" data-testid="text-avg-wpm">{stats.avgWpm}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-xl col-span-2">
            <div className="text-sm text-muted-foreground font-medium mb-1">{t.timeTaken}</div>
            <div className="text-3xl font-bold font-mono" data-testid="text-time-taken">
              {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
            </div>
          </div>
        </div>

        {pdfNav?.error && (
          <p className="text-sm text-destructive">{pdfNav.error}</p>
        )}

        {/* PDF page navigation */}
        {pdfNav && (pdfNav.onPrev || pdfNav.onNext) && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={pdfNav.onPrev}
              disabled={!pdfNav.onPrev}
              className="flex-1"
              data-testid="button-prev-page"
            >
              <PrevIcon className="w-4 h-4 me-2" />
              {t.pdfPrevPage}
            </Button>
            <Button
              size="lg"
              onClick={pdfNav.onNext}
              disabled={!pdfNav.onNext}
              className="flex-1"
              data-testid="button-next-page"
            >
              {t.pdfNextPage}
              <NextIcon className="w-4 h-4 ms-2" />
            </Button>
          </div>
        )}

        {/* Standard controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" size="lg" onClick={onSetup} className="flex-1" data-testid="button-new-text">
            <Settings className="w-4 h-4 me-2" />
            {t.newText}
          </Button>
          <Button size="lg" onClick={onRestart} className="flex-1" data-testid="button-read-again">
            <RotateCcw className="w-4 h-4 me-2" />
            {t.readAgain}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
