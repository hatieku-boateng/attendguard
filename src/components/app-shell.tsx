import Link from "next/link";
import { CircleCheck, LogOut, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CurrentUser } from "@/lib/auth";

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 shadow-sm shadow-slate-950/5 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-[88rem] flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark />
          <nav className="w-full overflow-x-auto rounded-lg border border-border/80 bg-card/95 p-1 shadow-md shadow-slate-950/5 ring-1 ring-white/70 sm:w-auto">
            <div className="flex min-w-max items-center gap-1">
              {navItems.map((item) => (
                <Button
                  asChild
                  className="px-3 text-muted-foreground hover:text-foreground"
                  key={item.href}
                  size="sm"
                  variant="ghost"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
              <Separator className="mx-1 h-6" orientation="vertical" />
              <Button asChild size="icon" variant="ghost" title="Sign out">
                <Link href="/logout" prefetch={false}>
                  <LogOut className="size-4" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>
      <div className="border-b border-white/10 bg-[oklch(0.18_0.038_238)] text-white shadow-lg shadow-slate-950/10">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-inner shadow-white/5">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-10 rounded-lg object-cover"
                  src={user.avatarUrl}
                />
              ) : (
                <UserRound className="size-5" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold tracking-normal">{user.name}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">
                {user.role} workspace
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
              <CircleCheck className="size-3.5" />
              Secure session
            </span>
            <p className="break-all text-sm text-white/70 sm:text-right">{user.email}</p>
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-[88rem] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
