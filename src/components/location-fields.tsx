"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Radio, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationState =
  | { status: "idle"; message: string }
  | {
      status: "captured";
      message: string;
      lat: number;
      lng: number;
      accuracy: number;
      samples: number;
    }
  | { status: "error"; message: string };

export function LocationFields({
  latitudeName,
  longitudeName,
  accuracyName,
  maxAccuracyInputId,
  allowManualEntry = false,
}: {
  latitudeName: string;
  longitudeName: string;
  accuracyName: string;
  maxAccuracyInputId?: string;
  allowManualEntry?: boolean;
}) {
  const watchIdRef = useRef<number | null>(null);
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    message: "Location has not been captured.",
  });
  const [isWatching, setIsWatching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualLocation, setManualLocation] = useState({
    lat: "",
    lng: "",
    accuracy: "",
  });

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function getMaxAccuracy() {
    if (!maxAccuracyInputId) {
      return null;
    }

    const value = Number(
      (document.getElementById(maxAccuracyInputId) as HTMLInputElement | null)?.value,
    );

    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function buildMessage(accuracy: number, samples: number) {
    const maxAccuracy = getMaxAccuracy();
    const accuracyWarning =
      maxAccuracy && accuracy > maxAccuracy
        ? ` This is above the ${Math.round(maxAccuracy)}m limit. Move closer to the lecture area or continue capturing.`
        : "";

    return `Best reading: ${Math.round(accuracy)}m accuracy from ${samples} live sample${
      samples === 1 ? "" : "s"
    }.${accuracyWarning}`;
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "Geolocation is not available." });
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setManualMode(false);
    setIsWatching(true);
    let samples = 0;
    let best:
      | {
          lat: number;
          lng: number;
          accuracy: number;
        }
      | null = null;

    setLocation({
      status: "idle",
      message: "Capturing live GPS readings. Keep the device still near the class location.",
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const capturedAccuracy = position.coords.accuracy;
        samples += 1;

        if (!best || capturedAccuracy < best.accuracy) {
          best = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: capturedAccuracy,
          };
        }

        setLocation({
          status: "captured",
          message: buildMessage(best.accuracy, samples),
          lat: best.lat,
          lng: best.lng,
          accuracy: best.accuracy,
          samples,
        });

        const maxAccuracy = getMaxAccuracy();

        if (maxAccuracy && best.accuracy <= maxAccuracy) {
          stopLiveCapture();
        }
      },
      () => {
        setIsWatching(false);
        setLocation({
          status: "error",
          message: "Location permission was denied or unavailable.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    if (!maxAccuracyInputId) {
      window.setTimeout(() => {
        stopLiveCapture();
      }, 20000);
    }
  }

  function stopLiveCapture() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsWatching(false);
  }

  const hiddenLatitude = manualMode
    ? manualLocation.lat
    : location.status === "captured"
      ? location.lat
      : "";
  const hiddenLongitude = manualMode
    ? manualLocation.lng
    : location.status === "captured"
      ? location.lng
      : "";
  const hiddenAccuracy = manualMode
    ? manualLocation.accuracy
    : location.status === "captured"
      ? location.accuracy
      : "";

  function updateManualLocation(field: "lat" | "lng" | "accuracy", value: string) {
    setManualMode(true);
    stopLiveCapture();
    setManualLocation((current) => ({ ...current, [field]: value }));
    setLocation({
      status: "idle",
      message: "Manual GPS coordinates will be used for this session.",
    });
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <input name={latitudeName} type="hidden" value={hiddenLatitude} />
      <input name={longitudeName} type="hidden" value={hiddenLongitude} />
      <input name={accuracyName} type="hidden" value={hiddenAccuracy} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{location.message}</p>
          {location.status === "captured" ? (
            <p className="text-xs text-muted-foreground">
              Lat {location.lat.toFixed(6)}, Lng {location.lng.toFixed(6)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isWatching ? (
            <Button onClick={stopLiveCapture} type="button" variant="outline">
              <Square className="size-4" />
              Stop live capture
            </Button>
          ) : null}
          <Button onClick={captureLocation} type="button" variant="outline">
            {isWatching ? <Radio className="size-4 animate-pulse" /> : <MapPin className="size-4" />}
            {isWatching ? "Capturing..." : "Live capture"}
          </Button>
        </div>
      </div>
      {isWatching ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      ) : null}
      {allowManualEntry ? (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${latitudeName}-manual`}>Manual latitude</Label>
            <Input
              id={`${latitudeName}-manual`}
              inputMode="decimal"
              onChange={(event) => updateManualLocation("lat", event.target.value)}
              placeholder="5.603717"
              value={manualLocation.lat}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${longitudeName}-manual`}>Manual longitude</Label>
            <Input
              id={`${longitudeName}-manual`}
              inputMode="decimal"
              onChange={(event) => updateManualLocation("lng", event.target.value)}
              placeholder="-0.186964"
              value={manualLocation.lng}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${accuracyName}-manual`}>Manual accuracy</Label>
            <Input
              id={`${accuracyName}-manual`}
              inputMode="numeric"
              min={1}
              onChange={(event) => updateManualLocation("accuracy", event.target.value)}
              placeholder="10"
              type="number"
              value={manualLocation.accuracy}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
