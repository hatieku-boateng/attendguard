"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";

type QrResponse = {
  token: string;
  refreshAt: number;
  acceptedUntil: number;
  rotationSeconds: number;
  serverTime: number;
};

export function RotatingAttendanceQr({ sessionId }: { sessionId: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<QrResponse | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadQr() {
      try {
        const response = await fetch(`/api/lecturer/sessions/${sessionId}/qr`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as QrResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to generate the attendance QR code.");
        }

        if (cancelled) return;
        const localDeadline = Date.now() + Math.max(0, payload.refreshAt - payload.serverTime);
        setData(payload);
        setDeadline(localDeadline);
        setSecondsLeft(Math.max(1, Math.ceil((localDeadline - Date.now()) / 1000)));
        setError(null);
        refreshTimer = setTimeout(() => void loadQr(), Math.max(500, localDeadline - Date.now() + 120));
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to refresh the QR code.");
        refreshTimer = setTimeout(() => void loadQr(), 3000);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQr();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [refreshKey, sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 200);

    return () => clearInterval(timer);
  }, [deadline]);

  async function enterFullscreen() {
    await panelRef.current?.requestFullscreen?.();
  }

  return (
    <div
      className="flex min-h-[520px] flex-col items-center justify-center bg-background p-5 sm:p-8"
      ref={panelRef}
    >
      <div className="mb-5 flex w-full max-w-xl items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Live attendance code
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Refreshes every {data?.rotationSeconds ?? 5} seconds
          </p>
        </div>
        <Button
          aria-label="Show QR code fullscreen"
          onClick={enterFullscreen}
          size="icon"
          title="Show fullscreen"
          type="button"
          variant="outline"
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <div className="flex aspect-square w-full max-w-[420px] items-center justify-center border border-border bg-white p-5 shadow-sm sm:p-7">
        {data?.token ? (
          <QRCodeSVG
            bgColor="#ffffff"
            className="h-auto w-full"
            fgColor="#111827"
            level="M"
            marginSize={2}
            size={420}
            title="Rotating attendance QR code"
            value={data.token}
          />
        ) : (
          <QrCode className="size-24 text-muted-foreground/20" />
        )}
      </div>

      <div className="mt-6 w-full max-w-[420px]">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">Next code</span>
          <span className="tabular-nums text-foreground">
            {loading ? "Loading" : `${secondsLeft}s`}
          </span>
        </div>
        <div className="h-2 overflow-hidden bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{
              width: `${Math.min(100, Math.max(0, (secondsLeft / (data?.rotationSeconds ?? 5)) * 100))}%`,
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="mt-5 flex w-full max-w-[420px] items-center justify-between gap-3 border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive">
          <span>{error}</span>
          <Button
            aria-label="Retry QR code"
            onClick={() => {
              setLoading(true);
              setRefreshKey((key) => key + 1);
            }}
            size="icon"
            title="Retry"
            type="button"
            variant="ghost"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
