import Link from "next/link";
import { GraduationCap, Mail } from "lucide-react";

import { activateAccountAction } from "@/app/(auth)/actions";
import { AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  invalid: "Open the activation link from your email, enter your student ID, and use a password of at least 8 characters.",
  "invalid-token": "This activation link is invalid, expired, already used, or does not match that student ID.",
  "too-many": "Too many activation attempts were detected. Please wait a few minutes and try again.",
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? errorMessages[params.error] : null;
  const token = params.token ?? "";

  return (
    <AuthFrame
      description="Imported students activate their device profile using a unique link distributed by their lecturer, confirming their student ID and creating a password."
      eyebrow="Secure student activation"
      title="Activate your student account."
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-border/40 rounded-3xl shadow-2xl relative overflow-hidden text-left flex flex-col">
        {/* Dynamic header highlight */}
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.64_0.16_145))]" />

        <div className="pt-8 pb-4 px-5 sm:px-6 flex flex-col">
          <div className="flex items-center gap-1.5 pb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 border-primary/20">
              <GraduationCap className="size-3.5" />
              Student Enrolment
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Activate account</h2>
          <p className="text-xs font-semibold text-muted-foreground mt-1">
            Confirm your student ID and set up your device passkey password.
          </p>
        </div>

        <div className="space-y-6 pb-8 px-5 sm:px-6 flex flex-col">
          <form action={activateAccountAction} className="space-y-4">
            <input name="token" type="hidden" value={token} />
            {message ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                {message}
              </p>
            ) : null}
            
            {!token ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-xs font-semibold text-primary flex items-start gap-3 backdrop-blur-md">
                <Mail className="size-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Please check your inbox. Open the activation link sent to your email after your lecturer imports your class list.
                </p>
              </div>
            ) : null}
            
            <div className="space-y-1.5">
              <Label htmlFor="studentIdNumber" className="text-xs font-extrabold tracking-tight text-muted-foreground uppercase tracking-widest leading-none">Confirm Student ID</Label>
              <Input 
                className="uppercase-input rounded-2xl h-11 px-4 border-border/70 bg-white dark:bg-zinc-950 shadow-sm" 
                id="studentIdNumber" 
                name="studentIdNumber" 
                required 
                placeholder="STU-001" 
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-extrabold tracking-tight text-muted-foreground uppercase tracking-widest leading-none">Create password</Label>
              <PasswordInput 
                id="password" 
                name="password" 
                required 
                placeholder="••••••••" 
                className="rounded-2xl h-11 px-4 border-border/70 bg-white dark:bg-zinc-950 shadow-sm"
              />
            </div>
            
            <Button className="w-full h-11 rounded-2xl font-bold shadow-md hover:shadow-lg mt-2 text-sm bg-primary text-primary-foreground hover:bg-primary/95 transition-all" type="submit">
              Activate student profile
            </Button>
          </form>
          
          <p className="text-center text-xs text-muted-foreground pt-2 font-semibold">
            Already active?{" "}
            <Link className="font-extrabold text-primary hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthFrame>
  );
}
