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
        title="Registered Classes"
        description="View courses where your student profile is actively enrolled and download materials."
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-cyan-500" />
        <CardContent className="pt-6 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Code</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Title</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Semester</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Year</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Group</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.courseCode}-${row.academicYear}-${row.semester}`} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-extrabold text-foreground text-sm">{row.courseCode}</TableCell>
                    <TableCell className="px-4 py-4.5 font-bold text-foreground/90 text-sm">{row.courseTitle}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{row.semester}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{row.academicYear}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{row.classGroup}</TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-32 text-center text-muted-foreground text-xs" colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <HelpCircle className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No classes assigned yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-8 overflow-hidden relative glass-panel glass-panel-hover border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="pb-4 border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01]">
          <CardTitle className="text-base font-bold flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15">
              <FileText className="size-4" />
            </span>
            Course Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {resources.map((resource) => {
              const course = rows.find((row) => row.courseId === resource.courseId);

              return (
                <div 
                  className="rounded-2xl border border-border/40 bg-card/25 p-5 hover:bg-card/75 transition-all duration-300 shadow-sm flex flex-col justify-between group/resource hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5" 
                  key={resource.id}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground/75">
                        {course?.courseCode} <span className="text-muted-foreground/30 mx-1.5">/</span> {resource.resourceType}
                      </p>
                      <span className="flex size-8.5 items-center justify-center rounded-xl bg-background/50 border border-border/40 shadow-inner group-hover/resource:scale-105 transition-transform duration-300">
                        {getResourceIcon(resource.resourceType)}
                      </span>
                    </div>
                    <p className="mt-3.5 font-bold text-foreground text-sm leading-snug">{resource.title}</p>
                    {resource.description ? (
                      <p className="mt-2 text-xs text-muted-foreground font-semibold leading-relaxed">
                        {resource.description}
                      </p>
                    ) : null}
                  </div>
                  <a
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors w-fit"
                    href={resource.resourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open Resource
                    <ExternalLink className="size-3 transition-transform duration-300 group-hover/resource:translate-x-0.5 group-hover/resource:-translate-y-0.5" />
                  </a>
                </div>
              );
            })}
          </div>
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-border/50 rounded-2xl bg-muted/10">
              <HelpCircle className="size-8 text-muted-foreground opacity-30 animate-pulse" />
              <p className="text-sm font-semibold text-muted-foreground/70">No course resources have been posted.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
