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
  stopVoiceAnnouncement();
}

/**
 * Check if the alarm is currently sounding
 */
export function isAlarmRinging(): boolean {
  return isAlarmCurrentlyPlaying;
}

/**
 * Dynamically generate spoken voice announcement text based on reminder details
 */
export function generateVoiceAnnouncementText(item: {
  title?: string;
  message?: string;
  courseCode?: string;
  type?: string;
  minutesBefore?: number;
  venue?: string;
}): string {
  const minutes = item.minutesBefore;

  // 1. Academic Class Reminders (e.g. "BCS 361 is starting in 30 minutes")
  if (item.courseCode) {
    const code = item.courseCode.trim();
    if (minutes !== undefined && minutes > 0) {
      return `${code} is starting in ${minutes} minutes.`;
    }
    return `${code} is starting now${item.venue ? ` at ${item.venue}` : ''}.`;
  }

  // 2. Personal Task Reminders (e.g. "Your personal study session starts in 10 minutes", "Your meeting is starting now")
  if (item.type === 'task' || (item.title && item.title.toUpperCase().includes('TASK'))) {
    let taskName = '';
    if (item.title) {
      // Strip leading prefixes like "TASK REMINDER:" or "PERSONAL TASK:"
      taskName = item.title
        .replace(/^(TASK\s*REMINDER|PERSONAL\s*TASK|REMINDER):\s*/i, '')
        .replace(/\s*\([^)]*\)\s*$/i, '')
        .trim();
    }
    if (!taskName && item.message) {
      const firstLine = item.message.split('\n')[0];
      taskName = firstLine.replace(/^Activity:\s*/i, '').trim();
    }
    if (!taskName) {
      taskName = 'scheduled activity';
    }

    const cleanTitle = taskName.replace(/^your\s+/i, '').trim();

    if (minutes !== undefined && minutes > 0) {
      return `Your ${cleanTitle} starts in ${minutes} minutes.`;
    }
    return `Your ${cleanTitle} is starting now.`;
  }

  // 3. General Notifications / Reminders
  if (minutes !== undefined && minutes > 0) {
    return `${item.title || 'Your reminder'} is due in ${minutes} minutes.`;
  }
  return item.title || 'You have an upcoming reminder on Smart Remind.';
}

/**
 * Speak voice announcement aloud using client Web Speech API (offline-ready, zero latency)
 */
export function speakVoiceAnnouncement(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      // Cancel previous speech to avoid overlapping queue
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.7, Math.min(1.5, rate));
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Pick a natural voice if available in the browser's voice table
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const naturalVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex'))
        ) || voices.find(v => v.lang.startsWith('en'));

        if (naturalVoice) {
          utterance.voice = naturalVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Voice Announcement Notice]', err);
      resolve();
    }
  });
}

/**
 * Stop any active spoken voice announcement immediately
 */
export function stopVoiceAnnouncement(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
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
