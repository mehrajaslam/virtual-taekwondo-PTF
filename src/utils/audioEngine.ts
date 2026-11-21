import { InstructorGender } from '../types/taekwondo';

class TaekwondoAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private voiceEnabled = true;
  private speechListener: ((caption: string | null) => void) | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopVoice();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.stopVoice();
    }
  }

  isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  onSpeechCaption(cb: ((caption: string | null) => void) | null) {
    this.speechListener = cb;
  }

  stopVoice() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser speech errors
      }
    }
    this.speechListener?.(null);
  }

  speakCoach(text: string, gender: InstructorGender = 'male', rate = 1.02) {
    this.speechListener?.(text);
    if (this.muted || !this.voiceEnabled || typeof window === 'undefined') {
      return;
    }
    if (!('speechSynthesis' in window)) {
      return;
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const englishVoices = voices.filter((v) =>
        v.lang.toLowerCase().startsWith('en'),
      );

      if (englishVoices.length > 0) {
        const preferred =
          gender === 'female'
            ? englishVoices.find((v) =>
                /female|samantha|victoria|karen|zira|aria|jenny|google uk english female/i.test(
                  v.name,
                ),
              )
            : englishVoices.find((v) =>
                /male|daniel|david|alex|mark|guy|ryan|google uk english male/i.test(
                  v.name,
                ),
              );
        utterance.voice = preferred ?? englishVoices[0];
      }

      utterance.pitch = gender === 'female' ? 1.12 : 0.92;
      utterance.rate = rate;
      utterance.volume = 0.95;

      utterance.onend = () => {
        this.speechListener?.(null);
      };
      utterance.onerror = () => {
        this.speechListener?.(null);
      };

      synth.speak(utterance);
    } catch {
      // Ignore synthesis restrictions before gesture
    }
  }

  playWhoosh() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.22;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + duration * 0.65);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, now + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  playImpactSnap() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(1046.5, now);
    chimeGain.gain.setValueAtTime(0.05, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(now);
    chime.stop(now + 0.26);
  }

  playScoreChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.11, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.23);
    });
  }

  playDrillCue(isFinal = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 660, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.35 : 0.14));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.36 : 0.15));
  }
}

export const audioEngine = new TaekwondoAudioEngine();
