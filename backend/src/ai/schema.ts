import { z } from "zod";
import { canonicalAnswer, evaluateAnswer } from "../correction/evaluate.js";
import { normalizeReadingText } from "../reading/rules.js";
export const correctionSchema = z
  .object({
    isCorrect: z.boolean(),
    suggestedAnswer: z.string().min(1).max(2000),
    explanationPtBr: z.string().min(1).max(3000),
    errorType: z.enum([
      "none",
      "grammar",
      "vocabulary",
      "meaning",
      "spelling",
      "other",
    ]),
    feedback: z.string().min(1).max(1000),
  })
  .strict();
export const generatedExerciseSchema = z
  .object({
    type: z.enum([
      "gap",
      "choice",
      "translate",
      "order",
      "transform",
      "reading",
    ]),
    prompt: z.string().min(5).max(1500),
    instruction: z.string().min(3).max(500),
    passage: z.string().max(5000).nullable(),
    options: z.array(z.string().min(1).max(300)).min(2).max(6).nullable(),
    words: z.array(z.string().min(1).max(80)).min(2).max(20).nullable(),
    accepted_answers: z.array(z.string().min(1).max(1000)).min(1).max(8),
    explanation: z.string().min(10).max(2000),
    difficulty: z.number().int().min(1).max(3),
  })
  .strict()
  .superRefine((e, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (e.type === "choice" && !e.options)
      fail("Múltipla escolha exige alternativas.");
    if (e.options) {
      if (new Set(e.options.map(canonicalAnswer)).size !== e.options.length)
        fail("Alternativas repetidas.");
      if (
        e.options.filter((o) => evaluateAnswer(o, e.accepted_answers))
          .length !== 1
      )
        fail("Deve existir exatamente uma alternativa correta.");
    }
    if (
      e.type === "order" &&
      (!e.words ||
        !evaluateAnswer(
          e.words.slice().sort().join(" "),
          e.accepted_answers.map((a) =>
            a
              .replace(/[.!?]+$/, "")
              .split(/\s+/)
              .sort()
              .join(" "),
          ),
        ))
    )
      fail("As palavras devem formar a resposta de referência.");
    if (e.type === "reading" && !e.passage) fail("Leitura exige um texto.");
    if (e.type === "gap" && !e.prompt.includes("___")) fail("Lacuna ausente.");
  });
export const generationSchema = z
  .object({ exercises: z.array(generatedExerciseSchema).min(1).max(10) })
  .strict();
export const readingSchema = z
  .object({
    title: z.string().min(1).max(180),
    text: z.string().min(20).max(8000),
    questions: z
      .array(
        z
          .object({
            prompt: z.string().min(5),
            accepted_answers: z.array(z.string().min(1)).min(1),
            explanation: z.string().min(5),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

export const readingPassageSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    text: z.string().trim().min(120).max(6000),
    questions: z
      .array(
        z
          .object({
            kind: z.enum(["main_idea", "detail", "evidence"]),
            promptEn: z.string().trim().min(5).max(500),
            referenceAnswerPtBr: z.string().trim().min(2).max(700),
            evidenceEn: z.string().trim().min(3).max(1500),
          })
          .strict(),
      )
      .length(3),
  })
  .strict()
  .superRefine((passage, ctx) => {
    const words = passage.text.split(/\s+/).filter(Boolean).length;
    if (words < 100 || words > 200)
      ctx.addIssue({
        code: "custom",
        message: "O texto deve ter entre 100 e 200 palavras.",
      });
    if (new Set(passage.questions.map((q) => q.kind)).size !== 3)
      ctx.addIssue({
        code: "custom",
        message:
          "Inclua uma pergunta de cada tipo: ideia principal, detalhe e evidência.",
      });
    for (const question of passage.questions)
      if (
        !normalizeReadingText(passage.text).includes(
          normalizeReadingText(question.evidenceEn),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "A evidência de cada pergunta deve ser um trecho do texto.",
        });
  });

export const readingInterpretationSchema = z
  .object({
    understanding: z.enum(["complete", "partial", "limited"]),
    feedbackPtBr: z.string().min(10).max(2500),
    understoodCorrectlyPtBr: z.array(z.string().min(3).max(700)).max(8),
    missingIdeasPtBr: z.array(z.string().min(3).max(700)).max(8),
    misunderstoodIdeasPtBr: z.array(z.string().min(3).max(700)).max(8),
    referenceSummaryPtBr: z.string().min(10).max(2500),
  })
  .strict();
export const readingAssessmentSchema = readingInterpretationSchema.extend({
  questionFeedback: z
    .array(
      z
        .object({
          questionId: z.enum(["q1", "q2", "q3"]),
          isCorrect: z.boolean(),
          feedbackPtBr: z.string().trim().min(5).max(1000),
        })
        .strict(),
    )
    .max(3),
});
export const writingFeedbackSchema = z
  .object({
    feedbackPtBr: z.string().min(10).max(2500),
    strengthsPtBr: z.array(z.string().min(3).max(700)).max(6),
    nextStepsPtBr: z.array(z.string().min(3).max(700)).min(1).max(6),
    revisedTextEn: z.string().min(5).max(6000),
  })
  .strict();
