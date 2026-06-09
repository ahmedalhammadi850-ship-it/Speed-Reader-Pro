import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, BookOpen } from "lucide-react";
import { ReadingMode } from "@/lib/speed-reader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lang, translations } from "@/lib/i18n";

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
  onStart, t, lang, onToggleLang
}: SetupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") setText(content);
    };
    reader.readAsText(file);
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
        <div className="flex items-center justify-between">
          <Label htmlFor="text-input" className="text-base font-semibold">{t.yourText}</Label>
          <div>
            <input
              type="file"
              accept=".txt"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-upload">
              <Upload className="w-4 h-4 me-2" />
              {t.uploadTxt}
            </Button>
          </div>
        </div>
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">{t.readingSpeed}</Label>
              <span className="font-mono bg-muted px-2 py-1 rounded text-sm" data-testid="text-wpm">{wpm} WPM</span>
            </div>
            <Slider
              value={[wpm]}
              onValueChange={([v]) => setWpm(v)}
              min={100}
              max={1000}
              step={10}
              className="py-4"
              data-testid="slider-wpm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100</span>
              <span>1000</span>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">{t.displayMode}</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v: ReadingMode) => {
                setMode(v);
                setChunkSize(1);
              }}
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

          <div className="space-y-4">
            <Label className="text-base font-semibold">
              {mode === "words" ? t.wordsPerChunk : t.linesPerChunk}
            </Label>
            <Select
              value={chunkSize.toString()}
              onValueChange={(v) => setChunkSize(parseInt(v))}
            >
              <SelectTrigger data-testid="select-chunk-size">
                <SelectValue />
              </SelectTrigger>
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

        {/* Direction */}
        <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="space-y-4">
            <Label className="text-base font-semibold">{t.textDirection}</Label>
            <Select
              value={directionOverride}
              onValueChange={(v: "auto" | "ltr" | "rtl") => setDirectionOverride(v)}
            >
              <SelectTrigger data-testid="select-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t.autoDetect}</SelectItem>
                <SelectItem value="ltr">{t.leftToRight}</SelectItem>
                <SelectItem value="rtl">{t.rightToLeft}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t.autoDetectHint}</p>
          </div>
        </div>
      </div>

      {/* Start */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={onStart}
          disabled={!text.trim()}
          className="w-full md:w-auto text-lg px-8 py-6 h-auto"
          data-testid="button-start"
        >
          {t.startReading}
        </Button>
      </div>
    </div>
  );
}
