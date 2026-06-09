import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, BookOpen } from "lucide-react";
import { ReadingMode } from "@/lib/speed-reader";

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
}

export function SetupPanel({
  text, setText,
  wpm, setWpm,
  mode, setMode,
  chunkSize, setChunkSize,
  directionOverride, setDirectionOverride,
  onStart
}: SetupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Speed Reader
        </h1>
        <p className="text-muted-foreground">Train your focus. Read faster. Distraction free.</p>
      </div>

      <div className="space-y-4 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <Label htmlFor="text-input" className="text-base font-semibold">Your Text</Label>
          <div>
            <input 
              type="file" 
              accept=".txt" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload .txt
            </Button>
          </div>
        </div>
        <Textarea 
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here..."
          className="min-h-[200px] resize-y font-serif text-base"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Reading Speed</Label>
              <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{wpm} WPM</span>
            </div>
            <Slider 
              value={[wpm]} 
              onValueChange={([v]) => setWpm(v)} 
              min={100} 
              max={1000} 
              step={10} 
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100</span>
              <span>1000</span>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Display Mode</Label>
            <RadioGroup value={mode} onValueChange={(v: ReadingMode) => {
              setMode(v);
              setChunkSize(v === "words" ? 1 : 1);
            }} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="words" id="mode-words" />
                <Label htmlFor="mode-words">Words</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lines" id="mode-lines" />
                <Label htmlFor="mode-lines">Lines</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">
              {mode === "words" ? "Words per chunk" : "Lines per chunk"}
            </Label>
            <Select 
              value={chunkSize.toString()} 
              onValueChange={(v) => setChunkSize(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select amount" />
              </SelectTrigger>
              <SelectContent>
                {mode === "words" 
                  ? Array.from({length: 7}, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'word' : 'words'}</SelectItem>
                    ))
                  : Array.from({length: 15}, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'line' : 'lines'}</SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Text Direction</Label>
            <Select 
              value={directionOverride} 
              onValueChange={(v: "auto" | "ltr" | "rtl") => setDirectionOverride(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                <SelectItem value="ltr">Left to Right (LTR)</SelectItem>
                <SelectItem value="rtl">Right to Left (RTL)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-detect automatically switches to RTL for Arabic, Hebrew, and other RTL scripts.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          size="lg" 
          onClick={onStart} 
          disabled={!text.trim()}
          className="w-full md:w-auto text-lg px-8 py-6 h-auto"
        >
          Start Reading
        </Button>
      </div>
    </div>
  );
}