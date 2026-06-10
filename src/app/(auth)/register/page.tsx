import Link from "next/link";

import { registerAction } from "@/app/(auth)/actions";
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
  invalid: "Enter a name, email, and password of at least 8 characters.",
  exists: "An account already exists for this email.",
  "student-id": "Student accounts require a student ID number.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? errorMessages[params.error] : null;

  return (
    <AuthFrame
      description="Student accounts can self-register or activate an imported record. Lecturer accounts are created by the administrator."
      eyebrow="Student onboarding"
      title="Create your student attendance profile."
    >
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create student account</CardTitle>
          <CardDescription>
            Lecturer accounts are issued by the administrator after course assignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={registerAction} className="grid gap-5 sm:grid-cols-2">
            {message ? (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentIdNumber">Student ID</Label>
              <Input id="studentIdNumber" name="studentIdNumber" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programme">Programme</Label>
              <Input id="programme" name="programme" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input id="level" name="level" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classGroup">Class group</Label>
              <Input id="classGroup" name="classGroup" />
            </div>
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit">
                Create student account
              </Button>
            </div>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-foreground underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
