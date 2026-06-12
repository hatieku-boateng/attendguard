import { KeyRound, MapPinned, Radio, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand";

const assuranceMetrics = [
  { icon: KeyRound, label: "Passkey", value: "128" },
  { icon: MapPinned, label: "GPS lock", value: "12m" },
  { icon: Radio, label: "Audit", value: "Live" },
];

const sessionBars = [78, 64, 88, 52, 93];

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
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-[oklch(0.17_0.04_238)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent" />
        <div>
          <BrandMark className="relative text-white" />
        </div>
        <div className="relative max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/75 shadow-lg shadow-slate-950/20 backdrop-blur-md">
            <ShieldCheck className="size-4 text-emerald-300" />
            {eyebrow}
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-normal">
            {title}
          </h1>
          <p className="max-w-lg text-base leading-7 text-white/70">{description}</p>
          <div className="grid max-w-lg gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-slate-950/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-sm font-semibold">Session assurance</p>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                  Live verification model
                </p>
              </div>
              <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
                Active
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {assuranceMetrics.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-lg border border-white/10 bg-black/15 p-3"
                    key={item.label}
                  >
                    <Icon className="mb-3 size-4 text-amber-200" />
                    <p className="font-mono text-2xl font-semibold">{item.value}</p>
                    <p className="text-xs text-white/55">{item.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 pt-1">
              {sessionBars.map((width, index) => (
                <div className="flex items-center gap-3" key={`session-${index}`}>
                  <span className="w-12 text-xs text-white/45">S{index + 1}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-emerald-300"
                      style={{ width: `${width}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative grid gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4 text-sm text-white/75 shadow-xl shadow-slate-950/20">
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
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
