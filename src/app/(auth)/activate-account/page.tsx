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
  invalid: "Open the activation link from your email, enter your student ID, and use a password of at least 8 characters.",
  "invalid-token": "This activation link is invalid, expired, already used, or does not match that student ID.",
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
      description="Imported students activate their account from a secure email link, confirm their student ID, and create a password."
      eyebrow="Secure student activation"
      title="Activate your student account."
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activate account</CardTitle>
          <CardDescription>
            Use the emailed one-time link, confirm your student ID, and create your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={activateAccountAction} className="space-y-5">
            <input name="token" type="hidden" value={token} />
            {message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}
            {!token ? (
              <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                Open the activation link sent to your email after your lecturer imports your class list.
              </p>
            ) : null}
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
