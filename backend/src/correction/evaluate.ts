export type Result = "correct" | "incorrect" | "needs_review";
export type Blank = {
  id: string;
  label: string;
  accepted_answers: string[];
  options?: string[];
  strict_form?: boolean;
};
export function structuredAnswer(
  answer: string,
): Record<string, string> | null {
  try {
    const value = JSON.parse(answer);
    return value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every(
        (v) => typeof v === "string" && v.length <= 200,
      )
      ? value
      : null;
  } catch {
    return null;
  }
}
export function answerComplete(
  exercise: { type: string; blanks?: Blank[] | null },
  answer: string,
) {
  if (exercise.type !== "multi_gap") return !!answer.trim();
  const fields = structuredAnswer(answer);
  return (
    !!fields &&
    !!exercise.blanks?.length &&
    Object.keys(fields).length === exercise.blanks.length &&
    exercise.blanks.every((blank) => !!fields[blank.id]?.trim())
  );
}
export function gradeBlanks(answer: string, blanks: Blank[]) {
  const fields = structuredAnswer(answer) ?? {};
  const graded = blanks.map((blank) => ({
    id: blank.id,
    label: blank.label,
    answer: fields[blank.id] ?? "",
    reference: blank.accepted_answers[0],
    result: (
      blank.strict_form
        ? blank.accepted_answers.some(
            (a) =>
              normalizeAnswer(a) === normalizeAnswer(fields[blank.id] ?? ""),
          )
        : evaluateAnswer(fields[blank.id] ?? "", blank.accepted_answers)
    )
      ? ("correct" as const)
      : ("incorrect" as const),
  }));
  const earnedPoints = graded.filter(
    (field) => field.result === "correct",
  ).length;
  return {
    result:
      blanks.length > 0 && earnedPoints === blanks.length
        ? ("correct" as const)
        : ("incorrect" as const),
    fields: graded,
    earnedPoints,
    totalPoints: blanks.length,
  };
}
export function referenceAnswer(exercise: {
  type: string;
  prompt: string;
  accepted_answers: string[];
  blanks?: Blank[] | null;
}) {
  if (exercise.type !== "multi_gap") return exercise.accepted_answers[0];
  return exercise.prompt.replace(
    /\[\[([a-z]\w*)\]\]/gi,
    (_, id) =>
      exercise.blanks?.find((blank) => blank.id === id)?.accepted_answers[0] ??
      "___",
  );
}
export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[’‘`´]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim();
}
// Expand unambiguous present-tense contractions. No word reordering or fuzzy matching.
export function canonicalAnswer(value: string) {
  return normalizeAnswer(value)
    .replace(
      /\b(isn't|aren't|don't|doesn't)\b/g,
      (x) =>
        ({
          "isn't": "is not",
          "aren't": "are not",
          "don't": "do not",
          "doesn't": "does not",
        })[x]!,
    )
    .replace(
      /\b(i'm|you're|he's|she's|it's|we're|they're)\b(?=\s+\S)/g,
      (x) =>
        ({
          "i'm": "i am",
          "you're": "you are",
          "he's": "he is",
          "she's": "she is",
          "it's": "it is",
          "we're": "we are",
          "they're": "they are",
        })[x]!,
    );
}
export function evaluateAnswer(answer: string, accepted: string[]) {
  return accepted.some((x) => canonicalAnswer(x) === canonicalAnswer(answer));
}
export function deterministicResult(
  answer: string,
  exercise: {
    accepted_answers: string[];
    type: string;
    options?: string[] | null;
    strict_form?: boolean;
    blanks?: Blank[] | null;
  },
): Result {
  if (exercise.type === "multi_gap")
    return gradeBlanks(answer, exercise.blanks ?? []).result;
  if (
    exercise.strict_form
      ? exercise.accepted_answers.some(
          (x) => normalizeAnswer(x) === normalizeAnswer(answer),
        )
      : evaluateAnswer(answer, exercise.accepted_answers)
  )
    return "correct";
  return exercise.strict_form ||
    exercise.type === "choice" ||
    exercise.type === "gap" ||
    exercise.type === "order" ||
    exercise.options?.length
    ? "incorrect"
    : "needs_review";
}
