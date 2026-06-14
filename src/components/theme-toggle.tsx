"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">("system");

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemIsDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-white/70 p-1 backdrop-blur-xl shadow-md shadow-slate-950/[0.03] dark:bg-zinc-900/60 dark:border-zinc-800/60", className)}>
      {(["light", "dark", "system"] as const).map((t) => {
        const isActive = theme === t;
        return (
          <Button
            key={t}
            size="icon"
            variant="ghost"
            type="button"
            className={cn(
              "size-7 rounded-full transition-all duration-300",
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-105" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => applyTheme(t)}
            title={`Set theme to ${t}`}
          >
            {t === "light" && <Sun className="size-3.5" />}
            {t === "dark" && <Moon className="size-3.5" />}
            {t === "system" && <Monitor className="size-3.5" />}
          </Button>
        );
      })}
    </div>
  );
}
