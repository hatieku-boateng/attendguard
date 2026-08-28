import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Venue = {
  id: string;
  code: string;
  name: string;
};

type SessionDefaults = {
  title?: string;
  lectureHallId?: string | null;
  opensAt?: string;
  normalClosesAt?: string;
  finalClosesAt?: string;
};

export function AttendanceSessionFields({
  defaults,
  venues,
}: {
  defaults?: SessionDefaults;
  venues: Venue[];
}) {
  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="sessionTitle">Session title</Label>
        <Input
          defaultValue={defaults?.title ?? ""}
          id="sessionTitle"
          name="sessionTitle"
          placeholder="Week 1 lecture"
          required
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="lectureHallId">Venue</Label>
        <select
          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
          defaultValue={defaults?.lectureHallId ?? ""}
          id="lectureHallId"
          name="lectureHallId"
        >
          <option value="">No venue</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.code}: {venue.name}
            </option>
          ))}
        </select>
      </div>
      <DateTimeField defaultValue={defaults?.opensAt} id="opensAt" label="Opens at" />
      <DateTimeField
        defaultValue={defaults?.normalClosesAt}
        id="normalClosesAt"
        label="Present until"
      />
      <div className="sm:col-span-2">
        <DateTimeField
          defaultValue={defaults?.finalClosesAt}
          id="finalClosesAt"
          label="Final close"
        />
      </div>
    </>
  );
}

function DateTimeField({
  defaultValue,
  id,
  label,
}: {
  defaultValue?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input defaultValue={defaultValue} id={id} name={id} required type="datetime-local" />
    </div>
  );
}
