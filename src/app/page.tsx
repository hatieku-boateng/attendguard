import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  KeyRound,
  MapPin,
  Radar,
  UsersRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  ["Identity", "Account matched"],
  ["Passkey", "One-time secure"],
  ["Location", "Server verified"],
  ["Review", "Audit logged"],
];

const features = [
  {
    icon: MapPin,
    title: "Geofenced sessions",
    description:
      "Lecturers capture the lecture location, define a radius, and let the server verify every student position.",
  },
  {
    icon: KeyRound,
    title: "Student-specific passkeys",
    description:
      "Every enrolled student receives a unique one-time passkey tied to their account and session.",
  },
  {
    icon: FileText,
    title: "Operational reports",
    description:
      "Course-level attendance exports include status, time, distance, accuracy, remarks, and review outcomes.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <BrandMark />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/activate-account">Activate</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-12 pt-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-20">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm">
            <Radar className="size-4 text-primary" />
            Location-aware attendance operations
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-6xl">
              Secure attendance for modern lecture halls.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              AttendGuard combines verified accounts, one-time passkeys,
              geofencing, audit trails, and lecturer review into a focused
              attendance platform built for real academic workflows.
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
                className="flex items-center gap-3 rounded-lg border bg-card/90 p-3 shadow-sm"
                key={label}
              >
                <CheckCircle2 className="size-5 text-emerald-600" />
                <div>
                  <p className="text-xs uppercase tracking-normal text-muted-foreground">
                    {label}
                  </p>
                  <p className="font-medium text-slate-950">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-xl shadow-slate-950/10">
          <div className="rounded-lg border bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Administrator console</p>
                <h2 className="mt-1 text-2xl font-semibold">Institution setup</h2>
              </div>
              <span className="rounded-lg bg-emerald-400/15 px-3 py-2 text-sm text-emerald-200">
                Live
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              {[
                ["Course catalogue", "Reusable course records"],
                ["Lecturer assignment", "Dropdown-based ownership"],
                ["Student enrolment", "Managed by assigned lecturers"],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                  key={label}
                >
                  <span className="text-sm text-white/70">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [UsersRound, "Users", "Role-based"],
              [FileText, "Resources", "Published"],
              [CheckCircle2, "Audit", "Logged"],
            ].map(([Icon, label, value]) => (
              <div className="rounded-lg border p-4" key={String(label)}>
                <Icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-medium">{String(label)}</p>
                <p className="text-xs text-muted-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-white/70">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-6 py-12 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="space-y-4 pt-6">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </span>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-950">
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
