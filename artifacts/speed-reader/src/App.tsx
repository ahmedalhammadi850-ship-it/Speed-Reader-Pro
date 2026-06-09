import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedReader } from "@/components/SpeedReader";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-[100dvh] w-full bg-background text-foreground selection:bg-highlight selection:text-highlight-foreground">
        <SpeedReader />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
