import Link from "next/link";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
import { lecturerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AdminLecturersPage() {
  await requireRole("administrator");
  const db = getDb();
  const lecturers = await db
    .select({
      id: lecturerProfiles.id,
      name: users.name,
      email: users.email,
      staffId: lecturerProfiles.staffId,
      department: lecturerProfiles.department,
      status: users.status,
    })
    .from(lecturerProfiles)
    .innerJoin(users, eq(lecturerProfiles.userId, users.id));

  return (
    <>
      <PageHeader
        title="Lecturers"
        description="Teacher accounts created and managed by the administrator."
        actions={
          <Button asChild>
            <Link href="/admin/lecturers/new">
              <Plus className="size-4" />
              New lecturer
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lecturers.map((lecturer) => (
                <TableRow key={lecturer.id}>
                  <TableCell className="font-medium">{lecturer.name}</TableCell>
                  <TableCell>{lecturer.email}</TableCell>
                  <TableCell>{lecturer.staffId || "-"}</TableCell>
                  <TableCell>{lecturer.department || "-"}</TableCell>
                  <TableCell>{lecturer.status}</TableCell>
                </TableRow>
              ))}
              {lecturers.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No lecturer accounts have been created yet.
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
