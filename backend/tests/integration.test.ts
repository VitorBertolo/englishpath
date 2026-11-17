import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import path from "node:path";
import request from "supertest";
import { randomUUID } from "node:crypto";
dotenv.config({ path: path.resolve("../.env.test"), quiet: true });
dotenv.config({ path: path.resolve("../.env"), quiet: true });
const testDb = process.env.TEST_DB_NAME;
if (!testDb || !testDb.endsWith("_test") || testDb === process.env.DB_NAME)
  throw new Error(
    "TEST_DB_NAME deve ser um banco separado terminado em _test.",
  );
process.env.DB_NAME = testDb;
process.env.NODE_ENV = "test";
process.env.AI_ENABLED = "false";
process.env.AI_RESPONSE_FORMAT = "json_schema";
const { pool, rows } = await import("../src/db.js");
const { migrate } = await import("../src/scripts/migrate.js");
const { seed } = await import("../src/scripts/seed.js");
const { createUser } = await import("../src/auth/service.js");
const { app } = await import("../src/app.js");
const username = "test_" + Date.now();
const password = "test-password-2027";
let userId: number;
const agent = request.agent(app);
const wrongAnswer = (e: any) =>
  e.type === "multi_gap"
    ? JSON.stringify(
        Object.fromEntries(e.blanks.map((b: any) => [b.id, "wrong"])),
      )
    : "definitely incorrect";
async function passExam(client: any, lessonId: number) {
  const exam = (await client.post("/api/exams").send({ lessonId }).expect(201))
    .body;
  const [record] = await rows(
    "SELECT questions FROM exam_sessions WHERE id=?",
    [exam.id],
  );
  const questions =
    typeof record.questions === "string"
      ? JSON.parse(record.questions)
      : record.questions;
  for (const question of questions)
    await client
      .post("/api/exams/" + exam.id + "/answers")
      .send({ exerciseId: question.id, answer: question.accepted_answers[0] })
      .expect(200);
  const completed = (
    await client
      .post("/api/exams/" + exam.id + "/submit")
      .send({})
      .expect(200)
  ).body;
  assert.equal(completed.grading.score, 100);
  assert.equal(completed.grading.passed, true);
  return completed;
}

before(async () => {
  await migrate();
  await seed();
  await createUser(username, password);
  [{ id: userId }] = await rows("SELECT id FROM users WHERE username=?", [
    username,
  ]);
});
after(async () => {
  await pool.end();
});
test("renovação do catálogo arquiva o conteúdo antigo, preserva histórico e não altera provas abertas", async () => {
  const username = "catalog_refresh_" + Date.now();
  await createUser(username, password);
  const [{ id }] = await rows("SELECT id FROM users WHERE username=?", [
    username,
  ]);
  const client = request.agent(app);
  await client.post("/api/auth/login").send({ username, password }).expect(200);
  await pool.execute(
    "INSERT INTO exercises(id,lesson_id,skill_id,type,prompt,instruction,accepted_answers,explanation,difficulty,source,active) VALUES ('to-be-1-1',1,11,'choice','Qual pronome significa eu?','Escolha.',?, 'I significa eu.',1,'seed',1) ON DUPLICATE KEY UPDATE active=1",
    [JSON.stringify(["I"])],
  );
  const [legacyBefore] = await rows(
    "SELECT prompt,accepted_answers,explanation FROM exercises WHERE id='to-be-1-1'",
  );
  const oldRefs =
    typeof legacyBefore.accepted_answers === "string"
      ? JSON.parse(legacyBefore.accepted_answers)
      : legacyBefore.accepted_answers;
  const legacySession = randomUUID();
  const currentSession = randomUUID();
  await pool.execute(
    "INSERT INTO study_sessions(id,user_id,lesson_id,mode,exercise_ids) VALUES (?,?,1,'lesson',?)",
    [legacySession, id, JSON.stringify(["to-be-1-1", "s1-v2-l1-p01"])],
  );
  const feedback = (
    await client
      .post("/api/exercises/to-be-1-1/answer")
      .send({ sessionId: legacySession, answer: oldRefs[0] })
      .expect(200)
  ).body;
  await pool.execute(
    "INSERT INTO study_sessions(id,user_id,lesson_id,mode,exercise_ids) VALUES (?,?,1,'review',?)",
    [currentSession, id, JSON.stringify(["s1-v2-l1-p01"])],
  );
  // Approval stays valid; a later active exam keeps both its questions and draft.
  await passExam(client, 1);
  const exam = (
    await client.post("/api/exams").send({ lessonId: 1 }).expect(201)
  ).body;
  await client
    .post("/api/exams/" + exam.id + "/answers")
    .send({ exerciseId: exam.questions[0].id, answer: "saved draft" })
    .expect(200);
  const [examBefore] = await rows(
    "SELECT questions,answers,status FROM exam_sessions WHERE id=?",
    [exam.id],
  );
  await seed();
  await seed();
  const [legacyAfter] = await rows(
    "SELECT prompt,accepted_answers,explanation FROM exercises WHERE id='to-be-1-1'",
  );
  assert.deepEqual(legacyAfter, legacyBefore);
  const closed = (
    await client.get("/api/study-sessions/" + legacySession).expect(200)
  ).body;
  assert.equal(closed.status, "finished");
  assert.equal(closed.closure_reason, "catalog_refresh");
  assert.equal(closed.cursor, 1);
  assert.deepEqual(closed.attempts[0].feedback, feedback);
  const preserved = (
    await client.get("/api/study-sessions/" + currentSession).expect(200)
  ).body;
  assert.equal(preserved.status, "active");
  assert.equal(preserved.cursor, 0);
  const [examAfter] = await rows(
    "SELECT questions,answers,status FROM exam_sessions WHERE id=?",
    [exam.id],
  );
  assert.deepEqual(examAfter, examBefore);
  const course = (await client.get("/api/stages").expect(200)).body.lessons;
  assert.equal(course[0].examPassed, true);
  assert.equal(course[1].isUnlocked, true);
  assert.equal(
    course[0].completed,
    0,
    "O catálogo novo não recebe acertos fictícios.",
  );
  const history = (await client.get("/api/attempts").expect(200)).body;
  assert.equal(history.length, 1);
  assert.equal(history[0].prompt, legacyBefore.prompt);
  const practice = (await client.get("/api/lessons/1/exercises").expect(200))
    .body;
  assert.equal(practice.length, 30);
  assert(practice.every((e: any) => e.id.startsWith("s1-v2-")));
  await client.post("/api/auth/logout").send({}).expect(200);
});

