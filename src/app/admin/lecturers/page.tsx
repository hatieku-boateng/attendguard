import Link from "next/link";
import { eq } from "drizzle-orm";
import { Pencil, Plus, UserRound, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
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
import { FormModal } from "@/components/form-modal";
import {
  createLecturerAction,
  updateLecturerAction,
  deleteLecturerAction,
} from "@/app/admin/actions";
import { ImageUploadPreview } from "@/components/image-upload-preview";

export default async function AdminLecturersPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string; id?: string; error?: string }>;
}) {
  await requireRole("administrator");
  const params = await searchParams;
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

  // Fetch lecturer for edit modal
  let editLecturer = null;
  if (params.modal === "edit" && params.id) {
    [editLecturer] = await db
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
      .innerJoin(users, eq(lecturerProfiles.userId, users.id))
      .where(eq(lecturerProfiles.id, params.id))
      .limit(1);
  }

  const errorMessages: Record<string, string> = {
    invalid: "Enter a name, email, and password of at least 8 characters.",
    exists: "A user already exists with that email.",
    image: "Upload a valid image under 750 KB.",
    assigned: "Remove this lecturer's course assignments before deleting the lecturer.",
  };

  return (
    <>
      <PageHeader
        title="Lecturer Accounts"
        description="Provision, configure, and monitor verified instructor workspaces and staff assignments."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/admin/lecturers?modal=new" className="flex items-center gap-1.5">
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
                        <Link href={`/admin/lecturers?modal=edit&id=${lecturer.id}`} className="flex items-center gap-1.5">
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
                    <Link href={`/admin/lecturers?modal=edit&id=${lecturer.id}`} className="flex items-center justify-center gap-1.5">
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

      {/* Register Lecturer Modal */}
      <FormModal
        isOpen={params.modal === "new"}
        title="New lecturer"
        description="Create a teacher account. The lecturer can later enrol students and manage assigned attendance sessions."
        className="sm:max-w-xl"
      >
        <form
          action={createLecturerAction}
          className="grid gap-4 sm:grid-cols-2 pt-2"
          encType="multipart/form-data"
        >
          {params.error && errorMessages[params.error] ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
              {errorMessages[params.error]}
            </p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full name</Label>
            <Input id="name" name="name" required placeholder="e.g. Dr. Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email address</Label>
            <Input id="email" name="email" required type="email" placeholder="jane.doe@university.edu" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Temporary password</Label>
            <PasswordInput id="password" name="password" required placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staffId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff ID</Label>
            <Input id="staffId" name="staffId" placeholder="L-100" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
            <Input id="department" name="department" placeholder="Computer Science" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile picture</Label>
            <ImageUploadPreview id="avatar" name="avatar" />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Create lecturer account
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Edit Lecturer Modal */}
      {editLecturer && (
        <FormModal
          isOpen={params.modal === "edit" && !!editLecturer}
          title="Edit lecturer"
          description="Update lecturer details, picture, and administrative profile data."
          className="sm:max-w-2xl"
        >
          <div className="grid gap-6 pt-2 md:grid-cols-[1fr_200px]">
            <form
              action={updateLecturerAction}
              className="grid gap-4 sm:grid-cols-2"
              encType="multipart/form-data"
            >
              <input name="lecturerId" type="hidden" value={editLecturer.id} />
              {params.error && errorMessages[params.error] ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  {errorMessages[params.error]}
                </p>
              ) : null}
              <div className="sm:col-span-2 space-y-1 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground truncate">{editLecturer.name}</p>
                <p className="truncate">{editLecturer.email}</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input defaultValue={editLecturer.name} id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  defaultValue={editLecturer.email}
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffId">Staff ID</Label>
                <Input defaultValue={editLecturer.staffId ?? ""} id="staffId" name="staffId" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  defaultValue={editLecturer.department ?? ""}
                  id="department"
                  name="department"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile picture</Label>
                <ImageUploadPreview id="avatar" name="avatar" defaultImage={editLecturer.avatarUrl} />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full" type="submit">
                  Save lecturer
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4 text-xs text-muted-foreground flex flex-col justify-between h-fit self-start">
              <div>
                <h4 className="font-extrabold text-foreground uppercase tracking-wider mb-2">Delete Lecturer</h4>
                <p className="leading-relaxed">
                  Lecturer accounts can be deleted after their assigned courses have been removed or reassigned.
                </p>
              </div>
              <form action={deleteLecturerAction}>
                <input name="lecturerId" type="hidden" value={editLecturer.id} />
                <ConfirmSubmitButton message="Delete this lecturer account? This cannot be undone." className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                  <Trash2 className="size-3.5" />
                  <span>Delete Lecturer</span>
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      )}
    </>
  );
}
