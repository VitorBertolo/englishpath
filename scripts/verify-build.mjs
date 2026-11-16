import dotenv from "dotenv";
import assert from "node:assert/strict";
import request from "supertest";
dotenv.config({ path: ".env", quiet: true });
const { app } = await import("../backend/dist/backend/src/app.js");
const { pool } = await import("../backend/dist/backend/src/db.js");
const agent = request.agent(app);
try {
  const home = await agent.get("/").expect(200);
  assert.match(home.text, /English Path/);
  const bundle = home.text.match(/src="(main-[^"]+\.js)"/)[1];
  await agent.get("/" + bundle).expect(200);
  await agent.get("/licao/1").expect(200);
  await agent.get("/leitura").expect(200);
  const health = await agent.get("/api/health").expect(200);
  assert.equal(health.body.database, "MariaDB");
  await agent
    .post("/api/auth/login")
    .send({
      username: process.env.INITIAL_USERNAME,
      password: process.env.INITIAL_PASSWORD,
    })
    .expect(200);
  const dashboard = await agent.get("/api/progress/dashboard").expect(200);
  assert(dashboard.body.total >= 450);
  const course = (await agent.get("/api/stages").expect(200)).body;
  assert.equal(course.stages.find((s) => s.id === 2).available, 1);
  assert.equal(course.modules.filter((m) => m.stage_id === 2).length, 4);
  const stageTwo = course.lessons.filter((l) => l.stage_id === 2);
  assert.equal(stageTwo.length, 9);
  assert(stageTwo.every((l) => l.total >= 30));
  const lesson = (await agent.get("/api/lessons/7").expect(200)).body;
  assert.equal(lesson.stage_id, 2);
  assert.equal(lesson.previousLessonId, 6);
  const vocabulary = (await agent.get("/api/vocabulary").expect(200)).body;
  assert.equal(vocabulary.filter((w) => w.stage_id === 2).length, 48);
  assert.equal(course.supportPlan.length, 7);
  assert.equal(course.activities.filter((a) => a.kind === "writing").length, 7);
  const activity = (
    await agent.get("/api/activities/writing-s1-v1").expect(200)
  ).body;
  assert.equal(activity.kind, "writing");
  assert.equal(activity.content.examples.length, 0);
  const support = (
    await agent.get("/api/activities/support-articles-v1").expect(200)
  ).body;
  assert.equal(support.content.questions.length, 3);
  assert(support.content.questions.every((q) => !("accepted_answers" in q)));
  const readingProfile = (await agent.get("/api/readings/profile").expect(200))
    .body;
  assert(readingProfile.difficulty >= 1 && readingProfile.difficulty <= 4);
  assert(["A1", "A2"].includes(readingProfile.level));
  const readingVocabulary = (
    await agent.get("/api/readings/vocabulary").expect(200)
  ).body;
  assert(Array.isArray(readingVocabulary.items));
  assert(readingVocabulary.total >= readingVocabulary.dueCount);
  const readings = (await agent.get("/api/readings").expect(200)).body;
  if (readings.length) {
    const passage = (
      await agent.get("/api/readings/" + readings[0].id).expect(200)
    ).body;
    assert([0, 3].includes(passage.questions.length));
    assert(
      passage.questions.every(
        (q) => !("referenceAnswerPtBr" in q) && !("evidenceEn" in q),
      ),
    );
    assert(Array.isArray(passage.draft_answers));
  }
  await agent.get("/atividade/writing-s1-v1").expect(200);
  await agent.post("/api/auth/logout").send({}).expect(200);
  console.log(
    "Build compilado verificado: HTML, bundles, rotas, MariaDB, login, dashboard, etapa 02, apoios, escrita, leitura adaptativa, vocabulário e logout. Nenhuma tentativa de estudo foi criada.",
  );
} finally {
  await pool.end();
}
