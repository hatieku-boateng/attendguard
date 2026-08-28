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
      


      {/* Structured Header - Aligns with Landing Page Header */}
      <header className="mx-auto flex w-full max-w-[85rem] items-center justify-between px-4 py-5 sm:px-8 sm:py-6 z-30 relative">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Button asChild variant="outline" className="size-9 rounded-full px-0 text-sm font-semibold border-border hover:bg-muted dark:hover:bg-white/[0.06] sm:size-auto sm:h-8.5 sm:px-5">
            <Link href="/" className="inline-flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Return Home</span>
            </Link>
          </Button>
        </nav>
      </header>

      {/* Main Grid - Aligns with Landing Page Hero Grid */}
      <section className="mx-auto max-w-[85rem] px-4 pt-4 pb-12 sm:px-8 sm:pt-8 z-10 relative">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-16 items-center">
          
          {/* Left Column: Brand Details & Value Props */}
          <div className="order-2 space-y-6 text-left sm:space-y-8 lg:order-1">
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
                  title: "Rotating QR checks",
                  desc: "Signed QR codes refresh continuously during every open lecture.",
                  color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  icon: KeyRound,
                  title: "Secure QR check-ins",
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
          <div className="order-1 w-full flex justify-center lg:order-2">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
