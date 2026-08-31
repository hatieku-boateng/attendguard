import { notFound } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { adminLoginAction } from "@/app/(auth)/actions";
import { AuthFrame } from "@/components/auth-frame";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAdminAccessKey } from "@/lib/admin-access";

const errorMessages: Record<string, string> = {
  missing: "Enter both email and password.",
  invalid: "The email or password is incorrect.",
  inactive: "This account is not active.",
  "too-many": "Too many attempts were detected. Please wait a few minutes and try again.",
};

export default async function PrivateWorkspaceLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ accessKey: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ accessKey }, query] = await Promise.all([params, searchParams]);

  if (!isAdminAccessKey(accessKey)) {
    notFound();
  }

  const message = query.error ? errorMessages[query.error] : null;

  return (
    <AuthFrame
      description="Restricted workspace access for authorized account administration."
      eyebrow="Protected access"
      title="Sign in to the management console."
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border/40 bg-white text-left shadow-2xl dark:bg-zinc-900">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.64_0.16_145))]" />
        <div className="px-5 pb-4 pt-7 sm:px-6 sm:pt-8">
          <span className="mb-4 flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </span>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Secure sign in</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Authorized accounts only.</p>
        </div>
        <form action={adminLoginAction} className="space-y-4 px-5 pb-8 sm:px-6">
          <input name="accessKey" type="hidden" value={accessKey} />
          {message ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold leading-relaxed text-destructive">
              {message}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground" htmlFor="email">Email address</Label>
            <Input className="h-11 rounded-2xl bg-white px-4 shadow-sm dark:bg-zinc-950" id="email" name="email" placeholder="name@example.com" required type="email" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground" htmlFor="password">Password</Label>
            <PasswordInput className="h-11 rounded-2xl bg-white px-4 shadow-sm dark:bg-zinc-950" id="password" name="password" placeholder="Password" required />
          </div>
          <Button className="h-11 w-full rounded-2xl font-bold shadow-md" type="submit">Continue</Button>
        </form>
      </div>
    </AuthFrame>
  );
}
