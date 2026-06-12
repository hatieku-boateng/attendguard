"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

type LocationState =
  | { status: "idle"; message: string }
  | { status: "captured"; message: string; lat: number; lng: number; accuracy: number }
  | { status: "error"; message: string };

export function LocationFields({
  latitudeName,
  longitudeName,
  accuracyName,
  maxAccuracyInputId,
}: {
  latitudeName: string;
  longitudeName: string;
  accuracyName: string;
  maxAccuracyInputId?: string;
}) {
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    message: "Location has not been captured.",
  });

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "Geolocation is not available." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const maxAccuracy = maxAccuracyInputId
          ? Number(
              (
                document.getElementById(maxAccuracyInputId) as HTMLInputElement | null
              )?.value,
            )
          : null;
        const capturedAccuracy = position.coords.accuracy;
        const accuracyWarning =
          maxAccuracy && capturedAccuracy > maxAccuracy
            ? ` This is above the ${Math.round(maxAccuracy)}m limit. Move closer to the lecture area or recapture before opening.`
            : "";

        setLocation({
          status: "captured",
          message: `Captured with ${Math.round(capturedAccuracy)}m accuracy.${accuracyWarning}`,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: capturedAccuracy,
        });
      },
      () => {
        setLocation({
          status: "error",
          message: "Location permission was denied or unavailable.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <input
        name={latitudeName}
        type="hidden"
        value={location.status === "captured" ? location.lat : ""}
      />
      <input
        name={longitudeName}
        type="hidden"
        value={location.status === "captured" ? location.lng : ""}
      />
      <input
        name={accuracyName}
        type="hidden"
        value={location.status === "captured" ? location.accuracy : ""}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{location.message}</p>
        <Button onClick={captureLocation} type="button" variant="outline">
          <MapPin className="size-4" />
          Capture location
        </Button>
      </div>
    </div>
  );
}
