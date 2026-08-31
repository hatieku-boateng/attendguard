"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle2, RefreshCw, ScanLine, TriangleAlert } from "lucide-react";

import {
  checkInWithQrAction,
  type QrCheckInResult,
} from "@/app/student/sessions/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StudentQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<QrCheckInResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setResult(null);
    setCameraError(null);
    setCameraStarting(true);
    processingRef.current = false;

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Camera access requires a secure browser context.", "SecurityError");
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
      const readerPromise = import("@zxing/browser");
      const [stream, { BrowserQRCodeReader }] = await Promise.all([
        streamPromise,
        readerPromise,
      ]);
      streamRef.current = stream;

      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 800,
      });

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }

      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (scanResult) => {
          if (!scanResult || processingRef.current) return;

          processingRef.current = true;
          controlsRef.current?.stop();
          setCameraActive(false);

          startTransition(async () => {
            const checkInResult = await checkInWithQrAction(scanResult.getText());
            setResult(checkInResult);
          });
        },
      );

      controlsRef.current = controls;
      setCameraActive(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraError(cameraErrorMessage(error));
      setCameraActive(false);
    } finally {
      setCameraStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    void startCamera();
  }, [startCamera]);

  const successful = result?.ok === true;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative aspect-[3/4] max-h-[68vh] min-h-[420px] w-full overflow-hidden border border-border bg-black sm:aspect-[4/3]">
        <video
          aria-label="Camera preview for attendance QR scanning"
          className="h-full w-full object-cover"
          muted
          playsInline
          ref={videoRef}
        />

        {!cameraActive && !isPending ? (
          <div className="absolute inset-0 grid place-items-center bg-background px-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto flex size-16 items-center justify-center border border-primary/20 bg-primary/5 text-primary">
                <Camera className="size-7" />
              </span>
              <h2 className="mt-5 text-lg font-extrabold text-foreground">
                Scan the lecturer&apos;s QR code
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {cameraStarting
                  ? "Respond to the camera permission request from your browser."
                  : "Use the rear camera and hold the full QR code inside the frame."}
              </p>
              <Button
                className="mt-6 gap-2"
                disabled={cameraStarting}
                onClick={() => void startCamera()}
                type="button"
              >
                {cameraStarting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <ScanLine className="size-4" />
                )}
                {cameraStarting ? "Requesting camera access" : cameraError ? "Try camera again" : "Start camera"}
              </Button>
            </div>
          </div>
        ) : null}

        {cameraActive ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-8">
            <div className="relative aspect-square w-full max-w-sm border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.42)]">
              <span className="absolute left-3 right-3 top-1/2 h-0.5 animate-pulse bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            </div>
          </div>
        ) : null}

        {isPending ? (
          <div className="absolute inset-0 grid place-items-center bg-background/95 px-6 text-center">
            <div>
              <RefreshCw className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-4 text-sm font-bold text-foreground">Verifying attendance</p>
            </div>
          </div>
        ) : null}
      </div>

      {cameraActive ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-muted-foreground">
            QR codes refresh automatically. Keep the camera steady.
          </p>
          <Button onClick={stopCamera} type="button" variant="outline">
            Stop
          </Button>
        </div>
      ) : null}

      {cameraError ? (
        <ResultBanner message={cameraError} status="error" />
      ) : null}

      {result ? (
        <div>
          <ResultBanner
            message={result.message}
            sessionLabel={result.sessionLabel}
            status={successful ? "success" : "error"}
          />
          {!successful ? (
            <Button className="mt-4 w-full gap-2" onClick={() => void startCamera()} type="button">
              <RefreshCw className="size-4" />
              Scan again
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera permission is blocked for AttendGuard. Open this site in your browser settings, allow Camera access, then tap Try camera again.";
    }

    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "No suitable camera was found on this device.";
    }

    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "The camera is being used by another app. Close the other app, then try again.";
    }

    if (error.name === "SecurityError") {
      return "Camera access requires the secure AttendGuard website in a supported browser.";
    }
  }

  return "The camera could not be started. Check that this device has an available camera and try again.";
}

function ResultBanner({
  message,
  sessionLabel,
  status,
}: {
  message: string;
  sessionLabel?: string;
  status: "success" | "error";
}) {
  const Icon = status === "success" ? CheckCircle2 : TriangleAlert;

  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-3 border px-4 py-4",
        status === "success"
          ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/25 bg-destructive/5 text-destructive",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{message}</p>
        {sessionLabel ? (
          <p className="mt-1 text-xs font-semibold opacity-80">{sessionLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
