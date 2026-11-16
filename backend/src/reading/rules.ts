import { z } from "zod";

export const readingAnswerSchema = z
  .object({
    questionId: z.enum(["q1", "q2", "q3"]),
    answer: z.string().trim().max(1000),
    evidence: z.string().trim().max(1000).default(""),
  })
  .strict();
export const readingAnswersSchema = z
  .array(readingAnswerSchema)
  .max(3)
  .refine(
    (answers) =>
      new Set(answers.map((a) => a.questionId)).size === answers.length,
    "Responda cada pergunta apenas uma vez.",
  );
export type ReadingAnswer = z.infer<typeof readingAnswerSchema>;
export interface ReadingQuestion {
  id: string;
  kind: "main_idea" | "detail" | "evidence";
  promptEn: string;
  referenceAnswerPtBr: string;
  evidenceEn: string;
}

export const readingStages = [
  {
    level: "A1",
    label: "A1 · Primeiros passos",
    instruction:
      "Vocabulário muito frequente, frases curtas e informações explícitas. Use principalmente o presente simples.",
  },
  {
    level: "A1",
    label: "A1 · Ampliando a leitura",
    instruction:
      "Mantenha o nível A1. Varie o vocabulário cotidiano e use conectores simples como and, but e because. As respostas devem estar explícitas.",
  },
  {
    level: "A2",
    label: "A2 · Novos contextos",
    instruction:
      "Use nível A2 inicial: situações familiares, conectores simples e passado simples quando fizer sentido. Introduza poucas palavras novas, com contexto claro.",
  },
  {
    level: "A2",
    label: "A2 · Consolidando a leitura",
    instruction:
      "Use nível A2 com maior variedade de situações, referências entre frases e conectores. Evite expressões raras e gramática avançada.",
  },
] as const;
export const textTypes = ["story", "dialogue", "email", "message"] as const;

export interface ReadingPerformance {
  difficulty: number;
  feedback: {
    understanding?: string;
    questionFeedback?: { isCorrect: boolean; feedbackPtBr?: string }[];
    misunderstoodIdeasPtBr?: string[];
    missingIdeasPtBr?: string[];
  };
}
// Input contains one latest evaluation per distinct passage, newest first.
export function readingDifficulty(history: ReadingPerformance[]) {
  const assessed = history.filter(
    (p) => p.feedback?.questionFeedback?.length === 3,
  );
  const current = Math.max(1, Math.min(4, assessed[0]?.difficulty ?? 1));
  const previousStage = assessed.findIndex((p) => p.difficulty !== current);
  const consecutive =
    previousStage < 0 ? assessed : assessed.slice(0, previousStage);
  const score = (p: ReadingPerformance) =>
    p.feedback.questionFeedback!.filter((q) => q.isCorrect).length;
  if (
    consecutive.length >= 3 &&
    consecutive
      .slice(0, 3)
      .every((p) => score(p) === 3 && p.feedback.understanding === "complete")
  )
    return Math.min(4, current + 1);
  if (
    consecutive.length >= 2 &&
    consecutive
      .slice(0, 2)
      .every((p) => score(p) <= 1 || p.feedback.understanding === "limited")
  )
    return Math.max(1, current - 1);
  return current;
}

export const normalizeReadingText = (text: string) =>
  text.normalize("NFKC").replace(/\s+/g, " ").trim();
export function containsReadingTerm(text: string, term: string) {
  const escaped = normalizeReadingText(term).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "iu",
  ).test(normalizeReadingText(text));
}
export function vocabularySchedule(
  remembered: boolean,
  streak: number,
  now = new Date(),
) {
  const nextStreak = remembered ? streak + 1 : 0;
  const days = remembered ? [1, 3, 7, 14, 30][Math.min(nextStreak - 1, 4)] : 1;
  return {
    streak: nextStreak,
    nextReview: new Date(now.getTime() + days * 86400000),
  };
}