test("fluxo real MariaDB: autenticação, tentativa, retry, retomada, revisão e seed preservam histórico", async () => {
  await request(app).get("/api/stages").expect(401);
  await agent
    .post("/api/auth/login")
    .send({ username, password: "wrong" })
    .expect(401);
  const login = await agent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  assert.match(login.headers["set-cookie"][0], /SameSite=Strict/);
  await agent
    .post("/api/study-sessions")
    .set("Origin", "https://untrusted.example")
    .send({ lessonId: 1 })
    .expect(403);
  const initial = await agent.get("/api/progress/dashboard").expect(200);
  assert.equal(initial.body.stats.attempts, 0);
  assert.equal(initial.body.stats.accuracy, null);
  const course = await agent.get("/api/stages").expect(200);
  assert.equal(course.body.stages.length, 7);
  assert.equal(course.body.lessons.length, 24);
  assert.equal(course.body.modules.length, 9);
  assert.equal(course.body.stages[1].available, 1);
  assert.equal(course.body.stages[2].available, 1);
  assert(course.body.stages.slice(3).every((s: any) => !s.available));
  const session = (
    await agent.post("/api/study-sessions").send({ lessonId: 1 }).expect(201)
  ).body;
  assert.equal(session.exercises.length, 20);
  assert(!("accepted_answers" in session.exercises[0]));
  assert(!("explanation" in session.exercises[0]));
  const e = session.exercises[0];
  const [raw] = await rows(
    "SELECT accepted_answers FROM exercises WHERE id=?",
    [e.id],
  );
  const accepted =
    typeof raw.accepted_answers === "string"
      ? JSON.parse(raw.accepted_answers)
      : raw.accepted_answers;
  const correct = (
    await agent
      .post("/api/exercises/" + e.id + "/answer")
      .send({ sessionId: session.id, answer: accepted[0] })
      .expect(200)
  ).body;
  assert.equal(correct.result, "correct");
  const duplicate = await agent
    .post("/api/exercises/" + e.id + "/answer")
    .send({ sessionId: session.id, answer: "different retry" })
    .expect(200);
  assert.deepEqual(duplicate.body, correct);
  await agent
    .post("/api/study-sessions/" + session.id + "/finish")
    .send({ action: "pause" })
    .expect(200);
  const resumed = (
    await agent.post("/api/study-sessions").send({ lessonId: 1 }).expect(201)
  ).body;
  assert.equal(resumed.id, session.id);
  assert.equal(resumed.cursor, 1);
  const second = resumed.exercises[1];
  const wrong = (
    await agent
      .post("/api/exercises/" + second.id + "/answer")
      .send({ sessionId: session.id, answer: wrongAnswer(second) })
      .expect(200)
  ).body;
  assert.equal(wrong.result, "incorrect");
  const due = (await agent.get("/api/reviews/due").expect(200)).body;
  assert(due.some((r: any) => r.id === second.id));
  await seed();
  await seed();
  const [count] = await rows(
    "SELECT COUNT(*) count FROM exercises WHERE active=1 AND source='seed'",
  );
  assert.equal(count.count, 1296);
  const [attempts] = await rows(
    "SELECT COUNT(*) count FROM exercise_attempts WHERE user_id=?",
    [userId],
  );
  assert.equal(attempts.count, 2);
  const d = (await agent.get("/api/progress/dashboard").expect(200)).body;
  assert.equal(d.stats.attempts, 2);
  assert.equal(d.stats.correct, 1);
  assert.equal(d.stats.incorrect, 1);
  assert.equal(d.stats.accuracy, 50);
  assert.equal(d.activeSession.cursor, 2);
  await agent
    .post("/api/study-sessions/" + session.id + "/finish")
    .send({ action: "finish" })
    .expect(200);
  const review = (
    await agent
      .post("/api/study-sessions")
      .send({ lessonId: 1, mode: "review" })
      .expect(201)
  ).body;
  assert(review.exercises.some((x: any) => x.id === second.id));
  for (const item of review.exercises) {
    const [official] = await rows(
      "SELECT accepted_answers FROM exercises WHERE id=?",
      [item.id],
    );
    const refs =
      typeof official.accepted_answers === "string"
        ? JSON.parse(official.accepted_answers)
        : official.accepted_answers;
    await agent
      .post("/api/exercises/" + item.id + "/answer")
      .send({ sessionId: review.id, answer: refs[0] })
      .expect(200);
  }
  const finished = (
    await agent.get("/api/study-sessions/" + review.id).expect(200)
  ).body;
  assert.equal(finished.status, "completed");
  assert.equal(finished.cursor, finished.total);
  const [scheduled] = await rows(
    "SELECT streak,next_review>UTC_TIMESTAMP() future FROM exercise_reviews WHERE user_id=? AND exercise_id=?",
    [userId, second.id],
  );
  assert.equal(scheduled.streak, 1);
  assert.equal(scheduled.future, 1);
  await passExam(agent, 1);
  await passExam(agent, 2);
  const lessonSession = (
    await agent.post("/api/study-sessions").send({ lessonId: 3 }).expect(201)
  ).body;
  for (const item of lessonSession.exercises) {
    const [official] = await rows(
      "SELECT accepted_answers FROM exercises WHERE id=?",
      [item.id],
    );
    const refs =
      typeof official.accepted_answers === "string"
        ? JSON.parse(official.accepted_answers)
        : official.accepted_answers;
    const answer =
      item.type === "translate" ? "I am an unfamiliar variation." : refs[0];
    const r = await agent
      .post("/api/exercises/" + item.id + "/answer")
      .send({ sessionId: lessonSession.id, answer })
      .expect(200);
    if (item.type === "translate") assert.equal(r.body.result, "needs_review");
  }
  await agent
    .post("/api/ai/generate-exercises")
    .send({ lessonId: 1, skillId: 11, quantity: 4 })
    .expect(503);
  const history = await agent.get("/api/attempts").expect(200);
  assert(history.body.length > 2);
  assert(history.body.some((a: any) => a.result === "needs_review"));
  await agent.post("/api/auth/logout").send({}).expect(200);
  await agent.get("/api/auth/me").expect(401);
});

