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
      <span className="relative flex size-11 items-center justify-center rounded-lg border border-white/20 bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/20 transition group-hover:-translate-y-0.5">
        <span className="absolute inset-x-1 top-1 h-px bg-white/45" />
        <ShieldCheck className="size-5" />
      </span>
      <span className="grid">
        <span className="text-base font-semibold leading-5 tracking-normal text-current">
          AttendGuard
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-current/60">
          PU attendance suite
        </span>
      </span>
    </Link>
  );
}
