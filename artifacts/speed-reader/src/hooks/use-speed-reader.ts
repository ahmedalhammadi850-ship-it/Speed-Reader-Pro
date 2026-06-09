import { useState, useEffect, useCallback, useRef } from "react";
import { buildChunks, ReadingMode } from "@/lib/speed-reader";

interface UseSpeedReaderProps {
  text: string;
  wpm: number;
  mode: ReadingMode;
  chunkSize: number;
  onComplete: (stats: { totalWords: number; timeMs: number; avgWpm: number }) => void;
}

export function useSpeedReader({ text, wpm, mode, chunkSize, onComplete }: UseSpeedReaderProps) {
  const [chunks, setChunks] = useState<string[][]>([]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Initialize chunks when settings change
  useEffect(() => {
    const newChunks = buildChunks(text, mode, chunkSize);
    setChunks(newChunks);
    setChunkIndex(0);
    setIsPlaying(false);
    setStartTime(null);
  }, [text, mode, chunkSize]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const totalWords = chunks.reduce((acc, chunk) => {
    return acc + chunk.reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0);
  }, 0);

  const wordsRead = chunks.slice(0, chunkIndex).reduce((acc, chunk) => {
    return acc + chunk.reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0);
  }, 0);

  const finish = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    const timeMs = startTime ? Date.now() - startTime : 0;
    const avgWpm = timeMs > 0 ? Math.round((totalWords / (timeMs / 1000)) * 60) : 0;
    onCompleteRef.current({ totalWords, timeMs, avgWpm });
  }, [clearTimer, startTime, totalWords]);

  const advance = useCallback(() => {
    setChunkIndex((prev) => {
      if (prev + 1 >= chunks.length) {
        finish();
        return prev;
      }
      return prev + 1;
    });
  }, [chunks.length, finish]);

  const scheduleNext = useCallback(() => {
    clearTimer();
    if (!isPlayingRef.current || chunkIndex >= chunks.length) return;

    const currentChunk = chunks[chunkIndex];
    if (!currentChunk) return;

    const wordsInChunk = currentChunk.reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0) || 1;
    
    // Convert WPM to interval: interval_ms = (60 / WPM) * 1000 * words_per_chunk
    // We cap it at minimum 50ms so it doesn't just zoom instantly for bugs
    const intervalMs = Math.max(50, (60 / wpm) * 1000 * wordsInChunk);

    timerRef.current = setTimeout(() => {
      advance();
    }, intervalMs);
  }, [chunkIndex, chunks, wpm, advance, clearTimer]);

  useEffect(() => {
    if (isPlaying) {
      if (startTime === null) setStartTime(Date.now());
      scheduleNext();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, chunkIndex, scheduleNext, clearTimer, startTime]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  
  const next = useCallback(() => {
    pause();
    if (chunkIndex < chunks.length - 1) setChunkIndex((p) => p + 1);
  }, [chunkIndex, chunks.length, pause]);

  const prev = useCallback(() => {
    pause();
    if (chunkIndex > 0) setChunkIndex((p) => p - 1);
  }, [chunkIndex, pause]);

  const reset = useCallback(() => {
    pause();
    setChunkIndex(0);
    setStartTime(null);
  }, [pause]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prev();
          break;
        case "r":
        case "R":
          e.preventDefault();
          reset();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, next, prev, reset]);

  return {
    chunks,
    chunkIndex,
    currentChunk: chunks[chunkIndex] || [],
    isPlaying,
    togglePlay,
    pause,
    next,
    prev,
    reset,
    progress: chunks.length > 0 ? chunkIndex / chunks.length : 0,
    wordsRead,
    totalWords,
  };
}