test("as três etapas preservam a sequência entre módulos e etapas com prática e provas independentes", async () => {
  const username = "full_course_" + Date.now();
  await createUser(username, password);
  const courseAgent = request.agent(app);
  await courseAgent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);
  await courseAgent.get("/api/lessons/7/exercises").expect(403);
  await courseAgent
    .post("/api/study-sessions")
    .send({ lessonId: 7 })
    .expect(403);
  await courseAgent.post("/api/exams").send({ lessonId: 7 }).expect(403);
  await courseAgent.get("/api/lessons/16/exercises").expect(403);
  await courseAgent
    .post("/api/study-sessions")
    .send({ lessonId: 16 })
    .expect(403);
  await courseAgent.post("/api/exams").send({ lessonId: 16 }).expect(403);
  const stageTwo = (await courseAgent.get("/api/stages/2").expect(200)).body;
  assert.equal(stageTwo.modules.length, 4);
  assert.equal(stageTwo.lessons.length, 9);
  const stageThree = (await courseAgent.get("/api/stages/3").expect(200)).body;
  assert.equal(stageThree.available, 1);
  assert.equal(stageThree.modules.length, 4);
  assert.equal(stageThree.lessons.length, 9);
  assert(stageThree.lessons.every((l: any) => !l.isUnlocked));
  for (const id of [
    "support-demonstratives-v1",
    "support-existence-location-v1",
    "support-quantities-v1",
    "support-some-any-prices-v1",
    "writing-s3-v1",
  ]) {
    assert.equal(
      (await courseAgent.get("/api/activities/" + id).expect(200)).body
        .isUnlocked,
      false,
    );
    await courseAgent
      .post("/api/activities/" + id + "/draft")
      .send({ response: "Blocked draft" })
      .expect(403);
  }
  const words = (await courseAgent.get("/api/vocabulary").expect(200)).body;
  assert.equal(words.filter((w: any) => w.stage_id === 2).length, 48);
  assert.equal(words.filter((w: any) => w.stage_id === 3).length, 48);
  for (let lessonId = 1; lessonId <= 24; lessonId++) {
    if ([16, 20, 21, 22, 23, 24].includes(lessonId)) {
      const activities = (
        await courseAgent.get("/api/stages").expect(200)
      ).body.activities.filter((a: any) => a.stage_id === 3);
      assert.equal(
        activities.find((a: any) => a.kind === "writing").isUnlocked,
        lessonId === 24,
      );
      for (const support of activities.filter((a: any) => a.kind === "support"))
        assert.equal(support.isUnlocked, lessonId >= support.lesson_id);
    }
    if (lessonId < 24)
      await courseAgent
        .post("/api/exams")
        .send({ lessonId: lessonId + 1 })
        .expect(403);
    const session = (
      await courseAgent
        .post("/api/study-sessions")
        .send({ lessonId })
        .expect(201)
    ).body;
    assert.equal(session.total, 20);
    assert.equal(new Set(session.exercises.map((e: any) => e.id)).size, 20);
    assert(new Set(session.exercises.map((e: any) => e.topic)).size >= 12);
    // Prior-lesson reviews can occupy five slots. Check the combined session
    // without requiring a rare format from the current lesson in those slots.
    assert(
      new Set(session.exercises.map((e: any) => e.type)).size >=
        (lessonId >= 7 ? 5 : 4),
      `Variedade insuficiente na sessão da lição ${lessonId}`,
    );
    for (let i = 1; i < session.exercises.length; i++) {
      assert.notEqual(session.exercises[i].type, session.exercises[i - 1].type);
      assert.notEqual(
        session.exercises[i].topic,
        session.exercises[i - 1].topic,
      );
    }
    const exercise = session.exercises[0];
    const [official] = await rows(
      "SELECT accepted_answers,purpose FROM exercises WHERE id=?",
      [exercise.id],
    );
    assert.equal(official.purpose, "practice");
    if (lessonId >= 7)
      assert(
        session.exercises.every(
          (e: any) =>
            e.id.startsWith(lessonId >= 16 ? "s3-v1-" : "s2-v1-") ||
            e.lesson_id < lessonId,
        ),
      );
    const refs =
      typeof official.accepted_answers === "string"
        ? JSON.parse(official.accepted_answers)
        : official.accepted_answers;
    await courseAgent
      .post("/api/exercises/" + exercise.id + "/answer")
      .send({ sessionId: session.id, answer: refs[0] })
      .expect(200);
    await courseAgent
      .post("/api/study-sessions/" + session.id + "/finish")
      .send({ action: "finish" })
      .expect(200);
    if (lessonId === 15) {
      const exam = (
        await courseAgent.post("/api/exams").send({ lessonId }).expect(201)
      ).body;
      await courseAgent
        .post("/api/exams/" + exam.id + "/answers")
        .send({
          exerciseId: exam.questions[0].id,
          answer: "saved stage two draft",
        })
        .expect(200);
      const [before] = await rows(
        "SELECT questions,answers,status FROM exam_sessions WHERE id=?",
        [exam.id],
      );
      const previous = (
        await courseAgent.get("/api/stages").expect(200)
      ).body.lessons.filter((l: any) => l.id < 15);
      await seed();
      const [after] = await rows(
        "SELECT questions,answers,status FROM exam_sessions WHERE id=?",
        [exam.id],
      );
      assert.deepEqual(
        after,
        before,
        "A extensão preserva a prova aberta ao final da etapa 02.",
      );
      const refreshed = (await courseAgent.get("/api/stages").expect(200)).body
        .lessons;
      assert.deepEqual(
        refreshed.filter((l: any) => l.id < 15),
        previous,
      );
      assert.equal(refreshed.find((l: any) => l.id === 16).isUnlocked, false);
    }
    const passed = await passExam(courseAgent, lessonId);
    assert.equal(passed.stageId, lessonId <= 6 ? 1 : lessonId <= 15 ? 2 : 3);
    assert.equal(passed.nextLessonId, lessonId < 24 ? lessonId + 1 : null);
  }
  const data = (await courseAgent.get("/api/stages").expect(200)).body;
  assert(
    data.lessons.every(
      (l: any) => l.total === 30 && l.examPassed && l.isUnlocked,
    ),
  );
  const dashboard = (
    await courseAgent.get("/api/progress/dashboard").expect(200)
  ).body;
  assert.equal(dashboard.total, 720);
  assert.equal(
    dashboard.stats.attempts,
    24,
    "Provas não criam tentativas de estudo.",
  );
  assert.equal(dashboard.currentLesson.stage_id, 3);
  const { learningActivities } =
    await import("../../database/seeds/evolution.js");
  for (const support of learningActivities.filter(
    (a) => a.stage_id === 3 && a.kind === "support",
  )) {
    const endpoint = "/api/activities/" + support.id;
    const view = (await courseAgent.get(endpoint).expect(200)).body;
    assert.equal(view.isUnlocked, true);
    assert(
      view.content.questions.every((q: any) => !("accepted_answers" in q)),
    );
    const response = JSON.stringify(
      Object.fromEntries(
        support.content.questions!.map((q) => [q.id, q.accepted_answers[0]]),
      ),
    );
    const corrected = (
      await courseAgent
        .post(endpoint + "/submissions")
        .send({ submissionId: randomUUID(), response, selfReview: [] })
        .expect(201)
    ).body;
    assert.equal(corrected.submissions[0].feedback.correct, 3);
  }
  const writingEndpoint = "/api/activities/writing-s3-v1";
  const writing = (await courseAgent.get(writingEndpoint).expect(200)).body;
  assert.equal(writing.isUnlocked, true);
  const response =
    "A: What is your name? B: I'm Lia. A: Where do you live? B: Near the school. A: How often do you study here? B: Twice a week. A: What are you doing now? B: I'm reading. There are two books here. A: What does library mean? B: Biblioteca. A: Thank you.";
  await courseAgent
    .post(writingEndpoint + "/draft")
    .send({ response })
    .expect(200);
  const payload = {
    submissionId: randomUUID(),
    response,
    selfReview: writing.content.checklist.map(() => true),
  };
  await courseAgent
    .post(writingEndpoint + "/submissions")
    .send(payload)
    .expect(201);
  await seed();
  const preserved = (await courseAgent.get(writingEndpoint).expect(200)).body;
  assert.equal(preserved.draft.response, response);
  assert.equal(preserved.submissions.length, 1);
  assert.equal(preserved.submissions[0].response, response);
  assert.deepEqual(
    (await courseAgent.get("/api/stages")).body.lessons,
    data.lessons,
  );
  assert.equal(
    (await courseAgent.get("/api/progress/dashboard")).body.stats.attempts,
    24,
  );
  await courseAgent.post("/api/auth/logout").send({}).expect(200);
});

