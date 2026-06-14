"use client";

import Link from "next/link";
import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  KeyRound,
  MapPin,
  Compass,
  Activity,
  Lock,
  Unlock,
  ShieldCheck,
  Fingerprint,
  Globe,
  Layers,
  Sparkles,
  Zap,
  Check,
  UserCheck,
  FileSpreadsheet,
  MailOpen,
  ClipboardCheck,
  Radar,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  // Smooth mouse-follow gradient hover effect for cards
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden relative pb-20 transition-colors duration-500">
      
      {/* Custom Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-badge {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.35; }
          100% { transform: scale(0.95); opacity: 0.15; }
        }
        .animate-float-badge { animation: float-badge 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-pulse-ring { animation: pulse-ring 3s ease-in-out infinite; }
      ` }} />

      {/* Decorative subtle ambient lights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/3" />
        <div className="absolute top-[40%] right-[-15%] w-[50rem] h-[50rem] rounded-full bg-cyan-500/5 blur-[130px] dark:bg-cyan-500/3 animate-pulse" />
      </div>

      {/* Navigation Header */}
      <header className="mx-auto flex w-full max-w-[85rem] items-center justify-between px-4 sm:px-6 py-6 z-30 relative">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/60 bg-white/70 p-1 sm:p-1.5 shadow-md shadow-slate-950/[0.02] backdrop-blur-xl dark:bg-slate-950/40 dark:border-white/[0.08] transition-colors">
            <Button asChild variant="ghost" className="hidden md:inline-flex rounded-full px-5 text-sm font-semibold h-8.5 hover:bg-muted dark:hover:bg-white/[0.06]">
              <Link href="/activate-account">Activate Student</Link>
            </Button>
            <Button asChild className="rounded-full px-4 sm:px-6 text-xs sm:text-sm font-bold shadow-sm h-7.5 sm:h-8.5 bg-primary text-primary-foreground hover:bg-primary/95 transition-all">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-[85rem] px-6 pt-16 pb-20 sm:px-8 z-10 relative">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] items-center">
          
          {/* Hero Copy (Left) */}
          <div className="space-y-8 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary shadow-sm tracking-wide uppercase dark:bg-primary/10">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Location-Locked Attendance
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[4.5rem]">
                Your Attendance,<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
                  Simplified.
                </span>
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg.5 font-medium max-w-lg">
                GCP-powered attendance built for institutions. Verify student check-ins instantly through coordinate-locked perimeters and secure device-binding passkeys.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto rounded-full px-8 shadow-md shadow-primary/10 hover:shadow-lg transition-all font-bold h-12 bg-primary text-primary-foreground">
                <Link href="/login" className="justify-center">
                  Sign In to Console
                  <ArrowRight className="size-4.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 font-semibold glass-panel-hover h-12 border-border hover:bg-muted dark:hover:bg-zinc-900">
                <Link href="/activate-account" className="justify-center">Activate Student</Link>
              </Button>
            </div>

            {/* Feature tick list */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-extrabold text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Fast check-in
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Spoofing proof
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Instant reports
              </div>
            </div>
          </div>

          {/* Hero Smartphone Mockup (Right) */}
          <div className="w-full relative flex items-center justify-center">
            
            {/* Ambient visual support glow */}
            <div className="absolute size-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            {/* Smartphone Container */}
            <div className="relative w-[280px] sm:w-[310px] h-[550px] sm:h-[600px] rounded-[48px] border-[12px] border-zinc-950 bg-zinc-900 p-3 shadow-2xl flex flex-col justify-between overflow-hidden">
              
              {/* Dynamic Island Speaker */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="size-1.5 bg-zinc-900 rounded-full mr-2" />
                <div className="w-10 h-1 bg-zinc-900 rounded-full" />
              </div>

              {/* Screen Contents */}
              <div className="w-full h-full rounded-[38px] bg-background border border-zinc-800 p-5 pt-8 flex flex-col justify-between select-none relative overflow-hidden">
                
                {/* Internal UI elements */}
                <div className="space-y-6">
                  {/* Phone Header */}
                  <div className="flex items-center justify-between text-2xs text-muted-foreground font-extrabold pt-2">
                    <span>PU Attendance</span>
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      GPS Locked
                    </span>
                  </div>

                  {/* Course Title Card */}
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border/50 text-left">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active session</p>
                    <h4 className="font-extrabold text-sm.5 mt-0.5">CSM 201: Artificial Intelligence</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Lecture Hall A // Prof. Boateng</p>
                  </div>

                  {/* Big pulsing verification checkmark */}
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="relative size-28 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 bg-emerald-500/5 animate-pulse-ring" />
                      <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-lg shadow-emerald-500/15">
                        <UserCheck className="size-9 text-emerald-500 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-1 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 px-3 py-1 text-2xs font-extrabold uppercase tracking-widest border border-emerald-500/25 dark:text-emerald-400">
                        Verified
                      </span>
                      <p className="text-[10px] text-muted-foreground font-bold font-mono">HASH: 0x7F2AC091BEA4</p>
                    </div>
                  </div>
                </div>

                {/* Telemetry log list inside phone */}
                <div className="space-y-2 text-[10px] font-semibold text-muted-foreground border-t border-border/50 pt-4 pb-2">
                  <div className="flex justify-between">
                    <span>GPS ACCURACY:</span>
                    <span className="text-emerald-500 font-bold">1.8m (High)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CALCULATED RANGE:</span>
                    <span className="text-foreground">22.4m / 50m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEVICE IDENTIFIER:</span>
                    <span className="text-foreground">iPhone 15 Pro</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Floating Graphic Badge next to Phone */}
            <div className="absolute -right-4 top-24 animate-float-badge z-10 shrink-0">
              <div className="relative flex size-24 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-xl dark:bg-slate-950/80 dark:border-white/[0.08] p-1">
                <div className="absolute inset-2 rounded-full border border-dashed border-primary/20 animate-spin-slow" />
                <div className="flex flex-col items-center justify-center text-center space-y-0.5">
                  <ShieldCheck className="size-6 text-primary" />
                  <span className="text-[7px] font-black uppercase tracking-widest text-primary leading-none mt-1">100%</span>
                  <span className="text-[6px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Secure</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* "Everything in one place" Section */}
      <section className="border-t border-border/50 bg-white/30 dark:bg-zinc-950/20 backdrop-blur-md relative z-10 py-24 transition-colors">
        <div className="mx-auto max-w-[85rem] px-6 sm:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Overview</span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-gradient-primary">
              Everything in one place.
            </h2>
            <p className="text-base text-muted-foreground font-semibold">
              From geofenced lecture checks to active course logs, manage your verification pipeline seamlessly.
            </p>
          </div>

          {/* Clean Metric Cards Row */}
          <div className="grid gap-6 sm:grid-cols-3 mb-12">
            {[
              { label: "Allowed radius", value: "50m", color: "bg-emerald-500/5 text-emerald-600 border-emerald-500/15 dark:text-emerald-400" },
              { label: "Spoofing protection", value: "100%", color: "bg-cyan-500/5 text-cyan-600 border-cyan-500/15 dark:text-cyan-400" },
              { label: "CSV Export-ready", value: "Logs", color: "bg-violet-500/5 text-violet-600 border-violet-500/15 dark:text-violet-400" },
            ].map((metric, i) => (
              <div 
                key={i} 
                className={`rounded-3xl border p-6 sm:p-8 text-center flex flex-col items-center justify-center shadow-sm ${metric.color}`}
              >
                <span className="text-3xl sm:text-4xl font-black tracking-tight">{metric.value}</span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mt-2">{metric.label}</span>
              </div>
            ))}
          </div>

          {/* Grid of 4 Clean Features */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MapPin,
                title: "Coordinate locks",
                description:
                  "Lecturers anchor perimeters around the lecture coordinates, establishing allowed radius buffers.",
                color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: KeyRound,
                title: "Device registration",
                description:
                  "Student device details are bound during account activation, blocking coordinate sharing and proxy check-ins.",
                color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
              },
              {
                icon: Compass,
                title: "Lecturer command",
                description:
                  "Allocate catalog courses, open coordinate check-ins, and manage override reviews easily.",
                color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
              },
              {
                icon: FileText,
                title: "Auditable ledger",
                description:
                  "All verification outcomes generate clean CSV entries, giving administrations immutable audit proof.",
                color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={i} 
                  className="glass-panel relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-sm hover:scale-[1.01] transition-transform duration-300 select-none"
                >
                  <div className="space-y-4">
                    <span className={`flex size-11 items-center justify-center rounded-2xl border ${feature.color}`}>
                      <Icon className="size-5.5" />
                    </span>
                    <div className="space-y-1.5">
                      <h3 className="font-extrabold text-foreground tracking-tight text-sm.5">
                        {feature.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground font-semibold">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* "Your attendance journey, simplified" (How it works) */}
      <section className="py-24 mx-auto max-w-[85rem] px-6 sm:px-8 relative z-10 text-center">
        <div className="max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold text-primary tracking-widest uppercase">How it works</span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-gradient-primary">
            Your attendance journey, simplified.
          </h2>
          <p className="text-base text-muted-foreground font-semibold">
            Get checked in and verified in just four simple steps.
          </p>
        </div>

        {/* Timeline Steps Row */}
        <div className="relative grid gap-8 md:grid-cols-4 md:gap-4 max-w-5xl mx-auto pt-4">
          
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-cyan-500/10 to-primary/10 -z-10" />

          {[
            { step: "Step 01", title: "Activate Account", desc: "Register your device using your student enrolment email.", icon: MailOpen, color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/25" },
            { step: "Step 02", title: "Join Lecture", desc: "Wait for the lecturer to open a coordinate-locked session.", icon: Radar, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25" },
            { step: "Step 03", title: "Verify Location", desc: "Submit check-in within the geofenced radius on your phone.", icon: MapPin, color: "bg-purple-500/10 text-purple-500 border-purple-500/25" },
            { step: "Step 04", title: "Success Logged", desc: "Get verified and logged automatically in the register.", icon: ClipboardCheck, color: "bg-rose-500/10 text-rose-500 border-rose-500/25" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex flex-col items-center space-y-4 max-w-[280px] md:max-w-none w-full mx-auto">
                <span className={`flex size-20 items-center justify-center rounded-full border shadow-sm ${item.color}`}>
                  <Icon className="size-8" />
                </span>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{item.step}</p>
                  <h4 className="font-extrabold text-sm.5 tracking-tight text-foreground">{item.title}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground font-semibold px-2">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* "Attendance You Can Trust" Section */}
      <section className="border-t border-border/50 bg-white/30 dark:bg-zinc-950/20 backdrop-blur-md relative z-10 py-24 transition-colors">
        <div className="mx-auto max-w-[85rem] px-6 sm:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Compliance</span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-gradient-primary">
              Attendance you can trust.
            </h2>
            <p className="text-base text-muted-foreground font-semibold">
              A system engineered for absolute accuracy, accessibility, and audit readiness.
            </p>
          </div>

          {/* Three checklist blocks */}
          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            {[
              {
                badge: "For Students",
                title: "One-tap check-in",
                list: [
                  "Verify coordinates in seconds",
                  "Privacy guaranteed (no tracking)",
                  "Instant success hash logged",
                ],
                border: "border-cyan-500/20",
                badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/25 dark:text-cyan-400",
              },
              {
                badge: "For Lecturers",
                title: "Interactive sessions",
                list: [
                  "Anchor coordinates quickly",
                  "Define custom perimeters",
                  "Review failed attempts override",
                ],
                border: "border-emerald-500/20",
                badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
              },
              {
                badge: "For Administrators",
                title: "Complete catalog control",
                list: [
                  "CSV imports for course data",
                  "Full audit log CSV reports",
                  "Lecturer & student registries",
                ],
                border: "border-purple-500/20",
                badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400",
              },
            ].map((card, i) => (
              <div 
                key={i} 
                className={`rounded-3xl border bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between ${card.border}`}
              >
                <div className="space-y-4 text-left">
                  <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <h4 className="font-extrabold text-md tracking-tight text-foreground">{card.title}</h4>
                  
                  <ul className="space-y-3.5 pt-2">
                    {card.list.map((item, j) => (
                      <li key={j} className="flex gap-2 text-xs font-semibold text-muted-foreground leading-none">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* "Join Pentecost University Attendance" Section */}
      <section className="py-24 mx-auto max-w-[85rem] px-6 sm:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] items-center">
          
          {/* Details (Left) */}
          <div className="space-y-8 text-left">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Workspace Access</span>
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-gradient-primary">
                Join Pentecost University Attendance.
              </h2>
              <p className="text-base text-muted-foreground font-semibold max-w-lg leading-relaxed">
                Unlock dashboard controls. Host geofenced check-ins, import enrolments, manage audits, and generate auditable session spreadsheets.
              </p>
            </div>

            <Button asChild size="lg" className="w-full sm:w-auto rounded-full px-8 shadow-sm font-bold h-12 bg-primary text-primary-foreground justify-center">
              <Link href="/login" className="justify-center">
                Sign In to Console
                <ArrowRight className="size-4.5" />
              </Link>
            </Button>
          </div>

          {/* Three Stacked Pills (Right) */}
          <div className="space-y-4">
            {[
              { title: "Verified profile access", desc: "Authenticated lecturer credential workspaces.", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
              { title: "Radius check-in control", desc: "Open dynamic, location-locked perimeters.", icon: MapPin, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
              { title: "Real-time audit catalogs", desc: "Excel catalogue reports exported instantly.", icon: FileSpreadsheet, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
            ].map((pill, i) => {
              const Icon = pill.icon;
              return (
                <div 
                  key={i}
                  className="rounded-2xl border border-border/50 bg-background/50 p-4.5 flex items-center gap-4.5 shadow-sm text-left select-none"
                >
                  <span className={`flex size-11 items-center justify-center rounded-xl border shrink-0 ${pill.color}`}>
                    <Icon className="size-5.5 animate-pulse" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm leading-none text-foreground">{pill.title}</h4>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">{pill.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 pt-16 pb-8 relative z-10 transition-colors">
        <div className="mx-auto max-w-[85rem] px-6 sm:px-8 grid gap-8 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] pb-12">
          
          {/* Logo column */}
          <div className="space-y-4 text-left">
            <BrandMark />
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed max-w-xs">
              Pentecost University Attendance is a secure geolocation verification platform designed to manage institutional registers, verify coordinate check-ins, and export immutable academic logs.
            </p>
          </div>

          {/* Features Column */}
          <div className="space-y-3.5 text-left">
            <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-foreground">Features</h5>
            <ul className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <li className="hover:text-primary transition-colors cursor-default">Geofenced Perimeters</li>
              <li className="hover:text-primary transition-colors cursor-default">Device Security Keys</li>
              <li className="hover:text-primary transition-colors cursor-default">Lecturer Console</li>
              <li className="hover:text-primary transition-colors cursor-default">CSV Audit Trail</li>
            </ul>
          </div>

          {/* Academic Portal Column */}
          <div className="space-y-3.5 text-left">
            <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-foreground">Academic Portal</h5>
            <ul className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Sign In to Console
                </Link>
              </li>
              <li>
                <Link href="/activate-account" className="hover:text-primary transition-colors">
                  Activate Student
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-3.5 text-left">
            <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-foreground">Contact</h5>
            <ul className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <li className="hover:text-primary transition-colors cursor-default">support@pentvars.edu.gh</li>
              <li className="hover:text-primary transition-colors cursor-default">PU Institution</li>
              <li className="hover:text-primary transition-colors cursor-default">Verification Operations</li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom copyright */}
        <div className="mx-auto max-w-[85rem] px-6 sm:px-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row gap-4 justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed sm:leading-none text-center sm:text-left">
          <span>© 2026 Pentecost University. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
