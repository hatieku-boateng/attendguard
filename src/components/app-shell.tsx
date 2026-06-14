"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleCheck, LogOut, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

export function AppShell({
  user,
  navItems,
  children,
}: {
  user: CurrentUser;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:bg-zinc-950/70 dark:border-zinc-900/60">
        <div className="mx-auto flex min-h-20 w-full max-w-[90rem] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark />
          <nav className="w-full overflow-x-auto rounded-xl border border-border/60 bg-white/80 p-1.5 shadow-md shadow-slate-950/[0.04] ring-1 ring-white/90 dark:bg-zinc-900/80 dark:border-zinc-800/60 dark:ring-zinc-900/50 sm:w-auto">
            <div className="flex min-w-max items-center gap-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Button
                    asChild
                    className={cn(
                      "px-4 transition-all duration-300 font-semibold relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    key={item.href}
                    size="sm"
                    variant={isActive ? "default" : "ghost"}
                  >
                    <Link href={item.href}>
                      {item.label}
                      {isActive && (
                        <span className="absolute bottom-1 inset-x-4 h-0.5 rounded-full bg-primary-foreground/60 sm:hidden" />
                      )}
                    </Link>
                  </Button>
                );
              })}
              <ThemeToggle className="mr-0.5 scale-85" />
              <Separator className="mx-1 h-5 dark:bg-zinc-800" orientation="vertical" />
              <Button asChild size="icon" variant="ghost" title="Sign out" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <Link href="/logout" prefetch={false}>
                  <LogOut className="size-4" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <div className="border-b border-white/10 bg-[linear-gradient(135deg,oklch(0.16_0.035_238),oklch(0.23_0.045_222)_60%,oklch(0.28_0.055_200))] text-white shadow-lg shadow-slate-950/15">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="relative flex size-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-inner ring-4 ring-white/5">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={user.name}
                  className="size-11 rounded-lg object-cover"
                  src={user.avatarUrl}
                />
              ) : (
                <UserRound className="size-6 text-white/90" />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-900 bg-emerald-400 animate-pulse" />
            </span>
            <div className="space-y-0.5">
              <p className="text-base font-bold tracking-tight text-white">{user.name}</p>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-white/55">
                {user.role} workspace
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 sm:items-end">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-950/10">
              <CircleCheck className="size-3.5 animate-pulse" />
              Secure session
            </span>
            <p className="break-all text-xs font-medium text-white/60 tracking-wide sm:text-right">{user.email}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