test("apoios e escrita livre persistem versões, respeitam bloqueios e isolam a avaliação das provas", async () => {
  const { config } = await import("../src/config.js");
  const username = "activities_" + Date.now();
  await createUser(username, password);
  const client = request.agent(app);
  await client.post("/api/auth/login").send({ username, password }).expect(200);
  const future = (await client.get("/api/activities/writing-s4-v1").expect(200))
    .body;
  assert.equal(future.isUnlocked, false);
  await client
    .post("/api/activities/writing-s4-v1/draft")
    .send({ response: "A future draft." })
    .expect(403);
  await client
    .post("/api/activities/writing-s1-v1/submissions")
    .send({
      submissionId: randomUUID(),
      response: "I am a student.",
      selfReview: [true, true, true, true],
    })
    .expect(403);
  await passExam(client, 1);
  const support = (
    await client.get("/api/activities/support-possessives-v1").expect(200)
  ).body;
  assert.equal(support.isUnlocked, true);
  assert(
    support.content.questions.every(
      (q: any) => !("accepted_answers" in q) && !("explanation" in q),
    ),
  );
  const answers = JSON.stringify({ q1: "Her", q2: "Our", q3: "Their" });
  await client
    .post("/api/activities/support-possessives-v1/draft")
    .send({ response: answers })
    .expect(200);
  assert.equal(
    (await client.get("/api/activities/support-possessives-v1")).body.draft
      .response,
    answers,
  );
  await client
    .post("/api/activities/support-possessives-v1/submissions")
    .send({ submissionId: randomUUID(), response: "{}", selfReview: [] })
    .expect(400);
  const supportId = randomUUID();
  const supportPayload = {
    submissionId: supportId,
    response: answers,
    selfReview: [],
  };
  const corrected = (
    await client
      .post("/api/activities/support-possessives-v1/submissions")
      .send(supportPayload)
      .expect(201)
  ).body;
  assert.equal(
    corrected.submissions.find((s: any) => s.id === supportId).feedback.correct,
    3,
  );
  assert.equal(
    (
      await client
        .post("/api/activities/support-possessives-v1/submissions")
        .send(supportPayload)
        .expect(201)
    ).body.submissions.length,
    1,
  );
  for (let id = 2; id <= 5; id++) await passExam(client, id);
  const before = (await client.get("/api/progress/dashboard").expect(200)).body;
  const beforeCourse = (await client.get("/api/stages").expect(200)).body;
  const task = (await client.get("/api/activities/writing-s1-v1").expect(200))
    .body;
  assert.equal(task.isUnlocked, true);
  const text =
    "I am a student. I am at home. My sister is happy. We are not tired.";
  await client
    .post("/api/activities/writing-s1-v1/draft")
    .send({ response: text })
    .expect(200);
  assert.equal(
    (await client.get("/api/activities/writing-s1-v1")).body.draft.response,
    text,
  );
  const submissionId = randomUUID();
  const payload = {
    submissionId,
    response: text,
    selfReview: [true, true, true, false],
  };
  const delivered = (
    await client
      .post("/api/activities/writing-s1-v1/submissions")
      .send(payload)
      .expect(201)
  ).body;
  assert.equal(delivered.submissions[0].status, "submitted");
  assert.equal(delivered.submissions[0].feedback, null);
  assert.equal(
    (
      await client
        .post("/api/activities/writing-s1-v1/submissions")
        .send(payload)
        .expect(201)
    ).body.submissions.length,
    1,
  );
  await client
    .post("/api/activities/writing-s1-v1/submissions")
    .send({ ...payload, response: "Different response." })
    .expect(409);
  await client
    .post(
      "/api/activities/writing-s1-v1/submissions/" + submissionId + "/review",
    )
    .send({})
    .expect(503);
  const previousFetch = globalThis.fetch;
  const previousEnabled = config.aiEnabled;
  let calls = 0;
  let fail = true;
  config.aiEnabled = true;
  globalThis.fetch = async (_url, options) => {
    calls++;
    const context = JSON.parse(
      JSON.parse(String(options?.body)).messages[1].content,
    );
    assert.equal(context.response, text);
    assert.equal(context.stage, 1);
    assert.equal(context.criteria.length, 4);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: fail
                ? "invalid"
                : JSON.stringify({
                    feedbackPtBr:
                      "Você apresentou as pessoas e o local com clareza.",
                    strengthsPtBr: ["Concordância adequada."],
                    nextStepsPtBr: ["Acrescente uma descrição pessoal."],
                    revisedTextEn: text,
                  }),
            },
          },
        ],
        usage: { cost: 0 },
      }),
      { status: 200 },
    );
  };
  try {
    await client
      .post(
        "/api/activities/writing-s1-v1/submissions/" + submissionId + "/review",
      )
      .send({})
      .expect(502);
    assert.equal(
      (await client.get("/api/activities/writing-s1-v1")).body.submissions[0]
        .response,
      text,
    );
    fail = false;
    const reviewed = (
      await client
        .post(
          "/api/activities/writing-s1-v1/submissions/" +
            submissionId +
            "/review",
        )
        .send({})
        .expect(200)
    ).body;
    assert.equal(reviewed.submissions[0].status, "reviewed");
    assert(!("score" in reviewed.submissions[0].feedback));
    await client
      .post(
        "/api/activities/writing-s1-v1/submissions/" + submissionId + "/review",
      )
      .send({})
      .expect(200);
    assert.equal(calls, 2, "Uma avaliação concluída não chama a IA novamente.");
  } finally {
    globalThis.fetch = previousFetch;
    config.aiEnabled = previousEnabled;
  }
  const newId = randomUUID();
  const rewritten = text + " I am ready for class.";
  const versions = (
    await client
      .post("/api/activities/writing-s1-v1/submissions")
      .send({
        submissionId: newId,
        response: rewritten,
        selfReview: [true, true, true, true],
      })
      .expect(201)
  ).body.submissions;
  assert.equal(versions.length, 2);
  assert.equal(versions.find((s: any) => s.id === submissionId).response, text);
  await seed();
  const preserved = (
    await client.get("/api/activities/writing-s1-v1").expect(200)
  ).body;
  assert.equal(preserved.submissions.length, 2);
  const after = (await client.get("/api/progress/dashboard").expect(200)).body;
  assert.deepEqual(after.stats, before.stats);
  assert.equal(after.completed, before.completed);
  const afterCourse = (await client.get("/api/stages").expect(200)).body;
  assert.deepEqual(
    afterCourse.lessons.map((l: any) => [l.id, l.isUnlocked, l.examPassed]),
    beforeCourse.lessons.map((l: any) => [l.id, l.isUnlocked, l.examPassed]),
  );
  assert.equal(
    afterCourse.activities.find((a: any) => a.id === "writing-s1-v1")
      .submissions,
    2,
  );
  await client.post("/api/auth/logout").send({}).expect(200);
  await request(app).get("/api/activities/writing-s1-v1").expect(401);
  // A different authenticated learner sees the task, but never this learner's work.
  const { newToken, tokenHash } = await import("../src/auth/service.js");
  const otherToken = newToken();
  await pool.execute(
    "INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))",
    [tokenHash(otherToken), userId],
  );
  const otherCookie = "english_session=" + otherToken;
  const privateView = (
    await request(app)
      .get("/api/activities/writing-s1-v1")
      .set("Cookie", otherCookie)
      .expect(200)
  ).body;
  assert.equal(privateView.draft, null);
  assert.equal(privateView.submissions.length, 0);
  await request(app)
    .post(
      "/api/activities/writing-s1-v1/submissions/" + submissionId + "/review",
    )
    .set("Cookie", otherCookie)
    .send({})
    .expect(404);
  await request(app)
    .post("/api/auth/logout")
    .set("Cookie", otherCookie)
    .send({})
    .expect(200);
});

