"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Radio, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const highAccuracyOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 60000,
};

const stalePositionGraceMs = 5000;
const lecturerFreshPollMs = 3500;
const defaultAutoStopMs = 60000;

function hasNumericValue(value: number | string | null | undefined) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

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
  maxAccuracyMeters,
  allowManualEntry = false,
  autoStopAfterMs = defaultAutoStopMs,
  initialLatitude,
  initialLongitude,
  initialAccuracy,
  initialMessage,
}: {
  latitudeName: string;
  longitudeName: string;
  accuracyName: string;
  maxAccuracyInputId?: string;
  maxAccuracyMeters?: number | string | null;
  allowManualEntry?: boolean;
  autoStopAfterMs?: number | null;
  initialLatitude?: number | string | null;
  initialLongitude?: number | string | null;
  initialAccuracy?: number | string | null;
  initialMessage?: string;
}) {
  const watchIdRef = useRef<number | null>(null);
  const freshPollTimeoutRef = useRef<number | null>(null);
  const activeCaptureIdRef = useRef(0);
  const parsedInitialLatitude = Number(initialLatitude);
  const parsedInitialLongitude = Number(initialLongitude);
  const parsedInitialAccuracy = Number(initialAccuracy);
  const hasInitialLocation =
    hasNumericValue(initialLatitude) &&
    hasNumericValue(initialLongitude) &&
    hasNumericValue(initialAccuracy);
  const [location, setLocation] = useState<LocationState>({
    ...(hasInitialLocation
      ? {
          status: "captured" as const,
          message:
            initialMessage ??
            "Saved session location is loaded. Capture again only if the class location has changed.",
          lat: parsedInitialLatitude,
          lng: parsedInitialLongitude,
          accuracy: parsedInitialAccuracy,
          samples: 0,
        }
      : {
          status: "idle" as const,
          message:
            initialMessage ?? "Use live capture to read this device's current GPS location.",
        }),
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

      if (freshPollTimeoutRef.current !== null) {
        window.clearTimeout(freshPollTimeoutRef.current);
      }
    };
  }, []);

  function getMaxAccuracy() {
    if (hasNumericValue(maxAccuracyMeters)) {
      const value = Number(maxAccuracyMeters);

      return value > 0 ? value : null;
    }

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
        ? ` This is above the ${Math.round(maxAccuracy)}m limit; keep capture running for a better GPS lock.`
        : "";

    return `Best reading: ${Math.round(accuracy)}m accuracy from ${samples} live sample${
      samples === 1 ? "" : "s"
    }.${accuracyWarning}`;
  }

  function buildErrorMessage(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return "Location permission was denied. Allow precise location access in the browser and try again.";
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return "This device could not provide a reliable location. Try a phone with GPS enabled or move near a window.";
    }

    if (error.code === error.TIMEOUT) {
      return "The device is still searching for GPS. Start capture again or use a phone for a stronger location lock.";
    }

    return "Location permission was denied or unavailable.";
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "Geolocation is not available." });
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setLocation({
        status: "error",
        message: "Secure browser access is required before device GPS can be captured.",
      });
      return;
    }

    if (watchIdRef.current !== null) {
      stopLiveCapture();
    }

    const captureId = activeCaptureIdRef.current + 1;
    activeCaptureIdRef.current = captureId;
    const captureStartedAt = Date.now();
    setManualMode(false);
    setIsWatching(true);
    let samples = 0;
    let staleSamples = 0;
    let best:
      | {
          lat: number;
          lng: number;
          accuracy: number;
        }
      | null = null;

    const maxAccuracy = getMaxAccuracy();

    setLocation({
      status: "idle",
      message: maxAccuracy
        ? `Capturing this device's live GPS readings. Keep the phone or laptop still until accuracy is within ${Math.round(maxAccuracy)}m.`
        : "Capturing this device's live GPS readings. Keep the phone or laptop still at the class location.",
    });

    const handlePosition = (position: GeolocationPosition) => {
      if (activeCaptureIdRef.current !== captureId) {
        return;
      }

      if (position.timestamp < captureStartedAt - stalePositionGraceMs) {
        staleSamples += 1;

        if (!best) {
          setLocation({
            status: "idle",
            message: `Ignoring ${staleSamples} cached GPS reading${
              staleSamples === 1 ? "" : "s"
            }. Waiting for this device's current location.`,
          });
        }

        return;
      }

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
    };

    const handleError = (error: GeolocationPositionError) => {
      if (activeCaptureIdRef.current !== captureId || best) {
        return;
      }

      if (error.code === error.TIMEOUT) {
        setLocation({
          status: "idle",
          message:
            "The device is still searching for a fresh GPS lock. Keep capture running or use a phone for a stronger signal.",
        });
        return;
      }

      stopLiveCapture();
      setLocation({
        status: "error",
        message: buildErrorMessage(error),
      });
    };

    const requestFreshReading = () => {
      if (activeCaptureIdRef.current !== captureId) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePosition(position);

          if (activeCaptureIdRef.current === captureId) {
            freshPollTimeoutRef.current = window.setTimeout(
              requestFreshReading,
              lecturerFreshPollMs,
            );
          }
        },
        (error) => {
          handleError(error);

          if (activeCaptureIdRef.current === captureId) {
            freshPollTimeoutRef.current = window.setTimeout(
              requestFreshReading,
              lecturerFreshPollMs,
            );
          }
        },
        highAccuracyOptions,
      );
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        handlePosition(position);
      },
      (error) => {
        handleError(error);
      },
      highAccuracyOptions,
    );

    requestFreshReading();

    if (!getMaxAccuracy() && autoStopAfterMs !== null) {
      window.setTimeout(() => {
        if (activeCaptureIdRef.current === captureId) {
          stopLiveCapture();
        }
      }, autoStopAfterMs);
    }
  }

  function stopLiveCapture() {
    activeCaptureIdRef.current += 1;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (freshPollTimeoutRef.current !== null) {
      window.clearTimeout(freshPollTimeoutRef.current);
      freshPollTimeoutRef.current = null;
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
  const mapLatitude = Number(hiddenLatitude);
  const mapLongitude = Number(hiddenLongitude);
  const hasMapCoordinates =
    hasNumericValue(hiddenLatitude) &&
    hasNumericValue(hiddenLongitude) &&
    Number.isFinite(mapLatitude) &&
    Number.isFinite(mapLongitude) &&
    mapLatitude >= -90 &&
    mapLatitude <= 90 &&
    mapLongitude >= -180 &&
    mapLongitude <= 180;
  const mapsQuery = hasMapCoordinates
    ? `${mapLatitude.toFixed(7)},${mapLongitude.toFixed(7)}`
    : "";
  const mapsEmbedUrl = hasMapCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&z=18&output=embed`
    : "";
  const mapsOpenUrl = hasMapCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
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
            {isWatching ? "Capturing..." : "Capture device GPS"}
          </Button>
        </div>
      </div>
      {isWatching ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      ) : null}
      {allowManualEntry ? (
        <div className="space-y-3 border-t pt-4">
          <div>
            <p className="text-sm font-medium">Manual GPS override</p>
            <p className="text-xs text-muted-foreground">
              Leave these fields blank when using live device capture. They are only used if
              the lecturer intentionally enters coordinates.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${latitudeName}-manual`}>Manual latitude</Label>
              <Input
                autoComplete="off"
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
                autoComplete="off"
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
                autoComplete="off"
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
        </div>
      ) : null}
      {hasMapCoordinates ? (
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Google Maps preview</p>
              <p className="text-xs text-muted-foreground">
                Confirm that the marker sits on or very close to the lecture location.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href={mapsOpenUrl} rel="noreferrer" target="_blank">
                Open in Google Maps
              </a>
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <iframe
              className="h-64 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapsEmbedUrl}
              title="Google Maps location preview"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
