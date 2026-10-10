import { ROOTS, createChord, qualitiesFor } from "./chords";
import type { Chord, Difficulty, Mode } from "./chords";
export const QUESTION_COUNT = 10;
export interface Question {
  id: string;
  answer: Chord;
  options: Chord[];
}
export interface Attempt {
  questionId: string;
  selected: string;
  correct: boolean;
  usedArpeggioHint: boolean;
  usedReferenceTone: boolean;
  difficulty: Difficulty;
  mode: Mode;
  timestamp: string;
}
export interface SessionResult {
  id: string;
  timestamp: string;
  difficulty: Difficulty;
  mode: Mode;
  total: number;
  correctCount: number;
  hintCount: number;
  unassistedCorrectCount: number;
}
function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function generateQuestions(
  difficulty: Difficulty,
  random = Math.random,
): Question[] {
  const pool = ROOTS.flatMap((root) =>
    qualitiesFor(difficulty).map((quality) => createChord(root, quality)),
  );
  const recent: string[] = [];
  return Array.from({ length: QUESTION_COUNT }, (_, index) => {
    const eligible = pool.filter(
      (chord) => !recent.includes(chord.displayName),
    );
    const answer = eligible[Math.floor(random() * eligible.length)];
    recent.push(answer.displayName);
    if (recent.length > 3) recent.shift();
    const sameRoot = shuffle(
      pool.filter(
        (chord) =>
          chord.root === answer.root &&
          chord.displayName !== answer.displayName,
      ),
      random,
    );
    const otherRoots = shuffle(
      pool.filter((chord) => chord.root !== answer.root),
      random,
    );
    return {
      id: `question-${index + 1}`,
      answer,
      options: shuffle(
        [answer, ...[...sameRoot, ...otherRoots].slice(0, 3)],
        random,
      ),
    };
  });
}
export function summarize(attempts: Attempt[]): SessionResult {
  if (attempts.length !== QUESTION_COUNT)
    throw new Error("10問の回答が必要です。");
  const assisted = (attempt: Attempt) =>
    attempt.usedArpeggioHint || attempt.usedReferenceTone;
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    difficulty: attempts[0].difficulty,
    mode: attempts[0].mode,
    total: attempts.length,
    correctCount: attempts.filter((attempt) => attempt.correct).length,
    hintCount: attempts.filter(assisted).length,
    unassistedCorrectCount: attempts.filter(
      (attempt) => attempt.correct && !assisted(attempt),
    ).length,
  };
}
