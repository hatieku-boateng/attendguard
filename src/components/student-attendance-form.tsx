"use client";

import { useEffect, useRef, useState } from "react";

import { LocationFields } from "@/components/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PendingSubmission = {
  savedAt: string;
  passkey: string;
  studentLatitude: string;
  studentLongitude: string;
  locationAccuracy: string;
};

type CheckInAction = (formData: FormData) => void | Promise<void>;

export function StudentAttendanceForm({
  action,
  sessionId,
  passkey,
  maxAcceptedAccuracyMeters,
  result,
}: {
  action: CheckInAction;
  sessionId: string;
  passkey: string;
  maxAcceptedAccuracyMeters: number;
  result?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = `attendguard:pending-attendance:${sessionId}`;
  const [pendingSubmission, setPendingSubmission] =
    useState<PendingSubmission | null>(() => {
      if (typeof window === "undefined" || result) {
        return null;
      }

      const saved = window.localStorage.getItem(storageKey);

      if (!saved) {
        return null;
      }

      try {
        return JSON.parse(saved) as PendingSubmission;
      } catch {
        window.localStorage.removeItem(storageKey);
        return null;
      }
    });
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (result) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [result, storageKey]);

  function saveSubmissionBackup() {
    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const pending: PendingSubmission = {
      savedAt: new Date().toISOString(),
      passkey: String(formData.get("passkey") ?? ""),
      studentLatitude: String(formData.get("studentLatitude") ?? ""),
      studentLongitude: String(formData.get("studentLongitude") ?? ""),
      locationAccuracy: String(formData.get("locationAccuracy") ?? ""),
    };

    window.localStorage.setItem(storageKey, JSON.stringify(pending));
    setPendingSubmission(pending);
  }

  return (
    <form
      action={action}
      className="space-y-5"
      onSubmit={saveSubmissionBackup}
      ref={formRef}
    >
      <input name="sessionId" type="hidden" value={sessionId} />
      {!isOnline ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          You appear to be offline. Capture is saved on this device, then submit
          again when internet returns.
        </p>
      ) : null}
      {pendingSubmission ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          A pending attendance attempt from{" "}
          {new Date(pendingSubmission.savedAt).toLocaleString()} is saved on this
          device. Review the details and submit again if needed.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="passkey">Assigned passkey</Label>
        <Input
          className="font-mono"
          defaultValue={pendingSubmission?.passkey || passkey}
          id="passkey"
          key={pendingSubmission?.savedAt ?? "current-passkey"}
          name="passkey"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Current location</Label>
        <LocationFields
          accuracyName="locationAccuracy"
          initialAccuracy={pendingSubmission?.locationAccuracy}
          initialLatitude={pendingSubmission?.studentLatitude}
          initialLongitude={pendingSubmission?.studentLongitude}
          initialMessage={
            pendingSubmission
              ? `Recovered saved GPS details. Capture again if you need a fresher reading within ${maxAcceptedAccuracyMeters}m.`
              : `Capture your device location. Keep capture running until the accuracy is within ${maxAcceptedAccuracyMeters}m.`
          }
          key={pendingSubmission?.savedAt ?? "current-location"}
          latitudeName="studentLatitude"
          longitudeName="studentLongitude"
          maxAccuracyMeters={maxAcceptedAccuracyMeters}
        />
      </div>
      <Button className="w-full sm:w-auto" type="submit">
        Submit attendance
      </Button>
    </form>
  );
}
