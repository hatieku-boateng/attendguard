import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { MapPinned, Pencil, Plus } from "lucide-react";

import {
  createLectureHallAction,
  deleteLectureHallAction,
  updateLectureHallAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { FormModal } from "@/components/form-modal";
import { LocationFields } from "@/components/location-fields";
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

export default async function AdminLectureHallsPage({
  searchParams,
}: {
  searchParams: Promise<{
    modal?: string;
    id?: string;
    error?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    archived?: string;
  }>;
}) {
  await requireRole("administrator");
  const params = await searchParams;
  const db = getDb();

  const halls = await db
    .select()
    .from(lectureHalls)
    .orderBy(asc(lectureHalls.code), asc(lectureHalls.name));

  let editHall = null;
  if (params.modal === "edit" && params.id) {
    [editHall] = await db
      .select()
      .from(lectureHalls)
      .where(eq(lectureHalls.id, params.id))
      .limit(1);
  }

  const errorMessages: Record<string, string> = {
    missing:
      "Enter a hall name, code, valid coordinates, attendance radius, and GPS accuracy limit.",
    exists: "A lecture hall with that code already exists.",
  };
  const notice = params.created
    ? "Lecture hall mapped successfully."
    : params.updated
      ? "Lecture hall details updated successfully."
      : params.deleted
        ? "Lecture hall deleted successfully."
        : params.archived
          ? "Lecture hall has linked sessions, so it was archived instead."
          : null;

  return (
    <>
      <PageHeader
        title="Lecture halls"
        description="Map reusable classroom GPS coordinates for lecturer attendance sessions."
        actions={
          <Button asChild>
            <Link href="/admin/lecture-halls?modal=new">
              <Plus className="size-4" />
              Map hall
            </Link>
          </Button>
        }
      />

      {notice ? (
        <p className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {halls.map((hall) => (
          <Card
            className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative"
            key={hall.id}
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/25" />
            <CardContent className="flex flex-col gap-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
                    <MapPinned className="size-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold leading-snug text-foreground">
                        {hall.name}
                      </h2>
                      <StatusBadge status={hall.status} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {hall.code}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {[hall.building, hall.roomNumber].filter(Boolean).join(" / ") ||
                        "No building label"}
                    </p>
                  </div>
                </div>
                <Button asChild className="shrink-0" size="sm" variant="outline">
                  <Link href={`/admin/lecture-halls?modal=edit&id=${hall.id}`}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-xs font-semibold text-muted-foreground sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                    Coordinates
                  </p>
                  <p className="mt-1 text-foreground">
                    {Number(hall.latitude).toFixed(6)},{" "}
                    {Number(hall.longitude).toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                    Capture settings
                  </p>
                  <p className="mt-1 text-foreground">
                    Radius {hall.geofenceRadiusMeters}m / Accuracy{" "}
                    {hall.maxAcceptedAccuracyMeters}m
                  </p>
                </div>
              </div>

              {hall.notes ? (
                <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                  {hall.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}

        {halls.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="flex min-h-40 items-center justify-center text-sm font-semibold text-muted-foreground">
              No lecture halls have been mapped yet.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <FormModal
        className="sm:max-w-2xl"
        description="Save a classroom coordinate that lecturers can reuse while creating attendance sessions."
        isOpen={params.modal === "new"}
        title="Map lecture hall"
      >
        <form action={createLectureHallAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          {params.error && errorMessages[params.error] ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
              {errorMessages[params.error]}
            </p>
          ) : null}
          <LectureHallFields />
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full" type="submit">
              Save lecture hall
            </Button>
          </div>
        </form>
      </FormModal>

      {editHall ? (
        <FormModal
          className="sm:max-w-3xl"
          description={editHall.name}
          isOpen={params.modal === "edit"}
          title="Edit lecture hall"
        >
          <div className="grid gap-6 pt-2 lg:grid-cols-[1fr_220px]">
            <form action={updateLectureHallAction} className="grid gap-4 sm:grid-cols-2">
              <input name="lectureHallId" type="hidden" value={editHall.id} />
              {params.error && errorMessages[params.error] ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
                  {errorMessages[params.error]}
                </p>
              ) : null}
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
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full" type="submit">
                  Save changes
                </Button>
              </div>
            </form>

            <Card className="border-destructive/25 bg-destructive/5">
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="text-sm font-bold text-destructive">Delete hall</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    If this hall is already linked to sessions, it will be archived
                    to preserve attendance history.
                  </p>
                </div>
                <form action={deleteLectureHallAction}>
                  <input name="lectureHallId" type="hidden" value={editHall.id} />
                  <ConfirmSubmitButton
                    className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    message="Delete this lecture hall mapping?"
                  >
                    Delete hall
                  </ConfirmSubmitButton>
                </form>
              </CardContent>
            </Card>
          </div>
        </FormModal>
      ) : null}
    </>
  );
}

function LectureHallFields({
  hall,
}: {
  hall?: typeof lectureHalls.$inferSelect;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Hall name</Label>
        <Input defaultValue={hall?.name ?? ""} id="name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Hall code</Label>
        <Input
          className="uppercase-input"
          defaultValue={hall?.code ?? ""}
          id="code"
          name="code"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="building">Building</Label>
        <Input defaultValue={hall?.building ?? ""} id="building" name="building" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="roomNumber">Room number</Label>
        <Input defaultValue={hall?.roomNumber ?? ""} id="roomNumber" name="roomNumber" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="geofenceRadiusMeters">Attendance radius</Label>
        <Input
          defaultValue={hall?.geofenceRadiusMeters ?? 30}
          id="geofenceRadiusMeters"
          min={10}
          name="geofenceRadiusMeters"
          required
          type="number"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maxAcceptedAccuracyMeters">GPS accuracy limit</Label>
        <Input
          defaultValue={hall?.maxAcceptedAccuracyMeters ?? 50}
          id="maxAcceptedAccuracyMeters"
          min={10}
          name="maxAcceptedAccuracyMeters"
          required
          type="number"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Hall GPS capture</Label>
        <LocationFields
          accuracyName="locationAccuracyMeters"
          allowManualEntry
          initialAccuracy={hall?.locationAccuracyMeters}
          initialLatitude={hall?.latitude}
          initialLongitude={hall?.longitude}
          initialMessage={
            hall
              ? "Saved lecture hall GPS is loaded. Capture again only if the hall marker needs to be updated."
              : "Capture this device's GPS while standing inside the lecture hall, then accept the coordinate."
          }
          latitudeName="latitude"
          longitudeName="longitude"
          maxAccuracyInputId="maxAcceptedAccuracyMeters"
          requireAcceptance
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={hall?.notes ?? ""} id="notes" name="notes" rows={3} />
      </div>
    </>
  );
}