test("correção IA valida JSON e preserva tentativas quando o provedor falha (transporte simulado)", async () => {
  const { config } = await import("../src/config.js");
  const username = "ai_fallback_" + Date.now();
  await createUser(username, password);
  const aiAgent = request.agent(app);
  await aiAgent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);
  await passExam(aiAgent, 1);
  await passExam(aiAgent, 2);
  const previousFetch = globalThis.fetch;
  const previousEnabled = config.aiEnabled;
  let calls = 0;
  let valid = false;
  config.aiEnabled = true;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(
      JSON.parse(String(options?.body)).response_format.type,
      "json_schema",
    );
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: valid
                ? JSON.stringify({
                    isCorrect: true,
                    suggestedAnswer: "They are friends of mine.",
                    explanationPtBr:
                      "A expressão friends of mine equivale a my friends.",
                    errorType: "none",
                    feedback: "Sua variação mantém o significado.",
                  })
                : "{invalid-json",
            },
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 30, cost: 0.00001 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const session = (
      await aiAgent
        .post("/api/study-sessions")
        .send({ lessonId: 3 })
        .expect(201)
    ).body;
    for (const exercise of session.exercises) {
      const [official] = await rows(
        "SELECT accepted_answers FROM exercises WHERE id=?",
        [exercise.id],
      );
      const refs =
        typeof official.accepted_answers === "string"
          ? JSON.parse(official.accepted_answers)
          : official.accepted_answers;
      const unknown = exercise.type === "translate";
      const response = await aiAgent
        .post("/api/exercises/" + exercise.id + "/answer")
        .send({
          sessionId: session.id,
          answer: unknown
            ? valid
              ? "They are friends of mine."
              : "I am a pupil."
            : refs[0],
        })
        .expect(200);
      if (unknown) {
        assert.equal(response.body.result, valid ? "correct" : "needs_review");
        assert.equal(response.body.method, valid ? "ai" : "fallback");
        valid = true;
      }
    }
    assert.equal(
      calls,
      2,
      "Somente as duas traduções desconhecidas chamam a IA.",
    );
    const [user] = await rows("SELECT id FROM users WHERE username=?", [
      username,
    ]);
    const logs = await rows(
      "SELECT status,cost FROM ai_generations WHERE user_id=? ORDER BY created_at,id",
      [user.id],
    );
    assert.equal(logs.length, 2);
    assert(logs.some((log) => log.status === "failed"));
    assert(logs.some((log) => log.status === "validated" && log.cost > 0));
  } finally {
    globalThis.fetch = previousFetch;
    config.aiEnabled = previousEnabled;
  }
});

