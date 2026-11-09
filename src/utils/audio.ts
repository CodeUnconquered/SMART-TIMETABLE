/**
 * Smart Remind Audible Engine using Web Audio API
 * Provides both short notification chimes and continuous ~10-second audible alarms with active stop controls.
 * Works 100% offline with zero external audio assets or audio file dependencies.
 */

let audioCtx: AudioContext | null = null;
let activeAlarmTimer: ReturnType<typeof setInterval> | null = null;
let activeAlarmTimeout: ReturnType<typeof setTimeout> | null = null;
let isAlarmCurrentlyPlaying = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Trigger device vibration if supported by browser/Android
 */
export function triggerVibration(pattern: number[] = [300, 150, 300, 150, 400]): void {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not permitted or ignored
    }
  }
}

/**
 * Cancel ongoing vibration
 */
export function stopVibration(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
}

/**
 * Play a single short notification sound
 */
export function playNotificationSound(type: 'alarm' | 'chime' | 'pulse' | 'subtle' = 'chime'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'alarm') {
      // High-attention dual urgent beep
      [880, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.28);
      });
    } else if (type === 'chime') {
      // Pleasant 3-note ascending melodic chime (E5, G#5, B5)
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.5);
      });
    } else if (type === 'pulse') {
      // Dual-tone urgent alert pulse for imminent classes (5 min reminder)
      const freqs = [880, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.4);
      });
    } else {
      // Subtle single soft bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.warn('Could not play synthesized audio chime:', err);
  }
}

/**
 * Start a continuous ~10-second audible alarm sequence.
 * Repeats melodic pulses every 750ms with vibration until stopped or 10 seconds elapse.
 * Returns a cleanup/stop function.
 */
export function startProlongedAlarm(
  durationSeconds: number = 10,
  onStop?: () => void
): () => void {
  // If an alarm is already sounding, stop it first
  stopProlongedAlarm();

  isAlarmCurrentlyPlaying = true;

  // Play immediately
  playAlarmBurst();
  triggerVibration([300, 150, 300, 150, 400]);

  // Repeat pulse every 750ms
  activeAlarmTimer = setInterval(() => {
    if (!isAlarmCurrentlyPlaying) return;
    playAlarmBurst();
    triggerVibration([250, 100, 250]);
  }, 750);

  // Auto-terminate after specified duration (default 10s)
  activeAlarmTimeout = setTimeout(() => {
    stopProlongedAlarm();
    if (onStop) onStop();
  }, durationSeconds * 1000);

  return stopProlongedAlarm;
}

/**
 * Stop active prolonged alarm sound and vibration immediately
 */
export function stopProlongedAlarm(): void {
  isAlarmCurrentlyPlaying = false;
  if (activeAlarmTimer) {
    clearInterval(activeAlarmTimer);
    activeAlarmTimer = null;
  }
  if (activeAlarmTimeout) {
    clearTimeout(activeAlarmTimeout);
    activeAlarmTimeout = null;
  }
  stopVibration();
}

/**
 * Check if the alarm is currently sounding
 */
export function isAlarmRinging(): boolean {
  return isAlarmCurrentlyPlaying;
}

/**
 * Internal single alarm cycle burst (two alternating high-clarity frequencies)
 */
function playAlarmBurst(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Energetic dual alarm chime: 784 Hz (G5) then 1046.5 Hz (C6)
    const tones = [
      { freq: 783.99, delay: 0 },
      { freq: 1046.5, delay: 0.16 },
      { freq: 1318.51, delay: 0.32 }
    ];

    tones.forEach(tone => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.freq, now + tone.delay);

      gain.gain.setValueAtTime(0.0001, now + tone.delay);
      gain.gain.exponentialRampToValueAtTime(0.35, now + tone.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.delay + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.delay);
      osc.stop(now + tone.delay + 0.25);
    });
  } catch (err) {
    console.warn('Alarm burst error:', err);
  }
}
