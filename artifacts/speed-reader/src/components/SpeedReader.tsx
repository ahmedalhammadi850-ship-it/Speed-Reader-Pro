import React, { useState } from "react";
import { SetupPanel } from "./SetupPanel";
import { ReaderView } from "./ReaderView";
import { CompletionScreen } from "./CompletionScreen";
import { ReadingMode } from "@/lib/speed-reader";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/lib/i18n";

const SAMPLE_EN = `The ability to read faster and comprehend more is a vital skill in the modern world. Speed reading is not just about moving your eyes quickly across the page; it's about training your brain to process information in chunks rather than reading word by word. By minimizing subvocalization—the internal voice that pronounces every word—you can dramatically increase your reading rate. This tool is designed to help you focus, maintain a steady rhythm, and gradually push your limits. Take a deep breath, clear your mind, and let the words flow.`;

const SAMPLE_AR = `القراءة السريعة مهارة حيوية في عالم اليوم المتسارع. هي ليست مجرد تحريك العيون بسرعة عبر الصفحة، بل هي تدريب العقل على معالجة المعلومات في مجموعات بدلاً من قراءة كل كلمة على حدة. من خلال تقليل النطق الداخلي، وهو الصوت الذاخلي الذي يلفظ كل كلمة، يمكنك زيادة سرعة القراءة بشكل ملحوظ. هذه الأداة مصممة لمساعدتك على التركيز والحفاظ على إيقاع ثابت ودفع حدودك تدريجياً. خذ نفساً عميقاً، وأفرغ ذهنك، ودع الكلمات تتدفق.`;

export function SpeedReader() {
  const { lang, toggle } = useLanguage();
  const t = translations[lang];

  const [view, setView] = useState<"setup" | "reading" | "completed">("setup");
  const [text, setText] = useState(() => lang === "ar" ? SAMPLE_AR : SAMPLE_EN);
  const [wpm, setWpm] = useState(300);
  const [mode, setMode] = useState<ReadingMode>("words");
  const [chunkSize, setChunkSize] = useState(3);
  const [directionOverride, setDirectionOverride] = useState<"auto" | "ltr" | "rtl">("auto");
  const [stats, setStats] = useState({ totalWords: 0, timeMs: 0, avgWpm: 0 });

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
            onStart={() => setView("reading")}
            t={t}
            lang={lang}
            onToggleLang={toggle}
          />
        </div>
      )}

      {view === "reading" && (
        <ReaderView
          text={text}
          wpm={wpm}
          mode={mode}
          chunkSize={chunkSize}
          directionOverride={directionOverride}
          onBack={() => setView("setup")}
          onComplete={(s) => {
            setStats(s);
            setView("completed");
          }}
          t={t}
          lang={lang}
          onToggleLang={toggle}
        />
      )}

      {view === "completed" && (
        <CompletionScreen
          stats={stats}
          onRestart={() => setView("reading")}
          onSetup={() => setView("setup")}
          t={t}
          lang={lang}
          onToggleLang={toggle}
        />
      )}
    </>
  );
}
