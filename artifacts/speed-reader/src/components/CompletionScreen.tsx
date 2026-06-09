import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface CompletionScreenProps {
  stats: {
    totalWords: number;
    timeMs: number;
    avgWpm: number;
  };
  onRestart: () => void;
  onSetup: () => void;
}

export function CompletionScreen({ stats, onRestart, onSetup }: CompletionScreenProps) {
  const timeSeconds = Math.round(stats.timeMs / 1000);
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = timeSeconds % 60;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-lg text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-2">Session Complete</h2>
          <p className="text-muted-foreground">Great job! Here are your reading stats.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-xl">
            <div className="text-sm text-muted-foreground font-medium mb-1">Total Words</div>
            <div className="text-3xl font-bold font-mono">{stats.totalWords}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-xl">
            <div className="text-sm text-muted-foreground font-medium mb-1">Average WPM</div>
            <div className="text-3xl font-bold font-mono text-primary">{stats.avgWpm}</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-xl col-span-2">
            <div className="text-sm text-muted-foreground font-medium mb-1">Time Taken</div>
            <div className="text-3xl font-bold font-mono">
              {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button variant="outline" size="lg" onClick={onSetup} className="flex-1">
            <Settings className="w-4 h-4 mr-2" />
            New Text
          </Button>
          <Button size="lg" onClick={onRestart} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Read Again
          </Button>
        </div>
      </motion.div>
    </div>
  );
}