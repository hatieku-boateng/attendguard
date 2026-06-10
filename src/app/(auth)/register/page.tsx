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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const errorMessages: Record<string, string> = {
  invalid: "Enter a name, email, and password of at least 8 characters.",
  role: "Choose whether this account is for a lecturer or student.",
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
      description="Create a role-aware account for course setup, roster imports, active sessions, and student check-ins."
      eyebrow="Role-aware onboarding"
      title="Create your AttendGuard workspace."
    >
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Set up a lecturer or student account for the attendance platform.
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
              <Label htmlFor="role">Role</Label>
              <Select name="role" required defaultValue="student">
                <SelectTrigger id="role">
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentIdNumber">Student ID</Label>
              <Input id="studentIdNumber" name="studentIdNumber" />
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
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID</Label>
              <Input id="staffId" name="staffId" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" />
            </div>
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit">
                Create account
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
