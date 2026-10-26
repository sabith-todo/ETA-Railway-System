/**
 * Web Audio API Engine for Indian Railways Station Arrival Chime & Wake-Up Alarm.
 * Synthesizes the authentic 3-note chime (F4 -> A4 -> C5) with warm harmonics,
 * device vibration, and desktop notifications without requiring external audio assets.
 */

class StationAlarmEngine {
  private audioCtx: AudioContext | null = null;
  private isLooping = false;
  private loopIntervalId: any = null;
  private volume = 0.85;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes a single bell tone with harmonic richness and smooth exponential decay.
   */
  private playTone(freq: number, startTime: number, duration: number, gainNode: GainNode, ctx: AudioContext) {
    // Primary harmonic
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, startTime);

    // Subtle overtone (chime bell character)
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.001, startTime);
    // Smooth bell strike attack
    toneGain.gain.exponentialRampToValueAtTime(0.6 * this.volume, startTime + 0.03);
    // Exponential ring-down decay
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(toneGain);
    osc2.connect(toneGain);
    toneGain.connect(gainNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  /**
   * Plays the authentic 3-note Indian Railways announcement chime sequence:
   * 1. F4 (349.23 Hz)
   * 2. A4 (440.00 Hz)
   * 3. C5 (523.25 Hz)
   */
  public playStationChime(): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime + 0.05;
      // F4 note
      this.playTone(349.23, now, 0.35, masterGain, ctx);
      // A4 note
      this.playTone(440.00, now + 0.30, 0.35, masterGain, ctx);
      // C5 note (held longer with rich resonance)
      this.playTone(523.25, now + 0.60, 0.85, masterGain, ctx);

      // Trigger mobile vibration in tandem with chime notes
      this.vibrate([200, 100, 200, 100, 500]);

      setTimeout(() => {
        resolve();
      }, 1500);
    });
  }

  /**
   * Starts looping the waking alarm until stopped by the passenger.
   */
  public startAlarmLoop(volume = 0.85) {
    this.volume = Math.max(0.1, Math.min(1.0, volume));
    if (this.isLooping) return;
    this.isLooping = true;

    // Play immediately
    this.playStationChime();

    // Repeat every 2.4 seconds
    this.loopIntervalId = setInterval(() => {
      if (!this.isLooping) {
        clearInterval(this.loopIntervalId);
        return;
      }
      this.playStationChime();
    }, 2400);
  }

  /**
   * Stops the ongoing waking alarm sound loop.
   */
  public stopAlarmLoop() {
    this.isLooping = false;
    if (this.loopIntervalId) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
    }
  }

  /**
   * Checks whether the alarm is currently ringing.
   */
  public isRinging(): boolean {
    return this.isLooping;
  }

  /**
   * Sets volume multiplier (0.0 to 1.0).
   */
  public setVolume(v: number) {
    this.volume = Math.max(0.1, Math.min(1.0, v));
  }

  /**
   * Device vibration for mobile phones.
   */
  public vibrate(pattern: number[] = [400, 200, 400, 200, 600]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore devices without vibration support
      }
    }
  }

  /**
   * Requests browser notification permission.
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    }
    return false;
  }

  /**
   * Sends desktop notification.
   */
  public sendNotification(title: string, body: string) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          requireInteraction: true,
        });
      } catch {
        // Fallback gracefully
      }
    }
  }
}

export const alarmEngine = new StationAlarmEngine();