test("leitura livre persiste texto, rascunho e interpretação sem avançar o curso", async () => {
  const { config } = await import("../src/config.js");
  const username = "reading_" + Date.now();
  await createUser(username, password);
  const [user] = await rows("SELECT id FROM users WHERE username=?", [
    username,
  ]);
  const readingAgent = request.agent(app);
  await readingAgent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);

  // Reproduce the old bug against an active exercise, not an archived fixture.
  const [future] = await rows(
    "SELECT id,accepted_answers FROM exercises WHERE lesson_id=3 AND purpose='practice' AND active=1 AND type='choice' ORDER BY id LIMIT 1",
  );
  const futureAnswer =
    typeof future.accepted_answers === "string"
      ? JSON.parse(future.accepted_answers)[0]
      : future.accepted_answers[0];
  for (const mode of ["reading", "review"]) {
    const legacyId = randomUUID();
    await pool.execute(
      "INSERT INTO study_sessions(id,user_id,lesson_id,mode,exercise_ids) VALUES (?,?,?,?,?)",
      [legacyId, user.id, 1, mode, JSON.stringify([future.id])],
    );
    await readingAgent
      .post("/api/exercises/" + future.id + "/answer")
      .send({ sessionId: legacyId, answer: futureAnswer })
      .expect(200);
  }
  const initialCourse = (await readingAgent.get("/api/stages").expect(200))
    .body;
  assert.equal(initialCourse.lessons.find((l: any) => l.id === 3).progress, 0);
  assert.equal(
    (await readingAgent.get("/api/reviews/due").expect(200)).body.length,
    0,
  );
  await readingAgent
    .post("/api/study-sessions")
    .send({ lessonId: 1, mode: "reading" })
    .expect(410);
  const active = (
    await readingAgent
      .post("/api/study-sessions")
      .send({ lessonId: 1 })
      .expect(201)
  ).body;
  const before = (await readingAgent.get("/api/progress/dashboard").expect(200))
    .body;

  const text =
    "Every morning, Emma visits a small garden near her house. The garden has yellow flowers and a tall green tree. Today, she meets her friend Ben at the gate. Ben has a red bag with two apples and a book. They sit under the tree and talk about their favorite animals. A small bird lands near them. Emma puts some water in a bowl for the bird. Ben opens his book and shows Emma pictures of birds. They find a picture of the same bird. It has a small yellow head and brown wings. After a quiet morning, the friends walk home together. They are happy and want to visit the garden again.";
  const questions = [
    {
      kind: "main_idea",
      promptEn: "What do Emma and Ben do?",
      referenceAnswerPtBr: "Eles visitam um jardim e observam um pássaro.",
      evidenceEn:
        "They sit under the tree and talk about their favorite animals.",
    },
    {
      kind: "detail",
      promptEn: "What is in Ben's bag?",
      referenceAnswerPtBr: "Duas maçãs e um livro.",
      evidenceEn: "Ben has a red bag with two apples and a book.",
    },
    {
      kind: "evidence",
      promptEn: "Does Emma help the bird? Find a sentence that shows this.",
      referenceAnswerPtBr: "Sim, ela oferece água.",
      evidenceEn: "Emma puts some water in a bowl for the bird.",
    },
  ];
  const answers = [
    { questionId: "q1", answer: "Eles visitam um jardim.", evidence: "" },
    { questionId: "q2", answer: "Two apples and a book.", evidence: "" },
    { questionId: "q3", answer: "Sim.", evidence: questions[2].evidenceEn },
  ];
  const feedback = {
    understanding: "partial",
    feedbackPtBr:
      "Você entendeu que os amigos visitam um jardim e encontram um pássaro.",
    understoodCorrectlyPtBr: ["Emma e Ben estão em um jardim."],
    missingIdeasPtBr: ["Emma oferece água ao pássaro."],
    misunderstoodIdeasPtBr: [],
    referenceSummaryPtBr:
      "Emma encontra Ben no jardim. Eles conversam, observam um pássaro e voltam felizes para casa.",
    questionFeedback: answers.map((a) => ({
      questionId: a.questionId,
      isCorrect: true,
      feedbackPtBr: "Sua resposta corresponde ao texto.",
    })),
  };
  const previousFetch = globalThis.fetch;
  const previousEnabled = config.aiEnabled;
  let calls = 0;
  let rejectAssessment = true;
  config.aiEnabled = true;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const context = JSON.parse(body.messages[1].content);
    if (body.response_format.json_schema.name === "reading_feedback") {
      assert.equal(
        context.text,
        text,
        "O servidor usa o texto persistido, não um texto do cliente.",
      );
      assert.deepEqual(context.studentAnswers, answers);
      if (rejectAssessment)
        return new Response(
          JSON.stringify({
            error: { code: 429, message: "Rate limit exceeded" },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(feedback) } }],
          usage: { cost: 0 },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    assert.equal(body.response_format.json_schema.name, "reading");
    assert.equal(context.level, "A1");
    assert.equal(context.approximateWords, 150);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "A Morning in the Garden",
                text,
                questions,
              }),
            },
          },
        ],
        usage: { cost: 0 },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const passage = (
      await readingAgent.post("/api/readings/generate").send({}).expect(201)
    ).body;
    assert.equal(passage.content, text);
    assert.equal(passage.level, "A1");
    assert.equal(passage.word_count, text.split(/\s+/).length);
    assert(passage.word_count >= 100 && passage.word_count <= 200);
    assert(!("lesson_id" in passage));
    assert.equal(passage.questions.length, 3);
    assert(
      passage.questions.every(
        (q: any) => !("referenceAnswerPtBr" in q) && !("evidenceEn" in q),
      ),
    );
    assert(
      (await readingAgent.get("/api/readings").expect(200)).body.some(
        (p: any) => p.id === passage.id,
      ),
    );
    const interpretation =
      "Eu entendi que Emma e Ben foram a um jardim e viram um pássaro.";
    await readingAgent
      .post("/api/readings/" + passage.id + "/draft")
      .send({ interpretation, answers })
      .expect(200);
    const restored = (
      await readingAgent.get("/api/readings/" + passage.id).expect(200)
    ).body;
    assert.equal(restored.draft_interpretation, interpretation);
    assert.deepEqual(restored.draft_answers, answers);
    assert.equal(calls, 1, "Salvar rascunho não chama a IA.");
    const attemptId = randomUUID();
    await readingAgent
      .post("/api/readings/" + passage.id + "/interpretations")
      .send({ attemptId, interpretation })
      .expect(400);
    await readingAgent
      .post("/api/readings/" + passage.id + "/interpretations")
      .send({ attemptId, interpretation, text: "Texto adulterado" })
      .expect(400);
    const failed = await readingAgent
      .post("/api/readings/" + passage.id + "/interpretations")
      .send({ attemptId, interpretation, answers })
      .expect(502);
    assert.match(failed.body.error, /interpretação foi salva/);
    const saved = (
      await readingAgent.get("/api/readings/" + passage.id).expect(200)
    ).body;
    assert.equal(saved.attempts.length, 1);
    assert.equal(saved.attempts[0].status, "failed");
    assert.equal(saved.attempts[0].interpretation, interpretation);
    rejectAssessment = false;
    const evaluated = (
      await readingAgent
        .post("/api/readings/" + passage.id + "/interpretations")
        .send({ attemptId, interpretation, answers })
        .expect(200)
    ).body;
    assert.deepEqual(evaluated.feedback, {
      ...feedback,
      questionFeedback: feedback.questionFeedback.map((q, i) => ({
        ...q,
        referenceAnswerPtBr: questions[i].referenceAnswerPtBr,
        evidenceEn: questions[i].evidenceEn,
      })),
    });
    const callsAfterSuccess = calls;
    await readingAgent
      .post("/api/readings/" + passage.id + "/interpretations")
      .send({ attemptId, interpretation, answers })
      .expect(200);
    assert.equal(
      calls,
      callsAfterSuccess,
      "Repetir a requisição não cobra outra avaliação.",
    );
    await readingAgent
      .post("/api/readings/" + passage.id + "/interpretations")
      .send({ attemptId, interpretation: "Outra resposta diferente.", answers })
      .expect(409);
    const current = (
      await readingAgent.get("/api/readings/" + passage.id).expect(200)
    ).body;
    assert.equal(current.attempts.length, 1);
    assert.equal(current.attempts[0].status, "evaluated");
    const after = (
      await readingAgent.get("/api/progress/dashboard").expect(200)
    ).body;
    assert.equal(after.progress, before.progress);
    assert.equal(after.stats.attempts, before.stats.attempts);
    assert.deepEqual(after.skills, before.skills);
    assert.equal(after.activeSession.id, active.id);
    assert.equal(after.activeSession.cursor, 0);

    // A review may consolidate an exercise already encountered in its own lesson.
    const studiedExercise = active.exercises[0];
    await readingAgent
      .post("/api/exercises/" + studiedExercise.id + "/answer")
      .send({ sessionId: active.id, answer: wrongAnswer(studiedExercise) })
      .expect(200);
    await readingAgent
      .post("/api/study-sessions/" + active.id + "/finish")
      .send({ action: "finish" })
      .expect(200);
    const review = (
      await readingAgent
        .post("/api/study-sessions")
        .send({ lessonId: 1, mode: "review" })
        .expect(201)
    ).body;
    assert.equal(review.total, 1);
    const [official] = await rows(
      "SELECT accepted_answers FROM exercises WHERE id=?",
      [studiedExercise.id],
    );
    const refs =
      typeof official.accepted_answers === "string"
        ? JSON.parse(official.accepted_answers)
        : official.accepted_answers;
    await readingAgent
      .post("/api/exercises/" + studiedExercise.id + "/answer")
      .send({ sessionId: review.id, answer: refs[0] })
      .expect(200);
    const reinforced = (await readingAgent.get("/api/stages").expect(200)).body
      .lessons;
    assert.equal(
      reinforced.find((lesson: any) => lesson.id === 1).completed,
      1,
    );
    assert.equal(
      reinforced.find((lesson: any) => lesson.id === 3).completed,
      0,
    );

    const otherName = "reading_owner_" + Date.now();
    await createUser(otherName, password);
    const other = request.agent(app);
    await other
      .post("/api/auth/login")
      .send({ username: otherName, password })
      .expect(200);
    await other.get("/api/readings/" + passage.id).expect(404);
    await other
      .post("/api/readings/" + passage.id + "/draft")
      .send({ interpretation })
      .expect(404);
    assert.equal((await other.get("/api/readings").expect(200)).body.length, 0);
    await other.post("/api/auth/logout").send({}).expect(200);
  } finally {
    globalThis.fetch = previousFetch;
    config.aiEnabled = previousEnabled;
    await readingAgent.post("/api/auth/logout").send({}).expect(200);
  }
});

