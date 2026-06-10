import Link from "next/link";
import { desc } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { courseCatalog } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AdminCatalogPage() {
  await requireRole("administrator");
  const db = getDb();
  const courses = await db
    .select()
    .from(courseCatalog)
    .orderBy(desc(courseCatalog.createdAt));

  return (
    <>
      <PageHeader
        title="Course catalogue"
        description="Create reusable course records once, then assign them to lecturers from a dropdown."
        actions={
          <Button asChild>
            <Link href="/admin/catalog/new">
              <Plus className="size-4" />
              New course
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <span className="font-medium">{course.courseCode}</span>
                    <span className="block text-sm text-muted-foreground">
                      {course.courseTitle}
                    </span>
                  </TableCell>
                  <TableCell>{course.programme || "-"}</TableCell>
                  <TableCell>{course.level || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/catalog/${course.id}/edit`}>
                        <Pencil className="size-4" />
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No catalogue courses have been created yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
