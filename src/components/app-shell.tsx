"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserRound,
  GraduationCap,
  FileSpreadsheet,
  Clock,
  History,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Layers,
  HelpCircle
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "dashboard": LayoutDashboard,
  "lecturers": GraduationCap,
  "catalog": BookOpen,
  "courses": BookOpen,
  "students": Users,
  "reports": FileSpreadsheet,
  "classes": Layers,
  "sessions": Clock,
  "attendance-history": History,
  "profile": User,
};

const getIcon = (href: string) => {
  const parts = href.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1] || "";
  return iconMap[lastSegment] || HelpCircle;
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex lg:flex-row flex-col">
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r bg-background/95 backdrop-blur-xl border-border/40 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:flex lg:h-screen lg:overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-border/40">
          <BrandMark href="/" />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-lg hover:bg-muted"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-5 text-foreground" />
          </Button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
          <div className="px-3 mb-2 text-[0.65rem] font-bold text-muted-foreground/50 uppercase tracking-widest">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = getIcon(item.href);

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3.5 px-4.5 py-3 h-11.5 rounded-xl font-semibold transition-all duration-300 relative group/btn",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/95"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                <Link href={item.href}>
                  <Icon
                    className={cn(
                      "size-4.5 transition-transform duration-300 group-hover/btn:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover/btn:text-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute left-1.5 top-3.5 bottom-3.5 w-1 rounded-full bg-primary-foreground/90" />
                  )}
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Sidebar User Profile Card */}
        <div className="mt-auto border-t border-border/40 p-4.5 bg-slate-950/[0.01] dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="relative flex size-10.5 items-center justify-center rounded-xl border border-border/60 bg-muted/65 shadow-inner">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={user.name}
                  className="size-9 rounded-lg object-cover"
                  src={user.avatarUrl}
                />
              ) : (
                <UserRound className="size-5.5 text-muted-foreground/90" />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate leading-snug">{user.name}</p>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-muted-foreground/80 mt-0.5">
                {user.role} workspace
              </p>
            </div>
            <Button
              asChild
              size="icon"
              variant="ghost"
              title="Sign out"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all scale-90"
            >
              <Link href="/logout" prefetch={false}>
                <LogOut className="size-4.5" />
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-screen lg:overflow-hidden bg-slate-50/20 dark:bg-zinc-950/10">
        {/* Sticky Dashboard Navbar */}
        <header className="sticky top-0 z-40 h-20 border-b border-border/40 bg-background/70 backdrop-blur-xl flex items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-lg hover:bg-muted border border-border/30"
              onClick={() => setIsOpen(true)}
            >
              <Menu className="size-5 text-foreground" />
            </Button>
            {/* Page Title Context */}
            <div className="block">
              <h1 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                <span className="text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">PU Attendance</span>
                <ChevronRight className="size-2.5 sm:size-3 text-muted-foreground/40 shrink-0" />
                <span className="text-primary truncate">{user.role} Portal</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[0.68rem] font-bold text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/[0.02]">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secure Session
            </span>
            <ThemeToggle className="scale-90" />
          </div>
        </header>

        {/* Scrollable Panel */}
        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-8 lg:py-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

