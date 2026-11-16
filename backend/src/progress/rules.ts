import type { Result } from "../correction/evaluate.js";
export function mastery(results: Result[], min = 8, threshold = 0.85) {
  const graded = results.filter((r) => r !== "needs_review").slice(0, 20);
  const correct = graded.filter((r) => r === "correct").length;
  const accuracy = graded.length ? correct / graded.length : 0;
  return {
    attempts: graded.length,
    correct,
    accuracy,
    mastery:
      graded.length === 0
        ? "new"
        : graded.length < min
          ? "practicing"
          : accuracy >= threshold
            ? "mastered"
            : "review",
  };
}
export function scheduleReview(
  result: Result,
  streak: number,
  now = new Date(),
  intervals = [1, 3, 7, 14, 30],
) {
  const nextStreak = result === "correct" ? streak + 1 : 0;
  const days =
    result === "correct"
      ? intervals[Math.min(nextStreak - 1, intervals.length - 1)]
      : 0;
  return {
    streak: nextStreak,
    nextReview: new Date(now.getTime() + days * 86400000),
  };
}
