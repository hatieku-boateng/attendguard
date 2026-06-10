import { eq } from "drizzle-orm";

import { createAssignedCourseAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDb } from "@/db/client";
import { lecturerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function NewAdminCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const params = await searchParams;
  const db = getDb();
  const lecturers = await db
    .select({
      id: lecturerProfiles.id,
      name: users.name,
      email: users.email,
    })
    .from(lecturerProfiles)
    .innerJoin(users, eq(lecturerProfiles.userId, users.id));

  return (
    <>
      <PageHeader
        title="New assigned course"
        description="Create a course and assign ownership to a lecturer. The lecturer will enrol students afterward."
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createAssignedCourseAction} className="grid gap-5 sm:grid-cols-2">
            {params.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                Complete all required fields and select a valid lecturer.
              </p>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lecturerId">Assigned lecturer</Label>
              <Select name="lecturerId" required>
                <SelectTrigger id="lecturerId">
                  <SelectValue placeholder="Select lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((lecturer) => (
                    <SelectItem key={lecturer.id} value={lecturer.id}>
                      {lecturer.name} ({lecturer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course code</Label>
              <Input id="courseCode" name="courseCode" placeholder="CSM 201" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseTitle">Course title</Label>
              <Input id="courseTitle" name="courseTitle" required />
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
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" name="semester" placeholder="Semester 1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic year</Label>
              <Input id="academicYear" name="academicYear" placeholder="2026/2027" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classGroup">Class group</Label>
              <Input id="classGroup" name="classGroup" placeholder="main" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                Create and assign
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
