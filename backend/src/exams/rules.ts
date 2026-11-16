import { randomInt } from "node:crypto";
import {
  deterministicResult,
  gradeBlanks,
  referenceAnswer,
  answerComplete,
} from "../correction/evaluate.js";

export function shuffled<T>(
  items: T[],
  random = (max: number) => randomInt(max),
) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function selectExamQuestions(
  pool: any[],
  count: number,
  random = (max: number) => randomInt(max),
) {
  const families = new Map<string, any[]>();
  for (const question of pool) {
    const key = question.family ?? question.id;
    families.set(key, [...(families.get(key) ?? []), question]);
  }
  const available = shuffled([...families.entries()], random);
  const chosen: any[] = [];
  const used = new Set<string>();
  const take = (multi: boolean, quota: number) => {
    for (const [key, variants] of available) {
      if (quota <= 0) break;
      if (used.has(key)) continue;
      const candidates = variants.filter(
        (q) => (q.type === "multi_gap") === multi,
      );
      if (!candidates.length) continue;
      chosen.push(candidates[random(candidates.length)]);
      used.add(key);
      quota--;
    }
  };
  take(true, Math.ceil(count / 2));
  take(false, count - chosen.length);
  // Also supports a smaller custom pool with fewer formats.
  for (const [key, variants] of available) {
    if (chosen.length >= count) break;
    if (!used.has(key)) {
      chosen.push(variants[random(variants.length)]);
      used.add(key);
    }
  }
  return shuffled(chosen, random).map((selected) => {
    return {
      ...selected,
      options: selected.options ? shuffled(selected.options, random) : null,
      words: selected.words ? shuffled(selected.words, random) : null,
      blanks:
        selected.blanks?.map((blank: any) => ({
          ...blank,
          options: blank.options ? shuffled(blank.options, random) : undefined,
        })) ?? null,
    };
  });
}
export function gradeExam(
  questions: any[],
  answers: Record<string, string>,
  threshold: number,
) {
  const results = questions.map((question) => {
    const answer = answers[question.id] ?? "";
    const detail =
      question.type === "multi_gap"
        ? gradeBlanks(answer, question.blanks)
        : {
            result:
              deterministicResult(answer, question) === "correct"
                ? "correct"
                : "incorrect",
            earnedPoints:
              deterministicResult(answer, question) === "correct" ? 1 : 0,
            totalPoints: 1,
          };
    return {
      exerciseId: question.id,
      prompt: question.prompt,
      type: question.type,
      answer,
      reference: referenceAnswer(question),
      explanation: question.explanation,
      skillId: question.skill_id,
      ...detail,
    };
  });
  const earnedPoints = results.reduce((sum, r) => sum + r.earnedPoints, 0);
  const totalPoints = results.reduce((sum, r) => sum + r.totalPoints, 0);
  const rawScore = totalPoints ? (earnedPoints / totalPoints) * 100 : 0;
  return {
    results,
    earnedPoints,
    totalPoints,
    score: Math.round(rawScore * 100) / 100,
    passed: totalPoints > 0 && rawScore >= threshold,
    correctQuestions: results.filter((r) => r.result === "correct").length,
    totalQuestions: questions.length,
    threshold,
  };
}
export const answeredCount = (
  questions: any[],
  answers: Record<string, string>,
) => questions.filter((q) => answerComplete(q, answers[q.id] ?? "")).length;
