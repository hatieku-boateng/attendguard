import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
        "relative overflow-hidden bg-card/95",
        tone === "success" && "border-emerald-200/80",
        tone === "warning" && "border-amber-200/80",
        tone === "info" && "border-cyan-200/80",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-slate-300",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "info" && "bg-cyan-500",
        )}
      />
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          {value}
        </div>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
