import Link from "next/link";
import { ArrowLeft, KeyRound, MapPin, FileText, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

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
    <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden pb-16 transition-colors duration-500">
      
      {/* Subtle background ambient lights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60rem] h-[60rem] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/3" />
        <div className="absolute bottom-[10%] right-[-15%] w-[50rem] h-[50rem] rounded-full bg-cyan-500/5 blur-[130px] dark:bg-cyan-500/3 animate-pulse" />
      </div>

      {/* Structured Header - Aligns with Landing Page Header */}
      <header className="mx-auto flex w-full max-w-[85rem] items-center justify-between px-4 sm:px-6 py-6 z-30 relative">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Button asChild variant="outline" className="rounded-full px-3 sm:px-5 text-xs sm:text-sm font-semibold h-7.5 sm:h-8.5 border-border hover:bg-muted dark:hover:bg-white/[0.06]">
            <Link href="/" className="inline-flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Return Home</span>
            </Link>
          </Button>
        </nav>
      </header>

      {/* Main Grid - Aligns with Landing Page Hero Grid */}
      <section className="mx-auto max-w-[85rem] px-4 sm:px-6 pt-8 pb-12 z-10 relative">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] items-center">
          
          {/* Left Column: Brand Details & Value Props */}
          <div className="space-y-8 text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary shadow-sm tracking-wide uppercase dark:bg-primary/10">
              <ShieldCheck className="size-4 text-emerald-500 animate-pulse" />
              {eyebrow}
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl font-black leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
                {title}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground font-semibold max-w-lg">
                {description}
              </p>
            </div>

            {/* Feature Highlights List */}
            <div className="space-y-6 pt-6 border-t border-border/50 max-w-lg">
              {[
                {
                  icon: MapPin,
                  title: "Geofenced checks",
                  desc: "Location perimeters validate device coordinates within lecture bounds.",
                  color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  icon: KeyRound,
                  title: "Enrolment passkeys",
                  desc: "Device identities are securely bound during activation, preventing proxies.",
                  color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
                },
                {
                  icon: FileText,
                  title: "Auditable journals",
                  desc: "Every attendance session is logged into immutable, exportable registers.",
                  color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex gap-4.5 group/item items-start text-left select-none">
                    <span className={`flex size-10 items-center justify-center rounded-2xl border shrink-0 transition-transform duration-300 group-hover/item:scale-105 shadow-inner ${item.color}`}>
                      <Icon className="size-4.5" />
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-extrabold text-foreground tracking-tight">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
