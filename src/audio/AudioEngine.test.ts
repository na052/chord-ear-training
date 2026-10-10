import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  start: vi.fn(),
  trigger: vi.fn(),
  dispose: vi.fn(),
  instances: [] as { volume: { value: number } }[],
}));
vi.mock("tone", () => ({
  start: mock.start,
  getContext: () => ({ state: "running" }),
  Synth: class {},
  PolySynth: class {
    volume = { value: 0 };
    constructor() {
      mock.instances.push(this);
    }
    toDestination() {
      return this;
    }
    triggerAttackRelease = mock.trigger;
    dispose = mock.dispose;
  },
}));
import { ToneAudioEngine } from "./AudioEngine";
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
it("plays simultaneous frequencies at A4=440, and holds for 1.5 seconds", async () => {
  const engine = new ToneAudioEngine();
  await engine.playChord([69, 60]);
  expect(mock.trigger).toHaveBeenCalledWith(
    [expect.closeTo(261.626, 2), 440],
    1.5,
  );
  engine.setVolume(0);
  expect(mock.instances.at(-1)?.volume.value).toBe(-Infinity);
  engine.dispose();
});
it("plays ascending notes 500 ms apart and cancels remaining notes when stopped", async () => {
  vi.useFakeTimers();
  const engine = new ToneAudioEngine();
  await engine.playArpeggio([67, 60, 64]);
  expect(mock.trigger).toHaveBeenCalledWith(expect.closeTo(261.626, 2), 0.4);
  vi.advanceTimersByTime(499);
  expect(mock.trigger).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(mock.trigger).toHaveBeenLastCalledWith(
    expect.closeTo(329.628, 2),
    0.4,
  );
  engine.stop();
  vi.runAllTimers();
  expect(mock.trigger).toHaveBeenCalledTimes(2);
  expect(mock.dispose).toHaveBeenCalled();
});
it("does not start stale playback after AudioContext initialization", async () => {
  let resolve!: () => void;
  mock.start.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const engine = new ToneAudioEngine();
  const pending = engine.playReference();
  engine.stop();
  resolve();
  expect(await pending).toBe(false);
  expect(mock.trigger).not.toHaveBeenCalled();
});
