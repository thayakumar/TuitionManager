"use client";

import {useCallback, useEffect, useRef} from 'react';

/** Browsers require a user gesture before playing notification audio. */
export function useNotificationSound() {
  const audio = useRef<AudioContext | null>(null);
  const lastPlayed = useRef(-Infinity);

  useEffect(() => {
    const unlock = () => {
      try {
        if (!audio.current || audio.current.state === 'closed') audio.current = new AudioContext();
        if (audio.current.state === 'suspended') void audio.current.resume().catch(() => {});
      } catch { /* Visual alerts still work when audio is unavailable. */ }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      const context = audio.current;
      audio.current = null;
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    };
  }, []);

  return useCallback(() => {
    const context = audio.current;
    if (!context || context.state !== 'running' || document.hidden) return;
    const now = performance.now();
    if (now - lastPlayed.current < 1500) return;
    lastPlayed.current = now;
    try {
      // Quiet, short two-note chime; no downloads or external audio service.
      [660, 880].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.12;
        const tone = context.createOscillator(), gain = context.createGain();
        tone.type = 'sine';
        tone.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        tone.connect(gain);
        gain.connect(context.destination);
        tone.onended = () => { tone.disconnect(); gain.disconnect(); };
        tone.start(start);
        tone.stop(start + 0.2);
      });
    } catch { /* Audio failures must never interrupt delivery or navigation. */ }
  }, []);
}
