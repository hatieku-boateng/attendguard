import Link from "next/link";
import { eq } from "drizzle-orm";
import { Pencil, Plus, UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
      avatarUrl: users.avatarUrl,
      staffId: lecturerProfiles.staffId,
      department: lecturerProfiles.department,
      status: users.status,
    })
    .from(lecturerProfiles)
    .innerJoin(users, eq(lecturerProfiles.userId, users.id));

  return (
    <>
      <PageHeader
        title="Lecturer Accounts"
        description="Provision, configure, and monitor verified instructor workspaces and staff assignments."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/admin/lecturers/new" className="flex items-center gap-1.5">
              <Plus className="size-4.5" />
              <span>Register Lecturer</span>
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="pt-6 px-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Lecturer Name</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Email Address</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Staff ID</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Department</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lecturers.map((lecturer) => (
                  <TableRow key={lecturer.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-muted/60 border border-border/40 overflow-hidden shadow-inner">
                          {lecturer.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="size-10 rounded-xl object-cover"
                              src={lecturer.avatarUrl}
                            />
                          ) : (
                            <UserRound className="size-4.5 text-muted-foreground/80" />
                          )}
                        </span>
                        <span className="text-sm font-extrabold text-foreground">{lecturer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{lecturer.email}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{lecturer.staffId || "-"}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{lecturer.department || "-"}</TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={lecturer.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
                      <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                        <Link href={`/admin/lecturers/${lecturer.id}/edit`} className="flex items-center gap-1.5">
                          <Pencil className="size-3.5" />
                          <span>Edit</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lecturers.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <UserRound className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No lecturer accounts registered.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {lecturers.map((lecturer) => (
              <div key={lecturer.id} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 border border-border/40 overflow-hidden shadow-inner">
                      {lecturer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="size-10 rounded-xl object-cover"
                          src={lecturer.avatarUrl}
                        />
                      ) : (
                        <UserRound className="size-4.5 text-muted-foreground/80" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-extrabold text-foreground block truncate">{lecturer.name}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold block truncate mt-0.5">{lecturer.email}</span>
                    </div>
                  </div>
                  <StatusBadge status={lecturer.status} />
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Staff ID</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{lecturer.staffId || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Department</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{lecturer.department || "-"}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1.5">
                  <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm w-full">
                    <Link href={`/admin/lecturers/${lecturer.id}/edit`} className="flex items-center justify-center gap-1.5">
                      <Pencil className="size-3.5" />
                      <span>Edit Account</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {lecturers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <UserRound className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm">No lecturer accounts registered.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
