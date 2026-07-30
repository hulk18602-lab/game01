import type { AudioSettings, PresentationCue } from "../game/CampaignSession.js";

const melody = Object.freeze([
  261.63, 329.63, 392, 329.63,
  293.66, 349.23, 440, 349.23,
  246.94, 293.66, 392, 293.66,
  220, 277.18, 329.63, 392,
]);

/**
 * Original procedural soundtrack and sound effects.
 * The AudioContext is created only after a user gesture to respect autoplay rules.
 */
export class AudioManager {
  #settings: AudioSettings;
  #context: AudioContext | null = null;
  #musicGain: GainNode | null = null;
  #sfxGain: GainNode | null = null;
  #nextNote = 0;
  #noteIndex = 0;
  #lastShot = -1;
  #lastHit = -1;
  #lastDeath = -1;

  constructor(settings: AudioSettings) {
    this.#settings = { ...settings };
  }

  applySettings(settings: AudioSettings): void {
    this.#settings = { ...settings };
    const now = this.#context?.currentTime ?? 0;
    this.#musicGain?.gain.setTargetAtTime(
      settings.enabled ? settings.musicVolume : 0,
      now,
      0.025,
    );
    this.#sfxGain?.gain.setTargetAtTime(
      settings.enabled ? settings.sfxVolume : 0,
      now,
      0.025,
    );
  }

  async unlock(): Promise<void> {
    if (!this.#settings.enabled || typeof window.AudioContext !== "function") return;
    if (!this.#context) this.#createContext();
    if (this.#context?.state === "suspended") {
      try {
        await this.#context.resume();
      } catch {
        // Audio may remain unavailable under browser or OS policy; gameplay continues.
      }
    }
  }

  update(): void {
    const context = this.#context;
    if (!context || context.state !== "running" || !this.#settings.enabled) return;
    if (this.#settings.musicVolume <= 0) return;
    if (this.#nextNote < context.currentTime) this.#nextNote = context.currentTime + 0.03;
    while (this.#nextNote < context.currentTime + 0.28) {
      const frequency = melody[this.#noteIndex % melody.length]!;
      this.#tone(frequency, 0.27, "triangle", 0.055, frequency * 0.997, this.#musicGain, this.#nextNote);
      if (this.#noteIndex % 4 === 0) {
        this.#tone(frequency / 4, 0.72, "sine", 0.045, frequency / 4, this.#musicGain, this.#nextNote);
      }
      this.#noteIndex += 1;
      this.#nextNote += 0.29;
    }
  }

  play(cue: PresentationCue): void {
    const context = this.#context;
    if (!context || context.state !== "running" || !this.#settings.enabled || !this.#sfxGain) return;
    const now = context.currentTime;

    if (cue.type === "shot") {
      if (now - this.#lastShot < 0.028) return;
      this.#lastShot = now;
      const cold = cue.damageType === "cold";
      this.#tone(cold ? 760 : 410, 0.075, cold ? "sine" : "square", 0.07, cold ? 560 : 230, this.#sfxGain, now);
      return;
    }
    if (cue.type === "hit") {
      if (now - this.#lastHit < 0.038) return;
      this.#lastHit = now;
      const heavy = (cue.damage ?? 0) >= 80 || (cue.areaRadius ?? 0) >= 60;
      this.#tone(heavy ? 92 : 185, heavy ? 0.24 : 0.09, heavy ? "sawtooth" : "triangle", heavy ? 0.14 : 0.055, 52, this.#sfxGain, now);
      return;
    }
    if (cue.type === "enemy-death") {
      if (now - this.#lastDeath < 0.07) return;
      this.#lastDeath = now;
      this.#tone(235, 0.2, "triangle", 0.08, 72, this.#sfxGain, now);
      return;
    }
    if (cue.type === "boss-phase") {
      this.#tone(82, 0.65, "sawtooth", 0.16, 164, this.#sfxGain, now);
      return;
    }
    if (cue.type === "build") {
      this.#tone(330, 0.12, "triangle", 0.09, 523.25, this.#sfxGain, now);
      this.#tone(523.25, 0.16, "sine", 0.06, 659.25, this.#sfxGain, now + 0.08);
      return;
    }
    if (cue.type === "upgrade") {
      this.#tone(392, 0.16, "triangle", 0.08, 659.25, this.#sfxGain, now);
      this.#tone(659.25, 0.2, "sine", 0.06, 783.99, this.#sfxGain, now + 0.1);
      return;
    }
    if (cue.type === "sell") {
      this.#tone(520, 0.16, "sine", 0.07, 300, this.#sfxGain, now);
      return;
    }
    if (cue.type === "wave") {
      this.#tone(196, 0.28, "sawtooth", 0.09, 392, this.#sfxGain, now);
      return;
    }
    const won = cue.type === "victory";
    this.#tone(won ? 392 : 146.83, 0.7, won ? "triangle" : "sawtooth", 0.11, won ? 783.99 : 73.42, this.#sfxGain, now);
    if (won) this.#tone(523.25, 0.8, "sine", 0.08, 1046.5, this.#sfxGain, now + 0.18);
  }

  destroy(): void {
    const context = this.#context;
    this.#context = null;
    this.#musicGain = null;
    this.#sfxGain = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }

  #createContext(): void {
    const context = new window.AudioContext();
    const musicGain = context.createGain();
    const sfxGain = context.createGain();
    musicGain.gain.value = this.#settings.enabled ? this.#settings.musicVolume : 0;
    sfxGain.gain.value = this.#settings.enabled ? this.#settings.sfxVolume : 0;
    musicGain.connect(context.destination);
    sfxGain.connect(context.destination);
    this.#context = context;
    this.#musicGain = musicGain;
    this.#sfxGain = sfxGain;
    this.#nextNote = context.currentTime + 0.03;
  }

  #tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFrequency: number,
    output: GainNode | null,
    startsAt: number,
  ): void {
    const context = this.#context;
    if (!context || !output) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), startsAt + duration);
    envelope.gain.setValueAtTime(0.0001, startsAt);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startsAt + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.02);
  }
}

export default AudioManager;
