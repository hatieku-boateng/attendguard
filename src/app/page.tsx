import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  KeyRound,
  MapPin,
  Radar,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  ["Live sessions", "Geofenced"],
  ["Identity", "Verified"],
  ["Reviews", "Lecturer approved"],
  ["Reports", "Export ready"],
];

const featureCards = [
  {
    icon: MapPin,
    title: "Geofenced lecture sessions",
    description:
      "Lecturers capture a trusted coordinate, set the allowed radius, and let the server validate each submitted location.",
  },
  {
    icon: KeyRound,
    title: "Controlled account activation",
    description:
      "Students activate through secure enrolment links while administrators retain full control over lecturers, courses, and records.",
  },
  {
    icon: FileText,
    title: "Reviewable audit trail",
    description:
      "Suspicious or failed attempts are kept for lecturer review, with reports covering attendance, distance, status, and action history.",
  },
];

const workflow = [
  ["01", "Create catalogue courses"],
  ["02", "Assign lecturers"],
  ["03", "Enroll students"],
  ["04", "Open verified sessions"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="flex items-center gap-2 rounded-lg border border-white/80 bg-white/78 p-1.5 shadow-lg shadow-slate-950/[0.055] backdrop-blur-xl">
          <Button asChild variant="ghost">
            <Link href="/activate-account">Activate</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 pb-10 pt-3 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:pb-16">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-card/80 px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
            <Radar className="size-4 text-primary" />
            Location-aware attendance operations
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              Secure attendance for modern lecture halls.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              AttendGuard combines verified accounts, geofenced sessions,
              lecturer approval workflows, and exportable records in one
              professional attendance platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Sign in
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/activate-account">Activate student account</Link>
            </Button>
          </div>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
            {metrics.map(([label, value]) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-white/80 bg-card/90 p-3 shadow-sm shadow-slate-950/[0.035]"
                key={label}
              >
                <CheckCircle2 className="size-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/80 bg-card p-3 shadow-2xl shadow-slate-950/[0.12] ring-1 ring-white/70">
          <div
            aria-hidden="true"
            className="absolute inset-3 rounded-lg bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1500&q=80')",
            }}
          />
          <div className="relative min-h-[34rem] overflow-hidden rounded-lg bg-[linear-gradient(90deg,oklch(0.11_0.04_238/0.98)_0%,oklch(0.15_0.045_238/0.90)_40%,oklch(0.15_0.04_238/0.30)_100%)] p-5 text-white sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Administrator console
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Institution setup</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/12 px-3 py-1.5 text-sm font-medium text-emerald-100 backdrop-blur-md">
                <ShieldCheck className="size-4" />
                Live
              </span>
            </div>

            <div className="mt-8 grid max-w-md gap-3">
              {workflow.map(([step, label]) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-white/12 bg-white/[0.08] p-4 shadow-xl shadow-slate-950/15 backdrop-blur-md"
                  key={step}
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-white/10 font-mono text-sm font-semibold text-amber-100">
                    {step}
                  </span>
                  <span className="text-sm font-medium text-white/86">{label}</span>
                </div>
              ))}
            </div>

            <div className="absolute inset-x-5 bottom-5 grid gap-3 sm:grid-cols-3 sm:p-1">
              {[
                [UsersRound, "Users", "Role-based"],
                [ClipboardCheck, "Sessions", "Verified"],
                [FileText, "Reports", "Auditable"],
              ].map(([Icon, label, value]) => (
                <div
                  className="rounded-lg border border-white/12 bg-white/[0.10] p-4 shadow-xl shadow-slate-950/20 backdrop-blur-md"
                  key={String(label)}
                >
                  <Icon className="size-5 text-emerald-200" />
                  <p className="mt-3 text-sm font-semibold">{String(label)}</p>
                  <p className="text-xs text-white/62">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/70 bg-white/60">
        <div className="mx-auto grid w-full max-w-[90rem] gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          {featureCards.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="space-y-4 pt-6">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner shadow-primary/5">
                  <feature.icon className="size-5" />
                </span>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
