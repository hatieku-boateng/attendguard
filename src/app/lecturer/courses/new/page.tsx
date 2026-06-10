import { createCourseAction } from "@/app/lecturer/courses/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="New course"
        description="Create the course/class container that students will be enrolled into before attendance sessions are opened."
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createCourseAction} className="grid gap-5 sm:grid-cols-2">
            {params.error === "missing" ? (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Course code, title, semester, and academic year are required.
              </p>
            ) : null}
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
                Create course
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
