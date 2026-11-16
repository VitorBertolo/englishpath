import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnswer,
  evaluateAnswer,
  deterministicResult,
} from "../src/correction/evaluate.js";
import { mastery, scheduleReview } from "../src/progress/rules.js";
import {
  generatedExerciseSchema,
  correctionSchema,
  readingPassageSchema,
  readingInterpretationSchema,
  writingFeedbackSchema,
} from "../src/ai/schema.js";
import {
  exercises,
  lessons,
  modules,
  vocabulary,
} from "../../database/seeds/catalog.js";
import { diverseSelection } from "../src/study/selection.js";
import {
  learningActivities,
  supportPlan,
} from "../../database/seeds/evolution.js";
import { supportFeedback } from "../src/activities/rules.js";
test("normaliza espaços, caixa, pontuação final e apóstrofos", () => {
  assert.equal(normalizeAnswer("  I’m   a student.  "), "i'm a student");
  assert(evaluateAnswer(" I’m a student! ", ["I am a student."]));
  assert(evaluateAnswer("He isn’t tired.", ["He is not tired."]));
  assert(evaluateAnswer("We're not teachers.", ["We are not teachers."]));
});
test("preserva ordem, pessoa, significado e polaridade", () => {
  for (const wrong of [
    "Student a I am.",
    "He is a student.",
    "I am not a student.",
  ])
    assert(!evaluateAnswer(wrong, ["I am a student."]));
  assert(!evaluateAnswer("Yes, I'm.", ["Yes, I am."]));
  assert(!evaluateAnswer("I'm", ["I am"]));
});
test("respeita tarefas que exigem forma contraída ou completa", () => {
  assert.equal(
    deterministicResult("I am ready.", {
      type: "transform",
      accepted_answers: ["I'm ready."],
      strict_form: true,
    }),
    "incorrect",
  );
  assert.equal(
    deterministicResult("I’m ready.", {
      type: "transform",
      accepted_answers: ["I'm ready."],
      strict_form: true,
    }),
    "correct",
  );
});
test("respostas abertas desconhecidas aguardam revisão; objetivas erradas são erros", () => {
  assert.equal(
    deterministicResult("I am a pupil.", {
      type: "translate",
      accepted_answers: ["I am a student."],
    }),
    "needs_review",
  );
  assert.equal(
    deterministicResult("are", { type: "gap", accepted_answers: ["is"] }),
    "incorrect",
  );
});
test("domínio exige volume e pelo menos 85% de acerto recente", () => {
  assert.equal(mastery(["correct"]).mastery, "practicing");
  assert.equal(mastery(Array(8).fill("correct")).mastery, "mastered");
  assert.equal(
    mastery([...Array(17).fill("correct"), ...Array(3).fill("incorrect")])
      .mastery,
    "mastered",
  );
  assert.equal(
    mastery([...Array(16).fill("correct"), ...Array(4).fill("incorrect")])
      .mastery,
    "review",
  );
  assert.equal(mastery(Array(10).fill("needs_review")).mastery, "new");
  assert.equal(
    mastery([...Array(20).fill("incorrect"), ...Array(20).fill("correct")])
      .accuracy,
    0,
  );
});
test("revisões seguem 1,3,7,14,30 dias e erros reiniciam o intervalo", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  for (const [i, days] of [1, 3, 7, 14, 30, 30].entries())
    assert.equal(
      scheduleReview("correct", i, now).nextReview.getTime(),
      now.getTime() + days * 86400000,
    );
  assert.equal(scheduleReview("incorrect", 4, now).streak, 0);
  assert.equal(
    scheduleReview("needs_review", 4, now).nextReview.getTime(),
    now.getTime(),
  );
});
const valid = {
  type: "choice",
  prompt: "Which sentence is correct?",
  instruction: "Escolha uma frase.",
  passage: null,
  options: ["She is happy.", "She are happy."],
  words: null,
  accepted_answers: ["She is happy."],
  explanation: "She usa is e não are.",
  difficulty: 1,
};
test("valida geração de IA e rejeita escolhas ambíguas, lacunas ausentes e ordem impossível", () => {
  assert(generatedExerciseSchema.safeParse(valid).success);
  for (const patch of [
    { accepted_answers: ["None"] },
    { options: ["She is happy.", "She's happy."] },
    { type: "gap", options: null },
    { type: "reading", passage: null },
    { type: "order", options: null, words: ["she", "is", "sad"] },
  ])
    assert(!generatedExerciseSchema.safeParse({ ...valid, ...patch }).success);
  assert(!correctionSchema.safeParse({ isCorrect: "yes" }).success);
  assert(
    !generatedExerciseSchema.safeParse({ ...valid, difficulty: 99 }).success,
  );
});
test("catálogo contém 30 exercícios de prática e 24 questões de prova por lição", () => {
  assert.equal(exercises.length, 810);
  assert.equal(new Set(exercises.map((e) => e.type)).size, 7);
  for (const { id: l } of lessons) {
    assert.equal(
      exercises.filter(
        (e) => e.lesson_id === l && (e.purpose ?? "practice") === "practice",
      ).length,
      30,
    );
    assert.equal(
      exercises.filter((e) => e.lesson_id === l && e.purpose === "exam").length,
      24,
    );
  }
  for (const e of exercises) {
    assert(e.accepted_answers.length);
    assert(e.skill_id);
    assert.equal(deterministicResult(e.accepted_answers[0], e), "correct");
    if (e.options)
      assert.equal(
        e.options.filter((o) => evaluateAnswer(o, e.accepted_answers)).length,
        1,
      );
  }
});