test("leitura adapta dificuldade, varia formatos e revisa vocabulário com privacidade e idempotência", async () => {
  const { config } = await import("../src/config.js");
  const { evaluateReading } = await import("../src/reading/service.js");
  const username = "reading_adaptive_" + Date.now();
  await createUser(username, password);
  const [user] = await rows("SELECT id FROM users WHERE username=?", [
    username,
  ]);
  const { newToken, tokenHash } = await import("../src/auth/service.js");
  async function authenticatedReader(id: number) {
    const token = newToken();
    await pool.execute(
      "INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))",
      [tokenHash(token), id],
    );
    return request.agent(app).set("Cookie", `english_session=${token}`);
  }
  const client = await authenticatedReader(user.id);
  const text =
    "Every morning, Emma visits a small garden near her house. The garden has yellow flowers and a tall green tree. Today, she meets her friend Ben at the gate. Ben has a red bag with two apples and a book. They sit under the tree and talk about their favorite animals. A small bird lands near them. Emma puts some water in a bowl for the bird. Ben opens his book and shows Emma pictures of birds. They find a picture of the same bird. It has a small yellow head and brown wings. After a quiet morning, the friends walk home together. They are happy and want to visit the garden again.";
  const questions = [
    {
      kind: "main_idea",
      promptEn: "What do the friends do?",
      referenceAnswerPtBr: "Eles visitam um jardim.",
      evidenceEn:
        "They sit under the tree and talk about their favorite animals.",
    },
    {
      kind: "detail",
      promptEn: "What color are the flowers?",
      referenceAnswerPtBr: "Amarelas.",
      evidenceEn: "The garden has yellow flowers and a tall green tree.",
    },
    {
      kind: "evidence",
      promptEn: "How does Emma help the bird? Find the sentence.",
      referenceAnswerPtBr: "Ela oferece água.",
      evidenceEn: "Emma puts some water in a bowl for the bird.",
    },
  ];
  const answers = questions.map((q, i) => ({
    questionId: `q${i + 1}`,
    answer: q.referenceAnswerPtBr,
    evidence: q.kind === "evidence" ? q.evidenceEn : "",
  }));
  const interpretation =
    "Os amigos vão ao jardim e Emma oferece água a um pássaro.";
  const complete = {
    understanding: "complete",
    feedbackPtBr: "Você compreendeu as informações do texto.",
    understoodCorrectlyPtBr: ["Os amigos visitam um jardim."],
    missingIdeasPtBr: [],
    misunderstoodIdeasPtBr: [],
    referenceSummaryPtBr: "Emma e Ben visitam um jardim e observam um pássaro.",
    questionFeedback: answers.map((a) => ({
      questionId: a.questionId,
      isCorrect: true,
      feedbackPtBr: "Você identificou a informação correta.",
    })),
  };
  const previousFetch = globalThis.fetch;
  const previousEnabled = config.aiEnabled;
  const contexts: any[] = [];
  let malformed = false;
  config.aiEnabled = true;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const context = JSON.parse(body.messages[1].content);
    const isPassage = body.response_format.json_schema.name === "reading";
    if (isPassage) contexts.push(context);
    const data = isPassage
      ? { title: "A Morning in the Garden", text, questions }
      : {
          ...complete,
          questionFeedback: context.questions.length
            ? malformed
              ? [
                  complete.questionFeedback[0],
                  complete.questionFeedback[0],
                  complete.questionFeedback[0],
                ]
              : complete.questionFeedback
            : [],
        };
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(data) } }],
        usage: { cost: 0 },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const passages: any[] = [];
    for (let i = 0; i < 3; i++) {
      const passage = (
        await client.post("/api/readings/generate").send({}).expect(201)
      ).body;
      passages.push(passage);
      await client
        .post(`/api/readings/${passage.id}/interpretations`)
        .send({ attemptId: randomUUID(), interpretation, answers })
        .expect(200);
      if (i === 0) {
        // Different attempts on the same passage must not count as distinct readings.
        await evaluateReading(
          user.id,
          passage.id,
          randomUUID(),
          interpretation,
          answers as any,
        );
        await evaluateReading(
          user.id,
          passage.id,
          randomUUID(),
          interpretation,
          answers as any,
        );
        assert.equal(
          (await client.get("/api/readings/profile").expect(200)).body
            .difficulty,
          1,
        );
      }
    }
    assert.equal(
      (await client.get("/api/readings/profile").expect(200)).body.difficulty,
      2,
    );
    assert.equal(new Set(contexts.map((c) => c.textType)).size, 3);

    const vocabularyBody = {
      passageId: passages[0].id,
      term: "small garden",
      meaningPtBr: "pequeno jardim",
    };
    await client
      .post("/api/readings/vocabulary")
      .send({ ...vocabularyBody, term: "spaceship" })
      .expect(400);
    const saved = (
      await client
        .post("/api/readings/vocabulary")
        .send(vocabularyBody)
        .expect(200)
    ).body;
    assert.equal(saved.total, 1);
    assert.equal(saved.dueCount, 1);
    assert.match(saved.items[0].context_en, /small garden/);
    const duplicate = (
      await client
        .post("/api/readings/vocabulary")
        .send({ ...vocabularyBody, term: "SMALL GARDEN" })
        .expect(200)
    ).body;
    assert.equal(duplicate.total, 1);
    const card = duplicate.items[0];
    const review = {
      reviewId: randomUUID(),
      version: card.review_version,
      answer: "pequeno jardim",
      remembered: true,
    };
    const reviewed = (
      await client
        .post(`/api/readings/vocabulary/${card.id}/reviews`)
        .send(review)
        .expect(200)
    ).body;
    assert.equal(reviewed.items[0].review_version, 1);
    assert.equal(reviewed.dueCount, 0);
    assert.equal(
      (
        await client
          .post(`/api/readings/vocabulary/${card.id}/reviews`)
          .send(review)
          .expect(200)
      ).body.items[0].review_version,
      1,
    );
    await client
      .post(`/api/readings/vocabulary/${card.id}/reviews`)
      .send({ ...review, reviewId: randomUUID() })
      .expect(409);
    await client
      .post(`/api/readings/vocabulary/${card.id}/reviews`)
      .send({ ...review, remembered: false })
      .expect(409);
    await client
      .post("/api/readings/vocabulary")
      .send(vocabularyBody)
      .expect(200);
    assert.equal(
      (await client.get("/api/readings/vocabulary").expect(200)).body.dueCount,
      0,
      "Salvar a mesma palavra não reinicia o calendário.",
    );
    await pool.execute(
      "UPDATE reading_vocabulary SET next_review_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY) WHERE id=?",
      [card.id],
    );
    const forgotten = (
      await client
        .post(`/api/readings/vocabulary/${card.id}/reviews`)
        .send({
          reviewId: randomUUID(),
          version: 1,
          answer: "Não lembro.",
          remembered: false,
        })
        .expect(200)
    ).body.items[0];
    assert.equal(forgotten.streak, 0);
    assert.equal(forgotten.review_version, 2);
    const [schedule] = await rows(
      "SELECT TIMESTAMPDIFF(HOUR,UTC_TIMESTAMP(),next_review_at) hours FROM reading_vocabulary WHERE id=?",
      [card.id],
    );
    assert(schedule.hours >= 23 && schedule.hours <= 24);

    const next = (
      await client.post("/api/readings/generate").send({}).expect(201)
    ).body;
    assert.equal(next.difficulty, 2);
    assert.equal(contexts.at(-1).difficulty, 2);
    assert(contexts.at(-1).focusVocabulary.includes("small garden"));
    assert(
      !contexts
        .slice(0, 3)
        .map((c) => c.textType)
        .includes(contexts.at(-1).textType),
    );

    // Reject malformed grading without losing the student's answers, then retry.
    const attemptId = randomUUID();
    malformed = true;
    await assert.rejects(
      evaluateReading(
        user.id,
        next.id,
        attemptId,
        interpretation,
        answers as any,
      ),
      /não avaliou todas as perguntas/,
    );
    assert.deepEqual(
      (await client.get(`/api/readings/${next.id}`).expect(200)).body
        .draft_answers,
      answers,
    );
    malformed = false;
    await evaluateReading(
      user.id,
      next.id,
      attemptId,
      interpretation,
      answers as any,
    );

    // A legacy passage keeps its original interpretation-only workflow.
    const legacyId = randomUUID();
    const [origin] = await rows(
      "SELECT generation_id FROM reading_passages WHERE id=?",
      [passages[0].id],
    );
    await pool.execute(
      "INSERT INTO reading_passages(id,user_id,generation_id,title,content,theme,word_count,model) VALUES (?,?,?,?,?,?,?,?)",
      [
        legacyId,
        user.id,
        origin.generation_id,
        "An Older Reading",
        text,
        "jardim",
        text.split(/\s+/).length,
        "test",
      ],
    );
    assert.deepEqual(
      (await client.get(`/api/readings/${legacyId}`).expect(200)).body
        .questions,
      [],
    );
    await client
      .post(`/api/readings/${legacyId}/interpretations`)
      .send({ attemptId: randomUUID(), interpretation })
      .expect(200);

    const otherName = "reading_vocabulary_owner_" + Date.now();
    await createUser(otherName, password);
    const [otherUser] = await rows("SELECT id FROM users WHERE username=?", [
      otherName,
    ]);
    const other = await authenticatedReader(otherUser.id);
    assert.equal(
      (await other.get("/api/readings/vocabulary").expect(200)).body.total,
      0,
    );
    await other
      .post("/api/readings/vocabulary")
      .send(vocabularyBody)
      .expect(404);
    await other
      .post(`/api/readings/vocabulary/${card.id}/reviews`)
      .send({ ...review, reviewId: randomUUID() })
      .expect(404);
    await other.post("/api/auth/logout").send({}).expect(200);
  } finally {
    globalThis.fetch = previousFetch;
    config.aiEnabled = previousEnabled;
    await client.post("/api/auth/logout").send({}).expect(200);
  }
});

