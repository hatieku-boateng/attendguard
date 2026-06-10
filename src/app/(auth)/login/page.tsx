import Link from "next/link";

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

const errorMessages: Record<string, string> = {
  missing: "Enter both email and password.",
  invalid: "The email or password is incorrect.",
  inactive: "This account is not active.",
  "already-active": "Your account is already active. Sign in to continue.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? errorMessages[params.error] : null;

  return (
    <AuthFrame
      description="Move from paper registers to verified, auditable attendance records with account, passkey, time, and location checks."
      eyebrow="Trusted workspace access"
      title="Sign in to your attendance command center."
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Access your admin, lecturer, or student attendance workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 grid gap-2 sm:grid-cols-3">
            {["Admin", "Lecturer", "Student"].map((role) => (
              <div
                className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-xs font-medium uppercase tracking-normal text-muted-foreground"
                key={role}
              >
                {role}
              </div>
            ))}
          </div>
          <form action={loginAction} className="space-y-5">
            {message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Imported student?{" "}
            <Link className="font-medium text-foreground underline" href="/activate-account">
              Activate account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
