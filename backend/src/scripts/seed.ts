import { pool, transaction } from "../db.js";
import {
  stages,
  modules,
  lessons,
  exercises,
  vocabulary,
} from "../../../database/seeds/catalog.js";
import { legacyStageOneIds } from "../../../database/seeds/legacy.js";
import { learningActivities } from "../../../database/seeds/evolution.js";
export async function seed() {
  await transaction(async (db) => {
    for (const [i, s] of stages.entries())
      await db.execute(
        "INSERT INTO stages(id,title,description,available) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),description=VALUES(description),available=VALUES(available)",
        [i + 1, ...s, modules.some((m) => m.stage_id === i + 1)],
      );
    for (const m of modules)
      await db.execute(
        "INSERT INTO modules(id,stage_id,position,title) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE stage_id=VALUES(stage_id),position=VALUES(position),title=VALUES(title)",
        [m.id, m.stage_id, m.position, m.title],
      );
    for (const l of lessons) {
      await db.execute(
        "INSERT INTO lessons(id,module_id,position,title,objective,explanation,examples) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE module_id=VALUES(module_id),position=VALUES(position),title=VALUES(title),objective=VALUES(objective),explanation=VALUES(explanation),examples=VALUES(examples)",
        [
          l.id,
          l.module_id,
          l.position,
          l.title,
          l.objective,
          l.explanation,
          JSON.stringify(l.examples),
        ],
      );
      for (const [i, title] of l.skills.entries())
        await db.execute(
          "INSERT INTO skills(id,lesson_id,title) VALUES (?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)",
          [l.id * 10 + i + 1, l.id, title],
        );
    }
    const exerciseValues = exercises.map((e) => [
      e.id,
      e.lesson_id,
      e.skill_id,
      e.type,
      e.prompt,
      e.instruction,
      e.passage || null,
      e.options ? JSON.stringify(e.options) : null,
      e.words ? JSON.stringify(e.words) : null,
      JSON.stringify(e.accepted_answers),
      e.explanation,
      e.difficulty,
      e.purpose ?? "practice",
      e.blanks ? JSON.stringify(e.blanks) : null,
      e.family ?? null,
      e.strict_form ?? false,
      e.topic ?? null,
    ]);
    const placeholders = exerciseValues
      .map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .join(",");
    await db.execute(
      "INSERT INTO exercises(id,lesson_id,skill_id,type,prompt,instruction,passage,options,words,accepted_answers,explanation,difficulty,purpose,blanks,family,strict_form,topic) VALUES " +
        placeholders +
        " ON DUPLICATE KEY UPDATE id=VALUES(id)",
      exerciseValues.flat(),
    );
    const legacyPlaceholders = legacyStageOneIds.map(() => "?").join(",");
    await db.execute(
      `UPDATE exercises SET active=0 WHERE source='seed' AND id IN (${legacyPlaceholders})`,
      legacyStageOneIds,
    );
    // Old prompts and feedback remain unchanged. A new practice session uses the new pool.
    // Exam sessions have their own immutable snapshots and must stay resumable.
    await db.execute(
      `UPDATE study_sessions s SET status='finished',closure_reason='catalog_refresh',finished_at=UTC_TIMESTAMP(),updated_at=UTC_TIMESTAMP() WHERE s.status='active' AND s.mode IN ('lesson','review') AND EXISTS (SELECT 1 FROM exercises e WHERE e.source='seed' AND e.active=0 AND e.id IN (${legacyPlaceholders}) AND JSON_CONTAINS(s.exercise_ids,JSON_QUOTE(e.id)))`,
      legacyStageOneIds,
    );
    for (const e of exercises.filter((e) => e.strict_form))
      await db.execute("UPDATE exercises SET strict_form=1 WHERE id=?", [e.id]);
    for (const v of vocabulary)
      await db.execute(
        "INSERT INTO vocabulary(id,stage_id,word,translation,example) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE stage_id=VALUES(stage_id),word=VALUES(word),translation=VALUES(translation),example=VALUES(example)",
        [v.id, v.stage_id, v.word, v.translation, v.example],
      );
    for (const activity of learningActivities)
      await db.execute(
        "INSERT INTO learning_activities(id,stage_id,lesson_id,position,kind,title,content) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),content=VALUES(content),position=VALUES(position)",
        [
          activity.id,
          activity.stage_id,
          activity.lesson_id,
          activity.position,
          activity.kind,
          activity.title,
          JSON.stringify(activity.content),
        ],
      );
  });
  console.log(
    `Seed idempotente: ${stages.length} etapas, ${modules.length} módulos, ${lessons.length} lições, ${exercises.filter((e) => e.purpose === "practice").length} exercícios de prática, ${exercises.filter((e) => e.purpose === "exam").length} questões de prova e ${vocabulary.length} palavras. Histórico preservado.`,
  );
}
if (/seed\.(ts|js)$/.test(process.argv[1] ?? ""))
  seed()
    .then(() => pool.end())
    .catch(async (e) => {
      console.error(e.code || e.message);
      await pool.end();
      process.exitCode = 1;
    });
