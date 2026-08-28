"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const demoRotationMilliseconds = 3000;

export default function Home() {
  const [windowNumber, setWindowNumber] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    const updateDemo = () => {
      const now = Date.now();
      setWindowNumber(Math.floor(now / demoRotationMilliseconds));
      setSecondsLeft(
        Math.max(1, Math.ceil((demoRotationMilliseconds - (now % demoRotationMilliseconds)) / 1000)),
      );
    };
    updateDemo();
    const timer = setInterval(updateDemo, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="relative z-20 mx-auto flex h-20 w-full max-w-[86rem] items-center justify-between px-5 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost"><Link href="/activate-account">Activate account</Link></Button>
          <Button asChild><Link href="/login">Sign in</Link></Button>
        </nav>
      </header>

      <section className="relative min-h-[calc(88vh-5rem)] overflow-hidden border-y border-border bg-card">
        <div className="absolute inset-y-0 right-[-12rem] hidden w-[58rem] items-center justify-center opacity-[0.09] lg:flex dark:opacity-[0.12]">
          <QRCodeSVG
            bgColor="transparent"
            className="h-auto w-full"
            fgColor="currentColor"
            level="M"
            marginSize={1}
            size={900}
            value={`attendguard-demonstration-${windowNumber}`}
          />
        </div>
        <div className="relative z-10 mx-auto grid min-h-[calc(88vh-5rem)] max-w-[86rem] content-center px-5 py-14 sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
              <QrCode className="size-4" />
              Rotating QR attendance
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              AttendGuard
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Open a class, display a secure live QR code, and watch authenticated student check-ins appear in the lecturer roster.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/login">Open your workspace <ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/activate-account">Activate student account</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-[86rem] divide-y divide-border px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          <Metric label="QR rotation" value="3 seconds" />
          <Metric label="Scan tolerance" value="6 seconds" />
          <Metric label="Roster updates" value="Live" />
        </div>
      </section>

      <section className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase text-primary">Classroom workflow</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">One code. One scan. One verified record.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">The code changes continuously while the class remains open. Students scan from their authenticated account, and the server validates enrolment, timing, and duplicates.</p>
        </div>
        <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-4">
          <WorkflowStep icon={Building2} number="01" text="Lecturer opens the scheduled attendance session." title="Open session" />
          <WorkflowStep icon={QrCode} number="02" text="A signed QR code rotates on the lecturer display." title="Display code" />
          <WorkflowStep icon={ScanLine} number="03" text="Students scan using the camera inside their account." title="Scan in class" />
          <WorkflowStep icon={CheckCircle2} number="04" text="The live roster records present or late status." title="Record attendance" />
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-[86rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Live demonstration</p>
            <h2 className="mt-3 text-3xl font-extrabold">Built for the classroom screen</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">The QR stays large and stable while its signed payload changes every three seconds. The immediately previous code remains valid long enough for camera focus and ordinary network delay.</p>
            <div className="mt-7 grid gap-3 text-sm font-semibold">
              <FeatureLine icon={ShieldCheck} text="Cryptographically signed server tokens" />
              <FeatureLine icon={Users} text="Enrolment and account validation" />
              <FeatureLine icon={Clock3} text="Present and late attendance windows" />
              <FeatureLine icon={FileSpreadsheet} text="Auditable reports and corrections" />
            </div>
          </div>
          <div className="mx-auto w-full max-w-lg border border-border bg-white p-6 text-slate-950 shadow-sm sm:p-8">
            <QRCodeSVG
              bgColor="#ffffff"
              className="h-auto w-full"
              fgColor="#111827"
              level="M"
              marginSize={2}
              size={520}
              title="Demonstration rotating QR code"
              value={`attendguard-demonstration-${windowNumber}`}
            />
            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-bold">
              <span>Next code</span>
              <span className="tabular-nums">{secondsLeft}s</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-px border border-border bg-border lg:grid-cols-3">
          <RoleColumn icon={Smartphone} items={["In-app camera scanner", "Immediate success status", "Personal attendance history"]} role="Students" />
          <RoleColumn icon={QrCode} items={["Fullscreen rotating QR", "Live attendance roster", "Manual attendance correction"]} role="Lecturers" />
          <RoleColumn icon={ShieldCheck} items={["User and course management", "Audit and security events", "Attendance exports"]} role="Administrators" />
        </div>
      </section>

      <section className="border-y border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-[86rem] flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center">
          <div><h2 className="text-2xl font-extrabold">Ready for the next attendance session?</h2><p className="mt-2 text-sm opacity-70">Sign in to manage courses, open a QR session, or scan attendance.</p></div>
          <Button asChild size="lg" variant="secondary"><Link href="/login">Sign in <ArrowRight className="size-4" /></Link></Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[86rem] flex-col gap-5 px-5 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <BrandMark />
        <p>(c) 2026 AttendGuard. Secure QR attendance management.</p>
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-6 py-8 text-center"><p className="text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs font-bold uppercase text-muted-foreground">{label}</p></div>;
}

function WorkflowStep({ icon: Icon, number, text, title }: { icon: typeof QrCode; number: string; text: string; title: string }) {
  return <div className="bg-background p-6"><div className="flex items-center justify-between"><Icon className="size-5 text-primary" /><span className="text-xs font-black text-muted-foreground">{number}</span></div><h3 className="mt-8 text-base font-extrabold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>;
}

function FeatureLine({ icon: Icon, text }: { icon: typeof QrCode; text: string }) {
  return <div className="flex items-center gap-3"><Icon className="size-4 text-primary" /><span>{text}</span></div>;
}

function RoleColumn({ icon: Icon, items, role }: { icon: typeof QrCode; items: string[]; role: string }) {
  return <div className="bg-background p-7"><Icon className="size-6 text-primary" /><h3 className="mt-6 text-lg font-extrabold">{role}</h3><ul className="mt-5 space-y-3">{items.map((item) => <li className="flex items-center gap-2 text-sm text-muted-foreground" key={item}><CheckCircle2 className="size-4 text-emerald-500" />{item}</li>)}</ul></div>;
}
