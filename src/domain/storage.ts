import type { SessionResult } from "./quiz";
export const STORAGE_KEY = "chord-notes.sessions.v1";
function validResult(value: unknown): value is SessionResult {
  if (!value || typeof value !== "object") return false;
  const r = value as SessionResult;
  return (
    typeof r.id === "string" &&
    typeof r.timestamp === "string" &&
    Number.isFinite(Date.parse(r.timestamp)) &&
    ["beginner", "intermediate", "advanced"].includes(r.difficulty) &&
    ["practice", "test"].includes(r.mode) &&
    r.total === 10 &&
    [r.correctCount, r.hintCount, r.unassistedCorrectCount].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 10,
    ) &&
    r.unassistedCorrectCount <= r.correctCount
  );
}
export function loadResults(): { results: SessionResult[]; error: string } {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed) || !parsed.every(validResult))
      throw new Error("Invalid history");
    return { results: parsed, error: "" };
  } catch {
    return {
      results: [],
      error:
        "学習履歴を読み込めませんでした。ブラウザの保存設定をご確認ください。クイズは続けられます。",
    };
  }
}
export function saveResult(result: SessionResult): {
  results: SessionResult[];
  error: string;
} {
  const loaded = loadResults();
  if (loaded.error) return loaded; // Do not silently overwrite damaged history.
  const results = [
    result,
    ...loaded.results.filter((item) => item.id !== result.id),
  ].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    return { results, error: "" };
  } catch {
    return {
      results,
      error:
        "結果を保存できませんでした。ブラウザの保存容量・設定をご確認ください。",
    };
  }
}
