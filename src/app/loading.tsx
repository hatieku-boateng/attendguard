import { Radar } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md transition-colors duration-500">
      <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-card/50 border border-border/40 shadow-xl max-w-xs w-full mx-4 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary to-cyan-500 opacity-20 blur-lg animate-pulse" />
        
        {/* Loader Icon / Spinner */}
        <div className="relative flex items-center justify-center size-24 z-10">
          <span className="absolute inset-0 rounded-full border-4 border-primary/10 bg-primary/5 animate-pulse" />
          <span className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-500/30 animate-spin" style={{ animationDuration: '3s' }} />
          <Radar className="size-10 text-primary animate-pulse" />
        </div>

        {/* Text */}
        <h3 className="mt-6 text-sm font-black tracking-widest text-foreground uppercase z-10">
          AttendGuard
        </h3>
        <p className="mt-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse z-10">
          Retrieving secure gateway...
        </p>

        {/* Tiny progress dots */}
        <div className="flex gap-1.5 mt-4 z-10">
          <span className="size-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="size-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="size-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
