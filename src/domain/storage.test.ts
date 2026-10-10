import { expect, it, vi } from "vitest";
import { loadResults, saveResult, STORAGE_KEY } from "./storage";
import type { SessionResult } from "./quiz";
const result: SessionResult = {
  id: "1",
  timestamp: "2026-10-10T12:00:00Z",
  difficulty: "beginner",
  mode: "practice",
  total: 10,
  correctCount: 6,
  hintCount: 3,
  unassistedCorrectCount: 4,
};
it("persists results and avoids duplicate sessions", () => {
  saveResult(result);
  saveResult(result);
  expect(loadResults().results).toEqual([result]);
});
it("caps history at 100 results", () => {
  for (let i = 0; i < 105; i++) saveResult({ ...result, id: String(i) });
  expect(loadResults().results).toHaveLength(100);
  expect(loadResults().results[0].id).toBe("104");
});
it("handles corrupt or unexpected data without overwriting it", () => {
  for (const data of ["{", "{}", "[null]", '[{"id":1}]']) {
    localStorage.setItem(STORAGE_KEY, data);
    expect(loadResults().error).not.toBe("");
    expect(saveResult(result).error).not.toBe("");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(data);
  }
});
it("reports unavailable storage and write failures", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(saveResult(result).error).toContain("保存できません");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(loadResults().error).toContain("読み込めません");
});
