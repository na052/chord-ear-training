import { describe, expect, it } from "vitest";
import { createChord, qualitiesFor, ROOTS } from "./chords";
import type { Difficulty, Quality } from "./chords";
import { generateQuestions, summarize } from "./quiz";
import type { Attempt } from "./quiz";
const expected: Record<Quality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
};
describe("chords", () => {
  for (const quality of Object.keys(expected) as Quality[])
    it(`${quality}: all 12 roots have the expected intervals and note names`, () => {
      ROOTS.forEach((root, i) => {
        const chord = createChord(root, quality);
        expect(chord.midiNotes).toEqual(
          expected[quality].map((offset) => 48 + i + offset),
        );
        expect(chord.noteNames).toEqual(
          expected[quality].map((offset) => ROOTS[(i + offset) % 12]),
        );
      });
    });
  it("uses canonical spelling, ninths and configurable root octave", () => {
    expect(createChord("D", "m7")).toMatchObject({
      displayName: "Dm7",
      noteNames: ["D", "F", "A", "C"],
    });
    expect(createChord("C", "9").midiNotes).toEqual([48, 52, 55, 58, 62]);
    expect(createChord("C", "major", 4).midiNotes).toEqual([60, 64, 67]);
    expect(qualitiesFor("intermediate")).toEqual(
      expect.arrayContaining(qualitiesFor("beginner")),
    );
    expect(qualitiesFor("advanced")).toHaveLength(12);
  });
});
describe("question generation", () => {
  for (const difficulty of [
    "beginner",
    "intermediate",
    "advanced",
  ] as Difficulty[])
    it(`${difficulty}: unique allowed options, root preference and no recent duplicates`, () => {
      let seed = 1234;
      const random = () =>
        (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
      const positions = new Set<number>();
      for (let run = 0; run < 100; run++) {
        const questions = generateQuestions(difficulty, random);
        expect(questions).toHaveLength(10);
        questions.forEach((q, i) => {
          expect(new Set(q.options.map((c) => c.displayName)).size).toBe(4);
          expect(
            q.options.filter((c) => c.displayName === q.answer.displayName),
          ).toHaveLength(1);
          q.options.forEach((c) =>
            expect(qualitiesFor(difficulty)).toContain(c.quality),
          );
          expect(
            q.options.filter((c) => c.root === q.answer.root),
          ).toHaveLength(difficulty === "beginner" ? 2 : 4);
          expect(
            questions
              .slice(Math.max(0, i - 3), i)
              .map((c) => c.answer.displayName),
          ).not.toContain(q.answer.displayName);
          positions.add(
            q.options.findIndex((c) => c.displayName === q.answer.displayName),
          );
        });
      }
      expect(positions.size).toBe(4);
    });
  it("terminates even with a constant RNG", () =>
    expect(generateQuestions("beginner", () => 0)).toHaveLength(10));
});
it("counts each assisted question once, including reference tone", () => {
  const attempts: Attempt[] = Array.from({ length: 10 }, (_, i) => ({
    questionId: String(i),
    selected: "C",
    correct: i < 7,
    usedArpeggioHint: i < 2,
    usedReferenceTone: i < 3,
    difficulty: "beginner",
    mode: "practice",
    timestamp: new Date().toISOString(),
  }));
  expect(summarize(attempts)).toMatchObject({
    correctCount: 7,
    hintCount: 3,
    unassistedCorrectCount: 4,
    total: 10,
  });
  expect(() => summarize([])).toThrow();
});