test("as duas etapas têm situações próprias, temas variados e nenhum caso repetido em outro formato", () => {
  assert.equal(new Set(exercises.map((e) => e.family)).size, exercises.length);
  const texts = exercises.map((e) => (e.passage ?? "") + " " + e.prompt);
  assert.equal(new Set(texts).size, texts.length);
  for (const { id: lesson } of lessons) {
    const practice = exercises.filter(
      (e) => e.lesson_id === lesson && e.purpose === "practice",
    );
    assert(new Set(practice.map((e) => e.topic)).size >= 20);
    assert(new Set(practice.map((e) => e.type)).size >= 5);
    const selected = diverseSelection(practice, 20);
    assert.equal(selected.length, 20);
    assert(new Set(selected.map((e) => e.topic)).size >= 12);
    for (let i = 1; i < selected.length; i++) {
      assert.notEqual(selected[i].type, selected[i - 1].type);
      assert.notEqual(selected[i].topic, selected[i - 1].topic);
    }
  }
  assert(
    !exercises
      .filter((e) => e.lesson_id <= 6)
      .map((e) => (e.passage ?? "") + e.prompt)
      .join(" ")
      .match(/\b(Emma|Daniel|Sofia|Lucas|colleagues)\b/i),
  );
});

test("etapa 2 antecipa Present Continuous depois do Simple Present preservando as lições anteriores", () => {
  const stageModules = modules.filter((m) => m.stage_id === 2);
  assert.deepEqual(
    stageModules.map((m) => m.position),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    lessons
      .filter((l) => stageModules.some((m) => m.id === l.module_id))
      .map((l) => l.id),
    [7, 8, 9, 10, 11, 12, 13, 14, 15],
  );
  for (const m of stageModules)
    assert.equal(
      lessons.filter((l) => l.module_id === m.id).length,
      m.position === 4 ? 3 : 2,
    );
  assert.equal(vocabulary.filter((v) => v.stage_id === 2).length, 48);
  assert.equal(new Set(vocabulary.map((v) => v.id)).size, vocabulary.length);
  assert.equal(new Set(exercises.map((e) => e.id)).size, exercises.length);
  assert(
    exercises
      .filter((e) => e.lesson_id >= 7)
      .every(
        (e) =>
          e.id.startsWith("s2-v1-") &&
          lessons.find((l) => l.id === e.lesson_id)?.skills[
            (e.skill_id % 10) - 1
          ],
      ),
  );
});

test("apoios têm referências únicas, sequência válida e uma produção livre para cada etapa", () => {
  assert.equal(supportPlan.length, 7);
  assert.equal(new Set(learningActivities.map((a) => a.id)).size, 17);
  for (let stage = 1; stage <= 7; stage++)
    assert.equal(
      learningActivities.filter(
        (a) => a.kind === "writing" && a.stage_id === stage,
      ).length,
      1,
    );
  for (const a of learningActivities.filter((a) => a.kind === "support")) {
    assert(lessons.some((l) => l.id === a.lesson_id));
    assert.equal(a.content.questions?.length, 3);
    const response = JSON.stringify(
      Object.fromEntries(
        a.content.questions!.map((q) => [q.id, q.accepted_answers[0]]),
      ),
    );
    assert.equal(supportFeedback(a.content, response).correct, 3);
    assert.throws(() => supportFeedback(a.content, "{}"));
    assert.throws(() =>
      supportFeedback(
        a.content,
        JSON.stringify({ ...JSON.parse(response), unknown: "extra" }),
      ),
    );
  }
  const writing = learningActivities.find((a) => a.id === "writing-s1-v1")!;
  assert.equal(
    writing.content.examples.length,
    0,
    "A escrita não deve fornecer um texto para copiar.",
  );
  assert(writing.content.checklist.length >= 4);
});

