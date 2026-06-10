import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  KeyRound,
  MapPin,
  Radar,
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
              <Link href="/register">
                Create account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Open workspace</Link>
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

        <div className="relative min-h-[520px] overflow-hidden rounded-lg border bg-slate-950 shadow-2xl shadow-slate-950/20">
          <Image
            alt="AttendGuard lecture hall attendance dashboard"
            className="absolute inset-0 h-full w-full object-cover"
            fill
            priority
            src="/images/attendguard-hero.png"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
            {["Open", "Passkeys", "Review"].map((item, index) => (
              <div
                className="rounded-lg border border-white/15 bg-white/10 p-4 text-white shadow-lg backdrop-blur-md"
                key={item}
              >
                <p className="font-mono text-2xl font-semibold">
                  {index === 0 ? "14" : index === 1 ? "128" : "03"}
                </p>
                <p className="text-xs uppercase tracking-normal text-white/70">
                  {item}
                </p>
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
