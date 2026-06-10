import Link from "next/link";

import { activateAccountAction } from "@/app/(auth)/actions";
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
  invalid: "Enter your registered email, student ID, and a password of at least 8 characters.",
  "not-found": "No pending student account matches those details.",
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? errorMessages[params.error] : null;

  return (
    <AuthFrame
      description="Imported students can securely claim their account by matching the official email and student ID uploaded by the lecturer."
      eyebrow="Student record matching"
      title="Activate your student attendance profile."
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activate account</CardTitle>
          <CardDescription>
            Match your imported student record and create your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={activateAccountAction} className="space-y-5">
            {message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Registered email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentIdNumber">Student ID</Label>
              <Input id="studentIdNumber" name="studentIdNumber" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button className="w-full" type="submit">
              Activate
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already active?{" "}
            <Link className="font-medium text-foreground underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