test("Continuous preserva ação, auxiliar, pessoa e sentido de rotina ou momento", () => {
  assert(evaluateAnswer("She's reading now.", ["She is reading now."]));
  assert(evaluateAnswer("They aren't working.", ["They are not working."]));
  for (const answer of [
    "She reading now.",
    "She are reading now.",
    "She is read now.",
    "Does she reading now?",
    "She reads now.",
  ])
    assert(!evaluateAnswer(answer, ["She is reading now."]));
  assert(!evaluateAnswer("Yes, she does.", ["Yes, she is."]));
  const feedback = {
    feedbackPtBr: "Você comunicou sua rotina com clareza.",
    strengthsPtBr: ["Apresentação clara."],
    nextStepsPtBr: ["Revise a concordância."],
    revisedTextEn: "I am a student. I study at home.",
  };
  assert(writingFeedbackSchema.safeParse(feedback).success);
  assert(!writingFeedbackSchema.safeParse({ ...feedback, score: 100 }).success);
  assert(
    !writingFeedbackSchema.safeParse({ ...feedback, nextStepsPtBr: [] })
      .success,
  );
});

test("do/does aceitam contrações e formas completas preservando pessoa, polaridade e verbo base", () => {
  for (const [answer, reference] of [
    ["I do not drink coffee.", "I don't drink coffee."],
    ["She doesn't work here.", "She does not work here."],
    ["No, he does not.", "No, he doesn't."],
    ["don't", "do not"],
    ["doesn't", "does not"],
  ])
    assert(evaluateAnswer(answer, [reference]));
  for (const answer of [
    "She don't work here.",
    "She doesn't works here.",
    "She does work here.",
    "She isn't work here.",
    "He doesn't work here.",
  ])
    assert(!evaluateAnswer(answer, ["She doesn't work here."]));
  assert(
    !evaluateAnswer("Does she studies English?", ["Does she study English?"]),
  );
  assert(!evaluateAnswer("Yes, she is.", ["Yes, she does."]));
  assert.equal(
    deterministicResult("He does not work.", {
      type: "transform",
      accepted_answers: ["He doesn't work."],
      strict_form: true,
    }),
    "incorrect",
  );
});

test("seleção preserva prioridade, evita famílias repetidas e permite revisão quando não há outro formato", () => {
  const ranked = [
    { id: "new-1", type: "multi_gap", topic: "Viagem", family: "a" },
    { id: "new-2", type: "multi_gap", topic: "Viagem", family: "b" },
    { id: "new-3", type: "choice", topic: "Compras", family: "c" },
    { id: "variant", type: "order", topic: "Outro", family: "a" },
    { id: "new-4", type: "order", topic: "Saúde", family: "d" },
  ];
  assert.deepEqual(
    diverseSelection(ranked, 4).map((q) => q.id),
    ["new-1", "new-3", "new-2", "new-4"],
  );
  assert.equal(diverseSelection(ranked, 20).length, 4);
  assert.equal(diverseSelection(ranked.slice(0, 2), 20).length, 2);
  assert.deepEqual(diverseSelection([], 20), []);
});

test("leitura independente valida tamanho do texto e campos obrigatórios", () => {
  const questions = ["main_idea", "detail", "evidence"].map((kind) => ({
    kind,
    promptEn: "What is in the text?",
    referenceAnswerPtBr: "Um jardim.",
    evidenceEn: "garden",
  }));
  for (const words of [100, 150, 200])
    assert(
      readingPassageSchema.safeParse({
        title: "A New Garden",
        text: `  ${Array(words).fill("garden").join(" \n\t ")}  `,
        questions,
      }).success,
      `Textos com ${words} palavras devem ser aceitos.`,
    );
  assert(
    !readingPassageSchema.safeParse({
      title: "A New Garden",
      text: "Too short.",
      questions,
    }).success,
  );
  for (const words of [99, 201])
    assert(
      !readingPassageSchema.safeParse({
        title: "A New Garden",
        text: Array(words).fill("garden").join(" "),
        questions,
      }).success,
      `Textos com ${words} palavras devem ser rejeitados.`,
    );
  assert(
    !readingPassageSchema.safeParse({
      title: "A New Garden",
      text: Array(150).fill("garden").join(" "),
      questions,
      lessonId: 3,
    }).success,
  );
});

test("avaliação de interpretação exige feedback de compreensão sem nota de gramática", () => {
  const feedback = {
    understanding: "partial",
    feedbackPtBr: "Você identificou a ideia principal do texto.",
    understoodCorrectlyPtBr: ["A história acontece em um jardim."],
    missingIdeasPtBr: ["A visita acontece pela manhã."],
    misunderstoodIdeasPtBr: [],
    referenceSummaryPtBr:
      "Uma pessoa visita um jardim e encontra amigos pela manhã.",
  };
  assert(readingInterpretationSchema.safeParse(feedback).success);
  assert(
    !readingInterpretationSchema.safeParse({
      ...feedback,
      understanding: "perfect",
    }).success,
  );
  assert(
    !readingInterpretationSchema.safeParse({
      ...feedback,
      referenceSummaryPtBr: "",
    }).success,
  );
});
