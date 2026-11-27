"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tuitionhub:quest-muted";

let sharedCtx: AudioContext | null = null;
let mutedMem = false;

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return mutedMem;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (readMuted()) return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = new Ctor();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function note(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  options: {
    type?: OscillatorType;
    peak?: number;
    slideTo?: number;
  } = {},
) {
  try {
    const start = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.type ?? "triangle";
    osc.frequency.setValueAtTime(freq, start);
    if (options.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        options.slideTo,
        start + duration * 0.85,
      );
    }
    const peak = options.peak ?? 0.12;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // Audio synthesis must never interrupt gameplay.
  }
}

export const questSfx = {
  /** Soft wooden button / option tap */
  tap() {
    const ctx = getCtx();
    if (!ctx) return;
    note(ctx, 540, 0, 0.055, { type: "triangle", peak: 0.09, slideTo: 300 });
  },

  /** Crisp switch flip / block reorder click */
  flip(on = true) {
    const ctx = getCtx();
    if (!ctx) return;
    note(ctx, on ? 440 : 640, 0, 0.065, {
      type: "sine",
      peak: 0.11,
      slideTo: on ? 760 : 380,
    });
  },

  /** Entering a themed island station */
  stationOpen() {
    const ctx = getCtx();
    if (!ctx) return;
    [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
      note(ctx, f, i * 0.065, 0.2, { type: "triangle", peak: 0.11 });
    });
  },

  /** Starting a checkpoint level */
  levelStart() {
    const ctx = getCtx();
    if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      note(ctx, f, i * 0.055, 0.16, { type: "triangle", peak: 0.11 });
    });
  },

  /** Cheerful marimba chime on correct answer; rises gently with streak! */
  correct(streak = 1) {
    const ctx = getCtx();
    if (!ctx) return;
    const semitones = Math.min(4, Math.max(0, streak - 1));
    const ratio = 2 ** (semitones / 12);
    [523.25, 659.25, 783.99, 1046.5].forEach((base, i) => {
      note(ctx, base * ratio, i * 0.065, 0.22, {
        type: "triangle",
        peak: i === 3 ? 0.15 : 0.11,
      });
    });
  },

  /** Gentle, stress-free warm marimba tone when learning from a wrong try */
  gentleMiss() {
    const ctx = getCtx();
    if (!ctx) return;
    note(ctx, 329.63, 0, 0.14, { type: "sine", peak: 0.09 });
    note(ctx, 293.66, 0.1, 0.2, { type: "sine", peak: 0.08 });
  },

  /** Treasure chest & 80%+ checkpoint victory fanfare! */
  victory() {
    const ctx = getCtx();
    if (!ctx) return;
    const melody = [
      { f: 392.0, t: 0, d: 0.12 },
      { f: 523.25, t: 0.09, d: 0.12 },
      { f: 659.25, t: 0.18, d: 0.12 },
      { f: 783.99, t: 0.27, d: 0.16 },
      { f: 1046.5, t: 0.39, d: 0.42 },
    ];
    for (const m of melody) {
      note(ctx, m.f, m.t, m.d, { type: "triangle", peak: 0.14 });
    }
    // Warm harmonic fifth on the final chord
    note(ctx, 783.99, 0.39, 0.42, { type: "sine", peak: 0.09 });
  },

  /** Encouraging upward motif when finishing under 80% */
  encourage() {
    const ctx = getCtx();
    if (!ctx) return;
    note(ctx, 392.0, 0, 0.14, { type: "triangle", peak: 0.1 });
    note(ctx, 523.25, 0.12, 0.22, { type: "triangle", peak: 0.11 });
  },
};

export function useQuestAudio() {
  const [muted, setMuted] = useState<boolean>(false);

  useEffect(() => {
    setMuted(readMuted());
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedMem = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      if (!next) {
        // Play a tiny cheerful confirmation pop when unmuting
        setTimeout(() => questSfx.tap(), 20);
      }
      return next;
    });
  }, []);

  return { muted, toggleMute };
}
