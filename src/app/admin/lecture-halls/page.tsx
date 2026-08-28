import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Building2, Pencil, Plus } from "lucide-react";

import {
  createLectureHallAction,
  deleteLectureHallAction,
  updateLectureHallAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { FormModal } from "@/components/form-modal";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db/client";
import { lectureHalls } from "@/db/schema";
import { requireRole } from "@/lib/auth";

type SearchParams = {
  modal?: string;
  id?: string;
  error?: string;
  created?: string;
  updated?: string;
  deleted?: string;
  archived?: string;
};

export default async function AdminLectureHallsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("administrator");
  const params = await searchParams;
  const db = getDb();
  const halls = await db
    .select()
    .from(lectureHalls)
    .orderBy(asc(lectureHalls.code), asc(lectureHalls.name));

  const [editHall] =
    params.modal === "edit" && params.id
      ? await db
          .select()
          .from(lectureHalls)
          .where(eq(lectureHalls.id, params.id))
          .limit(1)
      : [];

  const notice = params.created
    ? "Lecture hall created."
    : params.updated
      ? "Lecture hall updated."
      : params.deleted
        ? "Lecture hall deleted."
        : params.archived
          ? "The linked lecture hall was archived."
          : null;

  return (
    <>
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/admin/lecture-halls?modal=new">
              <Plus className="size-4" />
              Add hall
            </Link>
          </Button>
        }
        description="Maintain the venue labels lecturers can attach to attendance sessions."
        title="Lecture halls"
      />

      {notice ? (
        <p className="mb-4 border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {halls.map((hall) => (
          <Card className="border-border/50" key={hall.id}>
            <CardContent className="flex items-start justify-between gap-5 pt-6">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-primary/15 bg-primary/5 text-primary">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-foreground">{hall.name}</h2>
                    <StatusBadge status={hall.status} />
                  </div>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">{hall.code}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {[hall.building, hall.roomNumber].filter(Boolean).join(" / ") ||
                      "Building and room not specified"}
                  </p>
                  {hall.notes ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {hall.notes}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button asChild aria-label={`Edit ${hall.name}`} size="icon" title="Edit hall" variant="outline">
                <Link href={`/admin/lecture-halls?modal=edit&id=${hall.id}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {halls.length === 0 ? (
          <div className="border border-dashed border-border px-6 py-14 text-center text-sm font-semibold text-muted-foreground lg:col-span-2">
            No lecture halls have been added.
          </div>
        ) : null}
      </div>

      <FormModal
        description="Add a venue label for lecturer attendance sessions."
        isOpen={params.modal === "new"}
        title="Add lecture hall"
      >
        <form action={createLectureHallAction} className="grid gap-4 sm:grid-cols-2">
          {params.error ? (
            <p className="border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive sm:col-span-2">
              {params.error === "exists"
                ? "A lecture hall with that code already exists."
                : "Enter a hall name and code."}
            </p>
          ) : null}
          <LectureHallFields />
          <Button className="sm:col-span-2" type="submit">Save lecture hall</Button>
        </form>
      </FormModal>

      {editHall ? (
        <FormModal description={editHall.name} isOpen title="Edit lecture hall">
          <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <form action={updateLectureHallAction} className="grid gap-4 sm:grid-cols-2">
              <input name="lectureHallId" type="hidden" value={editHall.id} />
              <LectureHallFields hall={editHall} />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="status">Status</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editHall.status}
                  id="status"
                  name="status"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <Button className="sm:col-span-2" type="submit">Save changes</Button>
            </form>

            <div className="h-fit border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive">Delete hall</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Linked halls are archived to preserve session history.
              </p>
              <form action={deleteLectureHallAction} className="mt-4">
                <input name="lectureHallId" type="hidden" value={editHall.id} />
                <ConfirmSubmitButton
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  message="Delete this lecture hall?"
                >
                  Delete hall
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      ) : null}
    </>
  );
}

function LectureHallFields({ hall }: { hall?: typeof lectureHalls.$inferSelect }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Hall name</Label>
        <Input defaultValue={hall?.name ?? ""} id="name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Hall code</Label>
        <Input defaultValue={hall?.code ?? ""} id="code" name="code" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="building">Building</Label>
        <Input defaultValue={hall?.building ?? ""} id="building" name="building" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="roomNumber">Room number</Label>
        <Input defaultValue={hall?.roomNumber ?? ""} id="roomNumber" name="roomNumber" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={hall?.notes ?? ""} id="notes" name="notes" rows={3} />
      </div>
    </>
  );
}
