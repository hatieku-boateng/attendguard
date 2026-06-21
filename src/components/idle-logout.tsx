"use client";

import { useEffect } from "react";

const idleLogoutMs = 30 * 60 * 1000;

export function IdleLogout() {
  useEffect(() => {
    let timeoutId: number | null = null;

    function clearTimer() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }

    function resetTimer() {
      clearTimer();
      timeoutId = window.setTimeout(() => {
        window.location.assign("/logout?reason=idle");
      }, idleLogoutMs);
    }

    const events = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];

    resetTimer();
    events.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    return () => {
      clearTimer();
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, []);

  return null;
}