test("provas exigentes persistem respostas e só aprovação libera a próxima lição", async () => {
  const username = "exam_flow_" + Date.now();
  await createUser(username, password);
  const [user] = await rows("SELECT id FROM users WHERE username=?", [
    username,
  ]);
  const client = request.agent(app);
  await client.post("/api/auth/login").send({ username, password }).expect(200);
  await client.post("/api/study-sessions").send({ lessonId: 2 }).expect(403);
  await client.post("/api/exams").send({ lessonId: 2 }).expect(403);
  await client.get("/api/lessons/2/exercises").expect(403);
  const practice = (await client.get("/api/lessons/1/exercises").expect(200))
    .body;
  assert.equal(practice.length, 30);
  assert(practice.every((q: any) => !q.id.startsWith("exam-")));
  const multi = practice.find((q: any) => q.type === "multi_gap");
  const [official] = await rows(
    "SELECT accepted_answers FROM exercises WHERE id=?",
    [multi.id],
  );
  const references =
    typeof official.accepted_answers === "string"
      ? JSON.parse(official.accepted_answers)
      : official.accepted_answers;
  const partial = JSON.parse(references[0]);
  partial[multi.blanks[0].id] = "wrong";
  const studyId = randomUUID();
  await pool.execute(
    "INSERT INTO study_sessions(id,user_id,lesson_id,mode,exercise_ids) VALUES (?,?,?,?,?)",
    [studyId, user.id, 1, "lesson", JSON.stringify([multi.id])],
  );
  const feedback = (
    await client
      .post("/api/exercises/" + multi.id + "/answer")
      .send({ sessionId: studyId, answer: JSON.stringify(partial) })
      .expect(200)
  ).body;
  assert.equal(feedback.result, "incorrect");
  assert.equal(feedback.earnedPoints, multi.blanks.length - 1);
  assert.equal(feedback.totalPoints, multi.blanks.length);
  assert(!feedback.reference.includes("[["));
  const baseline = (await client.get("/api/progress/dashboard").expect(200))
    .body;
  const first = (
    await client.post("/api/exams").send({ lessonId: 1 }).expect(201)
  ).body;
  assert.equal(first.total, 12);
  assert.equal(first.grading, null);
  assert(!JSON.stringify(first).includes("accepted_answers"));
  assert(!JSON.stringify(first).includes("explanation"));
  assert.equal(
    new Set(first.questions.map((q: any) => q.id.replace(/-[ab]$/, ""))).size,
    12,
  );
  await client
    .post("/api/exams/" + first.id + "/submit")
    .send({})
    .expect(400);
  await client
    .post("/api/exams/" + first.id + "/answers")
    .send({ exerciseId: "to-be-1-1", answer: "I" })
    .expect(400);
  for (const question of first.questions) {
    const answer =
      question.type === "multi_gap"
        ? JSON.stringify(
            Object.fromEntries(
              question.blanks.map((b: any) => [b.id, "wrong"]),
            ),
          )
        : "wrong";
    await client
      .post("/api/exams/" + first.id + "/answers")
      .send({ exerciseId: question.id, answer })
      .expect(200);
  }
  const failed = (
    await client
      .post("/api/exams/" + first.id + "/submit")
      .send({})
      .expect(200)
  ).body;
  assert.equal(failed.grading.score, 0);
  assert.equal(failed.grading.passed, false);
  await client
    .post("/api/exams/" + first.id + "/answers")
    .send({ exerciseId: first.questions[0].id, answer: "changed" })
    .expect(409);
  await client.post("/api/study-sessions").send({ lessonId: 2 }).expect(403);
  const passed = await passExam(client, 1);
  assert.notEqual(passed.id, first.id);
  const repeated = (
    await client
      .post("/api/exams/" + passed.id + "/submit")
      .send({})
      .expect(200)
  ).body;
  assert.deepEqual(repeated.grading, passed.grading);
  const history = (await client.get("/api/exams/lessons/1/history").expect(200))
    .body;
  assert.equal(history.length, 2);
  const course = (await client.get("/api/stages").expect(200)).body.lessons;
  assert(course.find((l: any) => l.id === 1).examPassed);
  assert(course.find((l: any) => l.id === 2).isUnlocked);
  assert(!course.find((l: any) => l.id === 3).isUnlocked);
  const after = (await client.get("/api/progress/dashboard").expect(200)).body;
  assert.equal(after.stats.attempts, baseline.stats.attempts);
  assert.equal(after.progress, baseline.progress);
  assert.deepEqual(after.skills, baseline.skills);
  await client.post("/api/study-sessions").send({ lessonId: 2 }).expect(201);
  const third = (
    await client.post("/api/exams").send({ lessonId: 1 }).expect(201)
  ).body;
  assert.notEqual(third.id, passed.id);
  const resumed = (
    await client.post("/api/exams").send({ lessonId: 1 }).expect(201)
  ).body;
  assert.equal(resumed.id, third.id);
  await client
    .post("/api/exams/" + third.id + "/answers")
    .send({ exerciseId: third.questions[0].id, answer: "draft response" })
    .expect(200);
  const restored = (await client.get("/api/exams/" + third.id).expect(200))
    .body;
  assert.equal(restored.answers[third.questions[0].id], "draft response");
  const otherName = "exam_owner_" + Date.now();
  await createUser(otherName, password);
  const other = request.agent(app);
  await other
    .post("/api/auth/login")
    .send({ username: otherName, password })
    .expect(200);
  await other.get("/api/exams/" + third.id).expect(404);
  await other
    .post("/api/exams/" + third.id + "/answers")
    .send({ exerciseId: third.questions[0].id, answer: "tampered" })
    .expect(404);
  await other.post("/api/auth/logout").send({}).expect(200);
  await client.post("/api/auth/logout").send({}).expect(200);
});
