import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "group inline-flex items-center gap-3 rounded-lg outline-none transition focus-visible:ring-3 focus-visible:ring-ring/45",
        className,
      )}
      href={href}
    >
      <span className="relative flex size-12 items-center justify-center overflow-hidden rounded-lg border border-white/30 bg-[linear-gradient(135deg,var(--primary),oklch(0.28_0.075_222))] text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/25 transition group-hover:-translate-y-0.5">
        <span className="absolute inset-x-1 top-1 h-px bg-white/50" />
        <span className="absolute -right-3 -top-4 size-9 rounded-full bg-white/18 blur-md" />
        <ShieldCheck className="size-5" />
      </span>
      <span className="grid">
        <span className="text-[1.05rem] font-semibold leading-5 tracking-normal text-current">
          AttendGuard
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-current/55">
          PU attendance suite
        </span>
      </span>
    </Link>
  );
}
