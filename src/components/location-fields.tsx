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

const freshReadingOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000,
};

const stalePositionGraceMs = 5000;
const fastFreshPollMs = 1500;
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

type AcceptedLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

type BestLocation = AcceptedLocation & {
  timestamp: number;
};

type ProximityTarget = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type LocationValidity = {
  accuracyOk: boolean;
  distanceMeters: number | null;
  proximityOk: boolean;
  ready: boolean;
};

function calculateDistanceMeters({
  fromLatitude,
  fromLongitude,
  toLatitude,
  toLongitude,
}: {
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const startLatitude = toRadians(fromLatitude);
  const endLatitude = toRadians(toLatitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function LocationFields({
  latitudeName,
  longitudeName,
  accuracyName,
  maxAccuracyInputId,
  maxAccuracyMeters,
  onLocationValidityChange,
  proximityTarget,
  requireAcceptance = false,
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
  onLocationValidityChange?: (validity: LocationValidity) => void;
  proximityTarget?: ProximityTarget | null;
  requireAcceptance?: boolean;
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
  const [permissionState, setPermissionState] = useState<
    "unknown" | "prompt" | "granted" | "denied" | "unsupported"
  >("unknown");
  const [manualMode, setManualMode] = useState(false);
  const [manualLocation, setManualLocation] = useState({
    lat: "",
    lng: "",
    accuracy: "",
  });
  const [acceptedLocation, setAcceptedLocation] = useState<AcceptedLocation | null>(
    requireAcceptance && hasInitialLocation
      ? {
          lat: parsedInitialLatitude,
          lng: parsedInitialLongitude,
          accuracy: parsedInitialAccuracy,
        }
      : null,
  );

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    async function readPermissionState() {
      if (!navigator.permissions?.query) {
        setPermissionState("unsupported");
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        setPermissionState(permissionStatus.state);
        permissionStatus.onchange = () => {
          if (permissionStatus) {
            setPermissionState(permissionStatus.state);
          }
        };
      } catch {
        setPermissionState("unsupported");
      }
    }

    readPermissionState();

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }

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

  function getDistanceFromTarget(locationToCheck: { lat: number; lng: number }) {
    if (!proximityTarget) {
      return null;
    }

    return calculateDistanceMeters({
      fromLatitude: proximityTarget.latitude,
      fromLongitude: proximityTarget.longitude,
      toLatitude: locationToCheck.lat,
      toLongitude: locationToCheck.lng,
    });
  }

  function isWithinProximity(locationToCheck: { lat: number; lng: number }) {
    const distance = getDistanceFromTarget(locationToCheck);

    return distance === null || distance <= proximityTarget!.radiusMeters;
  }

  function isUsablePosition(position: GeolocationPosition) {
    const { latitude, longitude, accuracy } = position.coords;

    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Number.isFinite(accuracy) &&
      accuracy > 0 &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  function shouldUseAsBest(
    candidate: BestLocation,
    currentBest: BestLocation | null,
  ) {
    if (!currentBest) {
      return true;
    }

    if (candidate.accuracy < currentBest.accuracy) {
      return true;
    }

    return candidate.accuracy === currentBest.accuracy && candidate.timestamp > currentBest.timestamp;
  }

  function buildMessage(
    accuracy: number,
    samples: number,
    locationToCheck?: { lat: number; lng: number },
  ) {
    const maxAccuracy = getMaxAccuracy();
    const accuracyWarning =
      maxAccuracy && accuracy > maxAccuracy
        ? ` This is above the ${Math.round(maxAccuracy)}m limit; keep capture running for a better GPS lock.`
        : "";
    const distance = locationToCheck ? getDistanceFromTarget(locationToCheck) : null;
    const distanceWarning =
      distance !== null && proximityTarget
        ? distance > proximityTarget.radiusMeters
          ? ` Current distance: ${Math.round(distance)}m. Move within ${Math.round(
              proximityTarget.radiusMeters,
            )}m of the lecturer's session location.`
          : ` Current distance: ${Math.round(distance)}m within the ${Math.round(
              proximityTarget.radiusMeters,
            )}m session radius.`
        : "";

    return `Best reading: ${Math.round(accuracy)}m accuracy from ${samples} live sample${
      samples === 1 ? "" : "s"
    }.${accuracyWarning}${distanceWarning}`;
  }

  function canAcceptAccuracy(accuracy: number) {
    const maxAccuracy = getMaxAccuracy();

    return !maxAccuracy || accuracy <= maxAccuracy;
  }

  function isAcceptedLocation(locationToCheck: AcceptedLocation) {
    if (!acceptedLocation) {
      return false;
    }

    return (
      acceptedLocation.lat === locationToCheck.lat &&
      acceptedLocation.lng === locationToCheck.lng &&
      acceptedLocation.accuracy === locationToCheck.accuracy
    );
  }

  function acceptCapturedLocation() {
    if (location.status !== "captured") {
      return;
    }

    if (!canAcceptAccuracy(location.accuracy)) {
      setLocation({
        ...location,
        message: `This reading is ${Math.round(
          location.accuracy,
        )}m accurate, which is above the accepted limit. Keep capturing for a better GPS lock.`,
      });
      return;
    }

    stopLiveCapture();
    setManualMode(false);
    setAcceptedLocation({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
    });
    setLocation({
      ...location,
      message: `Accepted session coordinate locked at ${Math.round(
        location.accuracy,
      )}m accuracy.`,
    });
  }

  function acceptManualLocation() {
    const lat = Number(manualLocation.lat);
    const lng = Number(manualLocation.lng);
    const accuracy = Number(manualLocation.accuracy);

    if (
      !hasNumericValue(manualLocation.lat) ||
      !hasNumericValue(manualLocation.lng) ||
      !hasNumericValue(manualLocation.accuracy) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setLocation({
        status: "error",
        message: "Enter valid manual latitude, longitude, and accuracy before accepting.",
      });
      return;
    }

    if (!canAcceptAccuracy(accuracy)) {
      setLocation({
        status: "error",
        message: `Manual accuracy must be within ${Math.round(getMaxAccuracy() ?? 0)}m before it can be accepted.`,
      });
      return;
    }

    setAcceptedLocation({ lat, lng, accuracy });
    setLocation({
      status: "idle",
      message: `Accepted manual session coordinate locked at ${Math.round(accuracy)}m accuracy.`,
    });
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

    if (permissionState === "denied") {
      setLocation({
        status: "error",
        message:
          "Location permission is blocked for this browser. Open site settings, allow precise location access, then try again.",
      });
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
    let unusableSamples = 0;
    let best: BestLocation | null = null;

    const maxAccuracy = getMaxAccuracy();

    setLocation({
      status: "idle",
      message: maxAccuracy
        ? `Capturing this device's live GPS readings. Keep the phone or laptop still until accuracy is within ${Math.round(maxAccuracy)}m.`
        : "Capturing this device's live GPS readings. Keep the phone or laptop still at the class location. Phones usually lock faster with precise location enabled.",
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

      if (!isUsablePosition(position)) {
        unusableSamples += 1;

        if (!best) {
          setLocation({
            status: "idle",
            message: `Received ${unusableSamples} incomplete GPS reading${
              unusableSamples === 1 ? "" : "s"
            }. Waiting for latitude, longitude, and accuracy from the browser.`,
          });
        }

        return;
      }

      const capturedAccuracy = position.coords.accuracy;
      samples += 1;
      const candidate: BestLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: capturedAccuracy,
        timestamp: position.timestamp,
      };

      if (shouldUseAsBest(candidate, best)) {
        best = candidate;
      }

      const currentBest = best;

      if (!currentBest) {
        return;
      }

      setLocation({
        status: "captured",
        message: buildMessage(currentBest.accuracy, samples, currentBest),
        lat: currentBest.lat,
        lng: currentBest.lng,
        accuracy: currentBest.accuracy,
        samples,
      });

      const maxAccuracy = getMaxAccuracy();

      if (
        maxAccuracy &&
        currentBest.accuracy <= maxAccuracy &&
        isWithinProximity(currentBest)
      ) {
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
              samples < 5 ? fastFreshPollMs : lecturerFreshPollMs,
            );
          }
        },
        (error) => {
          handleError(error);

          if (activeCaptureIdRef.current === captureId) {
            freshPollTimeoutRef.current = window.setTimeout(
              requestFreshReading,
              best ? lecturerFreshPollMs : fastFreshPollMs,
            );
          }
        },
        freshReadingOptions,
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

  const effectiveLatitude = requireAcceptance
    ? acceptedLocation?.lat ?? ""
    : manualMode
      ? manualLocation.lat
      : location.status === "captured"
        ? location.lat
        : "";
  const effectiveLongitude = requireAcceptance
    ? acceptedLocation?.lng ?? ""
    : manualMode
      ? manualLocation.lng
      : location.status === "captured"
        ? location.lng
        : "";
  const effectiveAccuracy = requireAcceptance
    ? acceptedLocation?.accuracy ?? ""
    : manualMode
      ? manualLocation.accuracy
      : location.status === "captured"
        ? location.accuracy
        : "";
  const hasCompleteManualPreview =
    manualMode &&
    hasNumericValue(manualLocation.lat) &&
    hasNumericValue(manualLocation.lng);
  const previewLatitude =
    location.status === "captured"
      ? location.lat
      : hasCompleteManualPreview
        ? manualLocation.lat
        : effectiveLatitude;
  const previewLongitude =
    location.status === "captured"
      ? location.lng
      : hasCompleteManualPreview
        ? manualLocation.lng
        : effectiveLongitude;
  const mapLatitude = Number(previewLatitude);
  const mapLongitude = Number(previewLongitude);
  const hasMapCoordinates =
    hasNumericValue(previewLatitude) &&
    hasNumericValue(previewLongitude) &&
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
  const distanceFromTarget =
    hasMapCoordinates && proximityTarget
      ? calculateDistanceMeters({
          fromLatitude: proximityTarget.latitude,
          fromLongitude: proximityTarget.longitude,
          toLatitude: mapLatitude,
          toLongitude: mapLongitude,
        })
      : null;
  const accuracyOk = hasNumericValue(effectiveAccuracy)
    ? canAcceptAccuracy(Number(effectiveAccuracy))
    : false;
  const proximityOk =
    distanceFromTarget === null ||
    !proximityTarget ||
    distanceFromTarget <= proximityTarget.radiusMeters;
  const locationReady =
    hasMapCoordinates && hasNumericValue(effectiveAccuracy) && accuracyOk && proximityOk;
  const permissionMessage =
    permissionState === "denied"
      ? "Browser location access is blocked. Allow precise location for this site before capturing GPS."
      : permissionState === "prompt"
        ? "Your browser will ask for location permission when capture starts. Choose Allow and enable precise location if available."
        : permissionState === "granted"
          ? "Browser location access is enabled for this site."
          : null;

  useEffect(() => {
    onLocationValidityChange?.({
      accuracyOk,
      distanceMeters: distanceFromTarget,
      proximityOk,
      ready: locationReady,
    });
  }, [
    accuracyOk,
    distanceFromTarget,
    locationReady,
    onLocationValidityChange,
    proximityOk,
  ]);

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
      <input name={latitudeName} type="hidden" value={effectiveLatitude} />
      <input name={longitudeName} type="hidden" value={effectiveLongitude} />
      <input name={accuracyName} type="hidden" value={effectiveAccuracy} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{location.message}</p>
          {permissionMessage ? (
            <p
              className={`text-xs font-medium ${
                permissionState === "denied" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {permissionMessage}
            </p>
          ) : null}
          {location.status === "captured" ? (
            <p className="text-xs text-muted-foreground">
              Lat {location.lat.toFixed(6)}, Lng {location.lng.toFixed(6)}
            </p>
          ) : null}
          {requireAcceptance && acceptedLocation ? (
            <p className="text-xs font-medium text-primary">
              Accepted coordinate: {acceptedLocation.lat.toFixed(6)},{" "}
              {acceptedLocation.lng.toFixed(6)} ({Math.round(acceptedLocation.accuracy)}m)
            </p>
          ) : null}
          {requireAcceptance && !acceptedLocation ? (
            <p className="text-xs font-medium text-destructive">
              Accept a captured location before saving this session.
            </p>
          ) : null}
          {proximityTarget && distanceFromTarget !== null ? (
            <p
              className={`text-xs font-medium ${
                proximityOk ? "text-primary" : "text-destructive"
              }`}
            >
              Distance from session location: {Math.round(distanceFromTarget)}m /{" "}
              {Math.round(proximityTarget.radiusMeters)}m required.
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
          {requireAcceptance &&
          location.status === "captured" &&
          !isAcceptedLocation(location) ? (
            <Button
              disabled={!canAcceptAccuracy(location.accuracy)}
              onClick={acceptCapturedLocation}
              type="button"
            >
              Accept this location
            </Button>
          ) : null}
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
          {requireAcceptance ? (
            <Button onClick={acceptManualLocation} type="button" variant="outline">
              Accept manual coordinates
            </Button>
          ) : null}
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
