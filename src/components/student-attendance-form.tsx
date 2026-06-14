"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

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
  const storageKey = `pu-attendance:pending-attendance:${sessionId}`;
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
      className="space-y-6"
      onSubmit={saveSubmissionBackup}
      ref={formRef}
    >
      <input name="sessionId" type="hidden" value={sessionId} />
      
      {!isOnline ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3 backdrop-blur-md">
          <WifiOff className="size-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Connection Offline</p>
            <p className="text-xs text-destructive/80 leading-relaxed">
              Your device is currently offline. Your check-in data will be saved locally. Please re-submit once your internet connection is restored.
            </p>
          </div>
        </div>
      ) : null}

      {pendingSubmission ? (
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary flex items-start gap-3 backdrop-blur-md">
          <RefreshCw className="size-5 shrink-0 mt-0.5 animate-spin-slow" />
          <div className="space-y-0.5">
            <p className="font-bold">Pending Attendance Backup</p>
            <p className="text-xs text-primary/85 leading-relaxed">
              A pending check-in from {new Date(pendingSubmission.savedAt).toLocaleString()} was recovered. Check the details and submit again.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="passkey" className="text-sm font-bold tracking-tight">Assigned passkey</Label>
        <Input
          className="font-mono text-base tracking-widest py-5 rounded-xl text-center font-bold uppercase-input"
          defaultValue={pendingSubmission?.passkey || passkey}
          id="passkey"
          key={pendingSubmission?.savedAt ?? "current-passkey"}
          name="passkey"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold tracking-tight">Current location</Label>
        <LocationFields
          accuracyName="locationAccuracy"
          initialAccuracy={pendingSubmission?.locationAccuracy}
          initialLatitude={pendingSubmission?.studentLatitude}
          initialLongitude={pendingSubmission?.studentLongitude}
          initialMessage={
            pendingSubmission
              ? `Recovered saved GPS coordinates. Capture again if you need a fresher reading within ${maxAcceptedAccuracyMeters}m.`
              : `Capture your device location. Keep GPS running until the accuracy is within ${maxAcceptedAccuracyMeters}m.`
          }
          key={pendingSubmission?.savedAt ?? "current-location"}
          latitudeName="studentLatitude"
          longitudeName="studentLongitude"
          maxAccuracyMeters={maxAcceptedAccuracyMeters}
        />
      </div>

      <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all text-sm" type="submit">
        Submit attendance check-in
      </Button>
    </form>
  );
}
