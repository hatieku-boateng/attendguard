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
        "group inline-flex items-center gap-3.5 rounded-xl outline-none transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/45",
        className,
      )}
      href={href}
    >
      <span className="relative flex size-12 items-center justify-center overflow-hidden rounded-xl border border-white/40 bg-[linear-gradient(135deg,var(--primary),oklch(0.52_0.14_200))] text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-white/10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:-rotate-3">
        <span className="absolute inset-x-1 top-1 h-px bg-white/40" />
        <span className="absolute -right-3 -top-4 size-9 rounded-full bg-white/20 blur-md" />
        <ShieldCheck className="size-6 drop-shadow-[0_2px_6px_rgba(255,255,255,0.3)] transition-transform duration-500 group-hover:scale-110" />
      </span>
      <span className="grid gap-0.5">
        <span className="text-[1.125rem] font-bold leading-none tracking-tight text-current transition-all duration-300 group-hover:translate-x-0.5">
          AttendGuard
        </span>
        <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] opacity-60 text-current">
          PU attendance suite
        </span>
      </span>
    </Link>
  );
}
