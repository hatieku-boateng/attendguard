import { ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <BrandMark className="text-white [&_span:last-child_span:last-child]:text-white/55" />
        </div>
        <div className="max-w-xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/75 backdrop-blur-md">
            <ShieldCheck className="size-4 text-emerald-300" />
            {eyebrow}
          </div>
          <h1 className="text-5xl font-semibold leading-tight tracking-normal">
            {title}
          </h1>
          <p className="text-base leading-7 text-white/70">{description}</p>
        </div>
        <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          <div className="flex items-center justify-between">
            <span>Identity</span>
            <span className="font-medium text-emerald-300">Verified</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Course ownership</span>
            <span className="font-medium text-emerald-300">Assigned</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Attendance audit</span>
            <span className="font-medium text-emerald-300">Tracked</span>
          </div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        {children}
      </section>
    </main>
  );
}
