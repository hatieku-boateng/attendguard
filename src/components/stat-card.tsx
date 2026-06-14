import { 
  BookOpen, 
  UserSquare2, 
  ClipboardCheck, 
  Activity, 
  TrendingUp,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Helper to render icon based on stat label
function renderIconForLabel(label: string, className?: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("lecturer")) return <UserSquare2 className={className} />;
  if (normalized.includes("course")) return <BookOpen className={className} />;
  if (normalized.includes("student")) return <GraduationCap className={className} />;
  if (normalized.includes("session")) return <ClipboardCheck className={className} />;
  if (normalized.includes("active")) return <Activity className={className} />;
  return <TrendingUp className={className} />;
}

export function StatCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "info";
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden glass-panel glass-panel-hover group/stat-card border-white/60 dark:border-zinc-800/40",
        tone === "success" && "hover:border-emerald-500/50 hover:shadow-emerald-500/[0.04]",
        tone === "warning" && "hover:border-amber-500/50 hover:shadow-amber-500/[0.04]",
        tone === "info" && "hover:border-cyan-500/50 hover:shadow-cyan-500/[0.04]",
      )}
    >
      {/* Glow dot overlay */}
      <div 
        className={cn(
          "absolute -right-8 -top-8 size-24 rounded-full blur-2xl opacity-40 transition-transform duration-500 group-hover/stat-card:scale-110 pointer-events-none",
          tone === "success" && "bg-emerald-500/40",
          tone === "warning" && "bg-amber-500/40",
          tone === "info" && "bg-cyan-500/40",
          tone === "default" && "bg-primary/40",
        )} 
      />

      {/* Top accent gradient bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 transition-all duration-300",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "info" && "bg-cyan-500",
          tone === "default" && "bg-primary",
        )}
      />

      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </CardTitle>
          <span 
            className={cn(
              "flex size-8 items-center justify-center rounded-lg shadow-sm border border-border/50 bg-background/50",
              tone === "success" && "text-emerald-500 border-emerald-500/10 bg-emerald-500/5",
              tone === "warning" && "text-amber-500 border-amber-500/10 bg-amber-500/5",
              tone === "info" && "text-cyan-500 border-cyan-500/10 bg-cyan-500/5",
              tone === "default" && "text-primary border-primary/10 bg-primary/5",
            )}
          >
            {renderIconForLabel(label, "size-4.5 group-hover/stat-card:scale-110 transition-transform duration-300")}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-1">
        <div className="font-mono text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {value}
        </div>
        {detail ? (
          <p className="mt-1.5 text-[0.7rem] font-medium text-muted-foreground flex items-center gap-1">
            <span className="size-1 rounded-full bg-muted-foreground/50" />
            {detail}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
