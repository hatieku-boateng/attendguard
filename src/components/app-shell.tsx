import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

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
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark />
          <nav className="flex flex-wrap items-center gap-1 rounded-lg border bg-card/90 p-1 shadow-sm">
            {navItems.map((item) => (
              <Button asChild key={item.href} size="sm" variant="ghost">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
            <Separator className="mx-1 h-6" orientation="vertical" />
            <Button asChild size="icon" variant="ghost" title="Sign out">
              <Link href="/logout">
                <LogOut className="size-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <div className="border-b border-border/70 bg-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
              <UserRound className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs uppercase tracking-normal text-white/60">
                {user.role} workspace
              </p>
            </div>
          </div>
          <p className="text-sm text-white/70">{user.email}</p>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
