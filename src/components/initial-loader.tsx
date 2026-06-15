"use client";

import { useEffect, useState } from "react";

export function InitialLoader() {
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fading out slightly before unmounting
    const fadeTimer = setTimeout(() => {
      setFade(true);
    }, 500);

    const unmountTimer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!loading) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-300 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.65); }
          100% { transform: scaleX(1); }
        }
        .animate-progress-bar {
          animation: progress 2.5s infinite ease-in-out;
          transform-origin: left;
        }
      `}} />
      <div className="relative flex flex-col items-center max-w-xs text-center px-4">
        {/* Glow Effects */}
        <div className="absolute -inset-10 rounded-full bg-gradient-to-r from-primary/10 to-cyan-500/10 opacity-50 blur-2xl animate-pulse" />
        
        {/* Crest Container with Spinner Ring */}
        <div className="relative mb-6">
          {/* Rotating outer ring */}
          <div className="absolute -inset-2.5 rounded-2xl border border-dashed border-primary/40 animate-spin" style={{ animationDuration: '8s' }} />
          
          {/* Subtle pulsing outer border */}
          <div className="absolute -inset-1.5 rounded-2xl border border-primary/20 animate-pulse" />
          
          {/* The Crest itself */}
          <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-xl p-2 z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/puc-crest.jpg" 
              alt="Pentecost University Crest"
              className="size-full object-contain"
            />
          </div>
        </div>

        {/* Brand Text */}
        <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground">
          Pentecost University
        </h2>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/85">
          Attendance System
        </p>

        {/* Elegant loading progress line */}
        <div className="w-28 h-[2px] bg-muted/60 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-progress-bar" />
        </div>
      </div>
    </div>
  );
}
