"use client";

import { useEffect, useMemo, useState } from "react";

import { LocationFields } from "@/components/location-fields";
import { Label } from "@/components/ui/label";

export type PreviousSessionLocationOption = {
  id: string;
  title: string;
  opensAtLabel: string;
  latitude: string | number;
  longitude: string | number;
  accuracy: string | number;
  courseLabel?: string;
  radiusMeters?: number | null;
  maxAccuracyMeters?: number | null;
};

function setNumberInputValue(inputId: string | undefined, value: number | null | undefined) {
  if (!inputId || value === null || value === undefined) {
    return;
  }

  const input = document.getElementById(inputId) as HTMLInputElement | null;

  if (!input) {
    return;
  }

  input.value = String(value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function SessionLocationFields({
  previousLocations,
  latitudeName,
  longitudeName,
  accuracyName,
  maxAccuracyInputId,
  radiusInputId,
}: {
  previousLocations: PreviousSessionLocationOption[];
  latitudeName: string;
  longitudeName: string;
  accuracyName: string;
  maxAccuracyInputId: string;
  radiusInputId?: string;
}) {
  const [selectedId, setSelectedId] = useState("");

  const safeLocations = useMemo(
    () =>
      previousLocations.filter(
        (location) =>
          Number.isFinite(Number(location.latitude)) &&
          Number.isFinite(Number(location.longitude)) &&
          Number.isFinite(Number(location.accuracy)),
      ),
    [previousLocations],
  );
  const selectedLocation =
    safeLocations.find((location) => location.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    setNumberInputValue(radiusInputId, selectedLocation.radiusMeters);
    setNumberInputValue(maxAccuracyInputId, selectedLocation.maxAccuracyMeters);
  }, [maxAccuracyInputId, radiusInputId, selectedLocation]);

  return (
    <div className="space-y-3">
      {safeLocations.length > 0 ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label htmlFor="previousSessionLocation">
              Reuse previous session GPS
            </Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Select a trusted GPS capture when this session is in the same classroom.
              Leave this on fresh capture when the class location has changed.
            </p>
          </div>
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
            id="previousSessionLocation"
            onChange={(event) => setSelectedId(event.target.value)}
            value={selectedId}
          >
            <option value="">Capture a fresh location</option>
            {safeLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.courseLabel ? `${location.courseLabel} - ` : ""}
                {location.title} ({location.opensAtLabel}) -{" "}
                {Math.round(Number(location.accuracy))}m accuracy
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <LocationFields
        key={selectedLocation?.id ?? "fresh-location"}
        accuracyName={accuracyName}
        allowManualEntry
        initialAccuracy={selectedLocation?.accuracy}
        initialLatitude={selectedLocation?.latitude}
        initialLongitude={selectedLocation?.longitude}
        initialMessage={
          selectedLocation
            ? `Reusing GPS from ${selectedLocation.title}. Capture again only if the class location has changed.`
            : undefined
        }
        latitudeName={latitudeName}
        longitudeName={longitudeName}
        maxAccuracyInputId={maxAccuracyInputId}
        requireAcceptance
      />
    </div>
  );
}
