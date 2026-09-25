"use client";

/**
 * Audio Notifications for Orderly Restaurant OS
 * Synthesizes high-fidelity service bell rings and alert chimes using Web Audio API.
 * Zero external audio files required, zero latency, 100% offline-ready.
 */

// Shared AudioContext instance
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn("[Orderly Audio] Could not initialize AudioContext:", err);
    return null;
  }
}

// Auto-unlock audio context on first user touch/click on the document
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => {
          document.removeEventListener("click", unlockAudio);
          document.removeEventListener("touchstart", unlockAudio);
          document.removeEventListener("keydown", unlockAudio);
        }).catch(() => {});
      }
    } catch {}
  };
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

/**
 * 1. RESTAURANT BELL RING SOUND EFFECT
 * Crisp brass counter bell chime (two rapid resonant strikes: Ding-Ding!)
 * Played when a new order is received in the restaurant dashboard or kitchen.
 */
export function playOrderReceivedBell() {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Helper to produce a realistic metallic service bell strike
    const playBellStrike = (startTime: number, pitchFreq: number) => {
      // Primary resonant tone
      const oscPrimary = ctx.createOscillator();
      const gainPrimary = ctx.createGain();

      oscPrimary.type = "sine";
      oscPrimary.frequency.setValueAtTime(pitchFreq, startTime);

      // Strike attack and long natural exponential decay
      gainPrimary.gain.setValueAtTime(0, startTime);
      gainPrimary.gain.linearRampToValueAtTime(0.4, startTime + 0.008);
      gainPrimary.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      oscPrimary.connect(gainPrimary);
      gainPrimary.connect(ctx.destination);

      oscPrimary.start(startTime);
      oscPrimary.stop(startTime + 1.2);

      // Higher metallic harmonic overtone
      const oscOvertone = ctx.createOscillator();
      const gainOvertone = ctx.createGain();

      oscOvertone.type = "triangle";
      oscOvertone.frequency.setValueAtTime(pitchFreq * 2.76, startTime);

      gainOvertone.gain.setValueAtTime(0, startTime);
      gainOvertone.gain.linearRampToValueAtTime(0.18, startTime + 0.005);
      gainOvertone.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      oscOvertone.connect(gainOvertone);
      gainOvertone.connect(ctx.destination);

      oscOvertone.start(startTime);
      oscOvertone.stop(startTime + 0.4);

      // Shimmer frequency
      const oscShimmer = ctx.createOscillator();
      const gainShimmer = ctx.createGain();

      oscShimmer.type = "sine";
      oscShimmer.frequency.setValueAtTime(pitchFreq * 4.1, startTime);

      gainShimmer.gain.setValueAtTime(0, startTime);
      gainShimmer.gain.linearRampToValueAtTime(0.09, startTime + 0.004);
      gainShimmer.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

      oscShimmer.connect(gainShimmer);
      gainShimmer.connect(ctx.destination);

      oscShimmer.start(startTime);
      oscShimmer.stop(startTime + 0.25);
    };

    // First strike (1760 Hz - A6)
    playBellStrike(now, 1760);

    // Second strike 220ms later (1975 Hz - B6) for that authentic restaurant double-ring
    playBellStrike(now + 0.22, 1975.5);

    // Subtle vibration on mobile/POS tablet
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([120, 80, 160]);
    }
  } catch (e) {
    console.warn("[Orderly Audio] Failed to play order received bell:", e);
  }
}

/**
 * 2. CUSTOMER READY RING SOUND EFFECT
 * Pleasant, celebratory melodic chime + phone vibration
 * Played on customer's phone when order status updates to "READY to serve".
 */
export function playOrderReadyRing() {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Melodic sequence: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz) -> E6 (1318.51Hz)
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.45, gain: 0.3 },
      { freq: 830.61, time: 0.16, dur: 0.45, gain: 0.32 },
      { freq: 987.77, time: 0.32, dur: 0.55, gain: 0.35 },
      { freq: 1318.51, time: 0.48, dur: 1.1, gain: 0.4 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);

      // Warm harmonic overtone for each note
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(note.freq * 2, now + note.time);

      overtoneGain.gain.setValueAtTime(0, now + note.time);
      overtoneGain.gain.linearRampToValueAtTime(note.gain * 0.25, now + note.time + 0.02);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + (note.dur * 0.6));

      overtone.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtone.start(now + note.time);
      overtone.stop(now + note.time + (note.dur * 0.6));
    });

    // Mobile Phone Vibration Pattern: Notice me, order is ready!
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([250, 100, 250, 100, 400]);
    }
  } catch (e) {
    console.warn("[Orderly Audio] Failed to play order ready ring:", e);
  }
}
