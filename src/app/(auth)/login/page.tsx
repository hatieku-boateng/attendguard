import Link from "next/link";
import { ShieldCheck, BookOpen, GraduationCap } from "lucide-react";

import { loginAction } from "@/app/(auth)/actions";
import { AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const errorMessages: Record<string, string> = {
  missing: "Choose a portal, then enter both email and password.",
  invalid: "The email or password is incorrect.",
  inactive: "This account is not active.",
  "already-active": "Your account is already active. Sign in to continue.",
  "too-many": "Too many attempts were detected. Please wait a few minutes and try again.",
  "role-mismatch": "This account is not registered for the selected portal.",
};

const portalOptions = [
  {
    label: "Admin",
    value: "administrator",
    icon: ShieldCheck,
    color: "has-checked:border-amber-500 has-checked:bg-amber-500/10",
  },
  {
    label: "Lecturer",
    value: "lecturer",
    icon: BookOpen,
    color: "has-checked:border-primary has-checked:bg-primary/10",
  },
  {
    label: "Student",
    value: "student",
    icon: GraduationCap,
    color: "has-checked:border-emerald-500 has-checked:bg-emerald-500/10",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? errorMessages[params.error] : null;

  return (
    <AuthFrame
      description="Move from paper registers to verified, auditable attendance records with automated device activation, location validation, and session logs."
      eyebrow="Trusted workspace access"
      title="Sign in to your attendance console."
    >
      <Card className="w-full max-w-md glass-panel rounded-3xl shadow-2xl relative overflow-hidden border-none text-left">
        {/* Dynamic header highlight */}
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.64_0.16_145))]" />

        <CardHeader className="pt-8 pb-4">
          <div className="flex flex-wrap gap-2 pb-2">
            {[
              { role: "Admin", icon: ShieldCheck, color: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400" },
              { role: "Lecturer", icon: BookOpen, color: "text-primary bg-primary/10 border-primary/20" },
              { role: "Student", icon: GraduationCap, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.role}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider",
                    item.color
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.role}
                </span>
              );
            })}
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">Sign in</CardTitle>
          <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">
            Access your administrator, lecturer, or student attendance workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <form action={loginAction} className="space-y-4">
            {message ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                {message}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest leading-none">
                Login portal
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {portalOptions.map((portal) => {
                  const Icon = portal.icon;

                  return (
                    <Label
                      key={portal.value}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/50 px-2 py-3 text-center text-[10px] font-black uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 has-checked:text-foreground",
                        portal.color,
                      )}
                    >
                      <input
                        className="sr-only"
                        name="role"
                        required
                        type="radio"
                        value={portal.value}
                      />
                      <Icon className="size-4" />
                      {portal.label}
                    </Label>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-extrabold tracking-tight text-muted-foreground uppercase tracking-widest leading-none">Email address</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                required 
                placeholder="name@example.com" 
                className="rounded-2xl h-11 px-4 border-border/70 bg-background/50 shadow-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-extrabold tracking-tight text-muted-foreground uppercase tracking-widest leading-none">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••" 
                className="rounded-2xl h-11 px-4 border-border/70 bg-background/50 shadow-sm"
              />
            </div>

            <Button className="w-full h-11 rounded-2xl font-bold shadow-md hover:shadow-lg mt-2 text-sm bg-primary text-primary-foreground hover:bg-primary/95 transition-all" type="submit">
              Sign in to workspace
            </Button>
          </form>
          
          <p className="text-center text-xs text-muted-foreground pt-2 font-semibold">
            Imported student?{" "}
            <Link className="font-extrabold text-primary hover:underline" href="/activate-account">
              Activate account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
