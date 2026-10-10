import * as Tone from "tone";
export interface AudioEngine {
  playChord(notes: number[]): Promise<boolean>;
  playArpeggio(notes: number[]): Promise<boolean>;
  playReference(): Promise<boolean>;
  setVolume(value: number): void;
  stop(): void;
  dispose(): void;
}
/** Each playback owns a disposable voice bank, so scheduled notes cannot survive stop(). */
export class ToneAudioEngine implements AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private revision = 0;
  private volume = 0.5;
  private timers: ReturnType<typeof setTimeout>[] = [];
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.synth) this.synth.volume.value = this.decibels();
  }
  private decibels() {
    return this.volume === 0 ? -Infinity : 20 * Math.log10(this.volume) - 14;
  }
  stop() {
    this.revision++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.synth?.dispose();
    this.synth = null;
  }
  dispose() {
    this.stop();
  }
  private async play(notes: number[], arpeggio: boolean): Promise<boolean> {
    this.stop();
    const revision = this.revision;
    await Tone.start();
    if (revision !== this.revision) return false;
    if (Tone.getContext().state !== "running")
      throw new Error("AudioContext is not running");
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.015, decay: 0.3, sustain: 0.65, release: 0.5 },
      volume: this.decibels(),
    }).toDestination();
    this.synth = synth;
    const frequencies = [...notes]
      .sort((a, b) => a - b)
      .map((midi) => 440 * 2 ** ((midi - 69) / 12));
    if (arpeggio) {
      frequencies.forEach((frequency, index) => {
        const trigger = () => {
          if (revision === this.revision)
            synth.triggerAttackRelease(frequency, 0.4);
        };
        if (index === 0) trigger();
        else this.timers.push(setTimeout(trigger, index * 500));
      });
    } else synth.triggerAttackRelease(frequencies, 1.5);
    this.timers.push(
      setTimeout(
        () => {
          if (revision === this.revision) this.stop();
        },
        arpeggio ? frequencies.length * 500 + 500 : 2200,
      ),
    );
    return true;
  }
  playChord(notes: number[]) {
    return this.play(notes, false);
  }
  playArpeggio(notes: number[]) {
    return this.play(notes, true);
  }
  playReference() {
    return this.play([60], false);
  }
}
