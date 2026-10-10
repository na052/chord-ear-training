export const ROOTS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;
export type Root = (typeof ROOTS)[number];
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Mode = "practice" | "test";
export const DIFFICULTIES: Record<Difficulty, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};
export const MODES: Record<Mode, string> = { practice: "練習", test: "テスト" };
export const DEFINITIONS = {
  major: {
    suffix: "",
    intervals: [0, 4, 7],
    description: "メジャー。長3度と完全5度でできた、明るい響きの三和音です。",
  },
  minor: {
    suffix: "m",
    intervals: [0, 3, 7],
    description:
      "マイナー。短3度と完全5度でできた、落ち着いた響きの三和音です。",
  },
  "7": {
    suffix: "7",
    intervals: [0, 4, 7, 10],
    description:
      "ドミナント7th。メジャーに短7度を加えた、次へ進みたくなる響きです。",
  },
  maj7: {
    suffix: "maj7",
    intervals: [0, 4, 7, 11],
    description: "メジャー7th。メジャーに長7度を加えた、繊細な響きです。",
  },
  m7: {
    suffix: "m7",
    intervals: [0, 3, 7, 10],
    description: "マイナー7th。マイナーに短7度を加えた、柔らかな響きです。",
  },
  "9": {
    suffix: "9",
    intervals: [0, 4, 7, 10, 14],
    description:
      "ドミナント9th。7thに長9度を加えた5音のコード。add9と違い短7度を含みます。",
  },
  maj9: {
    suffix: "maj9",
    intervals: [0, 4, 7, 11, 14],
    description:
      "メジャー9th。maj7に長9度を加えた5音のコード。長7度を含みます。",
  },
  m9: {
    suffix: "m9",
    intervals: [0, 3, 7, 10, 14],
    description: "マイナー9th。m7に長9度を加えた5音のコード。短7度を含みます。",
  },
  dim: {
    suffix: "dim",
    intervals: [0, 3, 6],
    description: "ディミニッシュ。短3度を2つ重ねた、緊張感のある三和音です。",
  },
  dim7: {
    suffix: "dim7",
    intervals: [0, 3, 6, 9],
    description: "ディミニッシュ7th。短3度を3つ重ねた、対称的な四和音です。",
  },
  m7b5: {
    suffix: "m7b5",
    intervals: [0, 3, 6, 10],
    description: "ハーフディミニッシュ。m7の5度を半音下げたコードです。",
  },
  aug: {
    suffix: "aug",
    intervals: [0, 4, 8],
    description: "オーギュメント。長3度を2つ重ねた、浮遊感のある三和音です。",
  },
} as const;
export type Quality = keyof typeof DEFINITIONS;
export interface Chord {
  root: Root;
  quality: Quality;
  displayName: string;
  midiNotes: number[];
  noteNames: string[];
}
export function qualitiesFor(difficulty: Difficulty): Quality[] {
  const all = Object.keys(DEFINITIONS) as Quality[];
  // Explicit order: numeric object keys such as "7" are enumerated first by JS.
  const basic: Quality[] = ["major", "minor"];
  const intermediate: Quality[] = [
    ...basic,
    "7",
    "maj7",
    "m7",
    "9",
    "maj9",
    "m9",
  ];
  return difficulty === "beginner"
    ? basic
    : difficulty === "intermediate"
      ? intermediate
      : all;
}
export function createChord(root: Root, quality: Quality, octave = 3): Chord {
  const definition = DEFINITIONS[quality];
  const midiNotes = definition.intervals.map(
    (offset) => (octave + 1) * 12 + ROOTS.indexOf(root) + offset,
  );
  return {
    root,
    quality,
    displayName: root + definition.suffix,
    midiNotes,
    noteNames: midiNotes.map((midi) => ROOTS[midi % 12]),
  };
}
