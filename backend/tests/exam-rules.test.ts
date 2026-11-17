import { test } from "node:test";
import assert from "node:assert/strict";
import { exercises, lessons } from "../../database/seeds/catalog.js";
import {
  answerComplete,
  gradeBlanks,
  referenceAnswer,
  deterministicResult,
} from "../src/correction/evaluate.js";
import {
  selectExamQuestions,
  gradeExam,
  answeredCount,
} from "../src/exams/rules.js";

test("múltiplas lacunas exigem todos os campos e preservam a estrutura da resposta", () => {
  const question = exercises.find((e) => e.type === "multi_gap")!;
  const full = question.accepted_answers[0];
  assert(answerComplete(question, full));
  const fields = JSON.parse(full);
  delete fields[question.blanks![0].id];
  assert(!answerComplete(question, JSON.stringify(fields)));
  assert(!answerComplete(question, "not-json"));
  assert(!answerComplete(question, "[]"));
  assert(!answerComplete(question, "null"));
  const extra = { ...JSON.parse(full), unknown: "extra" };
  assert(!answerComplete(question, JSON.stringify(extra)));
});
test("cada lacuna tem pontuação independente, feedback e referência legível", () => {
  const question = exercises.find((e) => e.type === "multi_gap")!;
  const values = JSON.parse(question.accepted_answers[0]);
  values[question.blanks![0].id] = "wrong";
  const graded = gradeBlanks(JSON.stringify(values), question.blanks!);
  assert.equal(graded.result, "incorrect");
  assert.equal(graded.earnedPoints, question.blanks!.length - 1);
  assert.equal(graded.fields[0].result, "incorrect");
  assert(!referenceAnswer(question).includes("[["));
  assert.equal(
    deterministicResult(question.accepted_answers[0], question),
    "correct",
  );
});
test("banco inteiro possui lacunas coerentes, respostas únicas nas opções e dificuldade maior nas provas", () => {
  for (const question of exercises.filter((e) => e.type === "multi_gap")) {
    assert(question.blanks!.length >= 4);
    assert.equal(
      new Set(question.blanks!.map((b) => b.id)).size,
      question.blanks!.length,
    );
    assert.equal(
      [...question.prompt.matchAll(/\[\[\w+\]\]/g)].length,
      question.blanks!.length,
    );
    for (const blank of question.blanks!) {
      assert(question.prompt.includes(`[[${blank.id}]]`));
      if (blank.options) {
        const matches = blank.options.filter(
          (option) =>
            gradeBlanks(JSON.stringify({ [blank.id]: option }), [blank])
              .result === "correct",
        );
        assert.equal(matches.length, 1);
      }
    }
    assert(answerComplete(question, question.accepted_answers[0]));
    if (question.purpose === "exam") assert(question.difficulty >= 3);
  }
});
test("cada prova usa contextos distintos e mistura lacunas e construção de frases", () => {
  for (const { id: lesson } of lessons) {
    const pool = exercises.filter(
      (e) => e.lesson_id === lesson && e.purpose === "exam",
    );
    const selected = selectExamQuestions(pool, 12, (max) => max - 1);
    assert.equal(selected.length, 12);
    assert.equal(new Set(selected.map((q) => q.family)).size, 12);
    assert.equal(selected.filter((q) => q.type === "multi_gap").length, 6);
    assert(selected.every((q) => q.lesson_id === lesson));
  }
});
test("respostas oficiais aprovam as provas das três etapas sem ambiguidade de pontuação", () => {
  for (const { id: lesson } of lessons) {
    const selected = selectExamQuestions(
      exercises.filter((e) => e.lesson_id === lesson && e.purpose === "exam"),
      12,
      (max) => max - 1,
    );
    const answers = Object.fromEntries(
      selected.map((q) => [q.id, q.accepted_answers[0]]),
    );
    assert.equal(answeredCount(selected, answers), 12);
    const result = gradeExam(selected, answers, 85);
    assert.equal(result.score, 100);
    assert(result.passed);
    assert.equal(result.correctQuestions, 12);
    const incorrect = Object.fromEntries(
      selected.map((q) => [
        q.id,
        q.type === "multi_gap"
          ? JSON.stringify(
              Object.fromEntries(q.blanks.map((b: any) => [b.id, "wrong"])),
            )
          : "wrong",
      ]),
    );
    const failed = gradeExam(selected, incorrect, 85);
    assert.equal(failed.score, 0);
    assert(!failed.passed);
  }
});
test("arredondamento visual não aprova uma nota abaixo da exigida", () => {
  const questions = Array.from({ length: 201 }, (_, i) => ({
    id: String(i),
    type: "gap",
    prompt: "I ___ ready.",
    accepted_answers: ["am"],
    explanation: "I usa am.",
  }));
  const answers = Object.fromEntries(
    questions.map((q, i) => [q.id, i < 170 ? "am" : "is"]),
  );
  assert(!gradeExam(questions, answers, 85).passed);
  assert.equal(
    gradeExam(
      questions,
      Object.fromEntries(
        questions.map((q, i) => [q.id, i < 171 ? "am" : "is"]),
      ),
      85,
    ).passed,
    true,
  );
});
