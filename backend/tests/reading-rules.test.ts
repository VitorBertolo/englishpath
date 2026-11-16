import { test } from "node:test";
import assert from "node:assert/strict";
import { readingPassageSchema } from "../src/ai/schema.js";
import {
  readingAnswersSchema,
  readingDifficulty,
  containsReadingTerm,
  vocabularySchedule,
  type ReadingPerformance,
} from "../src/reading/rules.js";

const passage = {
  title: "A New Garden",
  text: Array(120).fill("garden").join(" "),
  questions: ["main_idea", "detail", "evidence"].map((kind) => ({
    kind,
    promptEn: "What is in the text?",
    referenceAnswerPtBr: "Um jardim.",
    evidenceEn: "garden",
  })),
};
test("perguntas exigem três tipos e evidências presentes no texto", () => {
  assert(readingPassageSchema.safeParse(passage).success);
  assert(
    !readingPassageSchema.safeParse({
      ...passage,
      questions: passage.questions.slice(1),
    }).success,
  );
  assert(
    !readingPassageSchema.safeParse({
      ...passage,
      questions: passage.questions.map((q) => ({ ...q, kind: "detail" })),
    }).success,
  );
  assert(
    !readingPassageSchema.safeParse({
      ...passage,
      questions: passage.questions.map((q) => ({
        ...q,
        evidenceEn: "A sentence that is not in the text.",
      })),
    }).success,
  );
});
test("respostas não aceitam IDs estranhos, duplicados ou campos extras", () => {
  const answer = { questionId: "q1", answer: "Um jardim.", evidence: "" };
  assert(readingAnswersSchema.safeParse([answer]).success);
  assert(!readingAnswersSchema.safeParse([answer, answer]).success);
  assert(
    !readingAnswersSchema.safeParse([{ ...answer, questionId: "q4" }]).success,
  );
  assert(
    !readingAnswersSchema.safeParse([{ ...answer, isCorrect: true }]).success,
  );
});

function performance(
  difficulty = 1,
  correct = 3,
  understanding = "complete",
): ReadingPerformance {
  return {
    difficulty,
    feedback: {
      understanding,
      questionFeedback: Array.from({ length: 3 }, (_, i) => ({
        isCorrect: i < correct,
      })),
    },
  };
}
test("dificuldade só avança após três leituras completas no mesmo patamar", () => {
  assert.equal(readingDifficulty([]), 1);
  assert.equal(readingDifficulty([performance(), performance()]), 1);
  assert.equal(
    readingDifficulty([performance(), performance(), performance()]),
    2,
  );
  assert.equal(
    readingDifficulty([performance(2), performance(2), performance(1)]),
    2,
  );
  assert.equal(
    readingDifficulty([performance(2), performance(2), performance(2)]),
    3,
  );
  assert.equal(
    readingDifficulty([performance(4), performance(4), performance(4)]),
    4,
  );
  assert.equal(
    readingDifficulty([
      performance(1, 3, "partial"),
      performance(),
      performance(),
    ]),
    1,
  );
  assert.equal(
    readingDifficulty([
      { difficulty: 3, feedback: { understanding: "complete" } },
    ]),
    1,
  );
});
test("duas leituras difíceis reduzem um patamar e acertos antigos não mascaram a dificuldade", () => {
  assert.equal(
    readingDifficulty([
      performance(3, 0, "limited"),
      performance(3, 1),
      performance(3),
    ]),
    2,
  );
  assert.equal(readingDifficulty([performance(3, 0), performance(2, 0)]), 3);
  assert.equal(readingDifficulty([performance(1, 0), performance(1, 0)]), 1);
});
test("vocabulário deve corresponder a palavras inteiras ou expressões do texto", () => {
  assert(containsReadingTerm("Emma has a RED bag.", "red bag"));
  assert(containsReadingTerm("They sit\nunder the tree.", "under the tree"));
  assert(containsReadingTerm("She says, 'I don't know.'", "don't"));
  assert(!containsReadingTerm("The garden is large.", "den"));
  assert(!containsReadingTerm("The garden is large.", "garden.*"));
});
test("revisões de vocabulário usam espaçamento e reiniciam em um dia quando há dificuldade", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  for (const [streak, days] of [1, 3, 7, 14, 30, 30].entries()) {
    const scheduled = vocabularySchedule(true, streak, now);
    assert.equal(scheduled.streak, streak + 1);
    assert.equal(
      scheduled.nextReview.getTime(),
      now.getTime() + days * 86400000,
    );
  }
  const forgotten = vocabularySchedule(false, 5, now);
  assert.equal(forgotten.streak, 0);
  assert.equal(forgotten.nextReview.getTime(), now.getTime() + 86400000);
});
