import Link from "next/link";

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
      <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl border border-white/45 bg-white shadow-md shadow-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/25 group-hover:-rotate-3 p-1 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/puc-crest.jpg" 
          alt="Pentecost University Crest"
          className="size-full object-contain"
        />
      </span>
      <span data-brand-text className="hidden gap-0.5 sm:grid">
        <span className="text-[0.95rem] font-extrabold leading-none tracking-tight text-current transition-all duration-300 group-hover:translate-x-0.5">
          Pentecost University
        </span>
        <span className="text-[0.55rem] sm:text-[0.62rem] font-black uppercase tracking-[0.15em] text-secondary mt-0.5">
          <span className="inline sm:hidden">Attendance</span>
          <span className="hidden sm:inline">Attendance System</span>
        </span>
      </span>
    </Link>
  );
}
