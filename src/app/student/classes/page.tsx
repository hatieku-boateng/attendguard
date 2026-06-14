import { eq, inArray } from "drizzle-orm";
import { ExternalLink, FileText, Link2, HelpCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { courseResources, courses, enrolments } from "@/db/schema";
import { requireRole } from "@/lib/auth";

// Helper to match resource type icons
function getResourceIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("link") || normalized.includes("url")) {
    return <Link2 className="size-4.5 text-primary" />;
  }
  return <FileText className="size-4.5 text-cyan-500" />;
}

export default async function StudentClassesPage() {
  const user = await requireRole("student");
  const db = getDb();

  const rows = await db
    .select({
      courseCode: courses.courseCode,
      courseId: courses.id,
      courseTitle: courses.courseTitle,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
      status: enrolments.status,
    })
    .from(enrolments)
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .where(eq(enrolments.studentId, user.studentProfileId ?? ""));
    
  const resources = rows.length
    ? await db
        .select({
          id: courseResources.id,
          courseId: courseResources.courseId,
          title: courseResources.title,
          resourceType: courseResources.resourceType,
          resourceUrl: courseResources.resourceUrl,
          description: courseResources.description,
        })
        .from(courseResources)
        .where(
          inArray(
            courseResources.courseId,
            rows.map((row) => row.courseId),
          ),
        )
    : [];

  return (
    <>
      <PageHeader
        title="Registered classes"
        description="Courses where your student profile is enrolled."
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.courseCode}-${row.academicYear}-${row.semester}`}>
                  <TableCell className="font-bold text-foreground">{row.courseCode}</TableCell>
                  <TableCell className="font-medium text-foreground/90">{row.courseTitle}</TableCell>
                  <TableCell>{row.semester}</TableCell>
                  <TableCell>{row.academicYear}</TableCell>
                  <TableCell>{row.classGroup}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground text-xs" colSpan={6}>
                    No classes are linked to your account yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="mt-6 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Course resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {resources.map((resource) => {
              const course = rows.find((row) => row.courseId === resource.courseId);

              return (
                <div 
                  className="rounded-2xl border border-border/60 bg-card/45 p-4.5 hover:bg-card/85 transition-all duration-300 shadow-sm flex flex-col justify-between group/resource hover:border-primary/30" 
                  key={resource.id}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground/80">
                        {course?.courseCode} <span className="text-muted-foreground/40 mx-1">/</span> {resource.resourceType}
                      </p>
                      <span className="flex size-8 items-center justify-center rounded-lg bg-background/50 border border-border/40 shadow-inner group-hover/resource:scale-105 transition-transform duration-300">
                        {getResourceIcon(resource.resourceType)}
                      </span>
                    </div>
                    <p className="mt-2 font-bold text-foreground text-sm leading-snug">{resource.title}</p>
                    {resource.description ? (
                      <p className="mt-2 text-xs text-muted-foreground font-medium leading-relaxed">
                        {resource.description}
                      </p>
                    ) : null}
                  </div>
                  <a
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline w-fit"
                    href={resource.resourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open resource
                    <ExternalLink className="size-3 transition-transform duration-300 group-hover/resource:translate-x-0.5 group-hover/resource:-translate-y-0.5" />
                  </a>
                </div>
              );
            })}
          </div>
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 border border-dashed border-border/80 rounded-2xl bg-muted/20">
              <HelpCircle className="size-7 text-muted-foreground opacity-30 animate-pulse" />
              <p className="text-sm font-medium text-muted-foreground">No course resources are available yet.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
