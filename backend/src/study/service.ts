import { randomUUID } from "node:crypto";
import { pool, rows, json, HttpError, transaction } from "../db.js";
import { config } from "../config.js";
import {
  publicExercise,
  parseExercise,
  getLesson,
  assertLessonUnlocked,
} from "../curriculum/service.js";
import {
  deterministicResult,
  type Result,
  answerComplete,
  gradeBlanks,
  referenceAnswer,
} from "../correction/evaluate.js";
import { correctWithAi } from "../ai/service.js";
import { mastery, scheduleReview } from "../progress/rules.js";
import { diverseSelection } from "./selection.js";
export async function getSession(userId: number, id: string) {
  const [s] = await rows(
    "SELECT * FROM study_sessions WHERE id=? AND user_id=?",
    [id, userId],
  );
  if (!s) throw new HttpError(404, "Sessão não encontrada.");
  const ids = json<string[]>(s.exercise_ids);
  const exercises = await rows(
    `SELECT * FROM exercises WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const ordered = ids.map((id) =>
    publicExercise(exercises.find((e) => e.id === id)),
  );
  return {
    ...s,
    cursor: s.position_index,
    exercise_ids: undefined,
    total: ids.length,
    exercises: ordered,
    attempts: (
      await rows(
        "SELECT exercise_id,result,feedback FROM exercise_attempts WHERE session_id=? AND user_id=? ORDER BY id",
        [id, userId],
      )
    ).map((a) => ({ ...a, feedback: json(a.feedback) })),
  };
}
export async function startSession(
  userId: number,
  lessonId: number,
  mode: "lesson" | "review",
) {
  await assertLessonUnlocked(userId, lessonId);
  // Serialize session creation on the user row, including simultaneous tabs.
  const id = await transaction(async (db) => {
    await rows("SELECT id FROM users WHERE id=? FOR UPDATE", [userId], db);
    const [active] = await rows(
      "SELECT id FROM study_sessions WHERE user_id=? AND lesson_id=? AND mode=? AND status='active' ORDER BY updated_at DESC LIMIT 1",
      [userId, lessonId, mode],
      db,
    );
    if (active) return active.id;
    let ids: string[] = [];
    if (mode === "review") {
      const candidates = await rows(
        "SELECT e.id,e.type,e.topic,e.family FROM exercise_reviews r JOIN exercises e ON e.id=r.exercise_id WHERE r.user_id=? AND r.next_review<=UTC_TIMESTAMP() AND e.active=1 AND e.purpose='practice' AND EXISTS (SELECT 1 FROM study_sessions started WHERE started.user_id=r.user_id AND started.lesson_id=e.lesson_id AND started.mode='lesson') ORDER BY r.next_review LIMIT ?",
        [userId, config.SESSION_EXERCISES],
        db,
      );
      ids = diverseSelection(candidates, config.SESSION_EXERCISES).map(
        (e) => e.id,
      );
    } else {
      const due = await rows(
        `SELECT e.id,e.type,e.topic,e.family FROM exercise_reviews r JOIN exercises e ON e.id=r.exercise_id WHERE r.user_id=? AND r.next_review<=UTC_TIMESTAMP() AND e.lesson_id<=? AND e.active=1 AND e.purpose='practice' AND EXISTS (SELECT 1 FROM study_sessions started WHERE started.user_id=r.user_id AND started.lesson_id=e.lesson_id AND started.mode='lesson') ORDER BY r.next_review LIMIT ?`,
        [
          userId,
          lessonId,
          Math.floor(config.SESSION_EXERCISES * config.SESSION_REVIEW_RATIO),
        ],
        db,
      );
      const current = await rows(
        `SELECT e.id,e.type,e.topic,e.family,COUNT(a.id) practice,MAX(a.id) last_attempt,COALESCE(p.accuracy,0) accuracy FROM exercises e LEFT JOIN exercise_attempts a ON a.exercise_id=e.id AND a.user_id=? LEFT JOIN skill_progress p ON p.skill_id=e.skill_id AND p.user_id=? WHERE e.lesson_id=? AND e.active=1 AND e.purpose='practice' GROUP BY e.id,e.type,e.topic,e.family,e.difficulty,p.accuracy ORDER BY practice ASC,e.difficulty ASC,accuracy ASC,COALESCE(MAX(a.id),0) ASC,e.id`,
        [userId, userId, lessonId],
        db,
      );
      const previous = await rows(
        `SELECT e.id,e.type,e.topic,e.family,MAX(a.id) last_attempt,COALESCE(p.accuracy,0) accuracy FROM exercises e JOIN exercise_attempts a ON a.exercise_id=e.id AND a.user_id=? LEFT JOIN skill_progress p ON p.skill_id=e.skill_id AND p.user_id=? WHERE e.lesson_id<? AND e.active=1 AND e.purpose='practice' AND EXISTS (SELECT 1 FROM study_sessions started WHERE started.user_id=a.user_id AND started.lesson_id=e.lesson_id AND started.mode='lesson') GROUP BY e.id,e.type,e.topic,e.family,p.accuracy ORDER BY accuracy ASC,last_attempt ASC LIMIT ?`,
        [userId, userId, lessonId, config.SESSION_EXERCISES],
        db,
      );
      const reviewQuota = Math.floor(
        config.SESSION_EXERCISES * config.SESSION_REVIEW_RATIO,
      );
      const review = diverseSelection([...due, ...previous], reviewQuota);
      const reviewIds = new Set(review.map((e) => e.id));
      const primary = diverseSelection(
        current.filter((e) => !reviewIds.has(e.id)),
        config.SESSION_EXERCISES - review.length,
      );
      ids = diverseSelection(
        [...primary, ...review],
        config.SESSION_EXERCISES,
      ).map((e) => e.id);
    }
    if (!ids.length)
      throw new HttpError(409, "Nenhum exercício pendente para esta sessão.");
    const id = randomUUID();
    await db.execute(
      "INSERT INTO study_sessions(id,user_id,lesson_id,mode,exercise_ids) VALUES (?,?,?,?,?)",
      [id, userId, lessonId, mode, JSON.stringify(ids)],
    );
    return id;
  });
  return getSession(userId, id);
}
// Coalesce concurrent retries before an optional paid AI call. The database unique
// constraint remains the durable guard across process restarts.
const inFlight = new Map<string, Promise<any>>();
export async function answerExercise(
  userId: number,
  sessionId: string,
  exerciseId: string,
  answer: string,
) {
  const key = `${userId}:${sessionId}:${exerciseId}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const work = performAnswer(userId, sessionId, exerciseId, answer);
  inFlight.set(key, work);
  try {
    return await work;
  } finally {
    inFlight.delete(key);
  }
}
async function performAnswer(
  userId: number,
  sessionId: string,
  exerciseId: string,
  answer: string,
) {
  const [s] = await rows(
    "SELECT * FROM study_sessions WHERE id=? AND user_id=?",
    [sessionId, userId],
  );
  if (!s) throw new HttpError(404, "Sessão não encontrada.");
  const [existing] = await rows(
    "SELECT feedback FROM exercise_attempts WHERE session_id=? AND exercise_id=? AND user_id=?",
    [sessionId, exerciseId, userId],
  );
  if (existing) return json(existing.feedback);
  const ids = json<string[]>(s.exercise_ids);
  if (s.status !== "active" || ids[s.position_index] !== exerciseId)
    throw new HttpError(
      409,
      "Responda ao exercício atual ou retome sua sessão.",
    );
  const [raw] = await rows("SELECT * FROM exercises WHERE id=?", [exerciseId]);
  const e = parseExercise(raw);
  if (e.purpose === "exam")
    throw new HttpError(
      400,
      "Questões de prova devem ser respondidas pela prova.",
    );
  if (!answerComplete(e, answer))
    throw new HttpError(400, "Preencha todas as lacunas antes de verificar.");
  if (s.mode === "lesson") await assertLessonUnlocked(userId, s.lesson_id);
  let result: Result = deterministicResult(answer, e);
  let method = "deterministic";
  let explanation = e.explanation;
  let message = "";
  let suggested = referenceAnswer(e);
  if (result === "needs_review" && config.aiEnabled) {
    try {
      const ai = await correctWithAi(userId, {
        exercise: {
          type: e.type,
          prompt: e.prompt,
          instruction: e.instruction,
          passage: e.passage,
          skill: (
            await rows("SELECT title FROM skills WHERE id=?", [e.skill_id])
          )[0]?.title,
          references: e.accepted_answers,
        },
        studentAnswer: answer,
        task: "Avalie o significado e a gramática. Aceite variações equivalentes sem alterar a pessoa, o tempo, a polaridade ou a informação. Para transformação, respeite a instrução.",
      });
      result = ai.data.isCorrect ? "correct" : "incorrect";
      method = "ai";
      explanation = ai.data.explanationPtBr;
      message = ai.data.feedback;
      suggested = ai.data.suggestedAnswer;
    } catch (error) {
      method = "fallback";
      message = `${error instanceof HttpError ? error.message : "A IA está indisponível."} Sua resposta foi salva para revisão.`;
    }
  }
  if (result === "needs_review" && !message)
    message =
      "Sua resposta difere das alternativas cadastradas. Ela foi salva para revisão, sem ser classificada como erro. Compare com a referência.";
  const feedback = {
    result,
    method,
    reference: referenceAnswer(e),
    suggestedAnswer: suggested,
    explanation,
    message,
    ...(e.type === "multi_gap" ? gradeBlanks(answer, e.blanks) : {}),
  };
  return transaction(async (db) => {
    const [locked] = await rows(
      "SELECT position_index,status FROM study_sessions WHERE id=? AND user_id=? FOR UPDATE",
      [sessionId, userId],
      db,
    );
    const [duplicate] = await rows(
      "SELECT feedback FROM exercise_attempts WHERE session_id=? AND exercise_id=? AND user_id=?",
      [sessionId, exerciseId, userId],
      db,
    );
    if (duplicate) return json(duplicate.feedback);
    if (locked.status !== "active" || ids[locked.position_index] !== exerciseId)
      throw new HttpError(
        409,
        "Esta sessão já avançou. Recarregue para continuar.",
      );
    await db.execute(
      "INSERT INTO exercise_attempts(user_id,exercise_id,session_id,skill_id,answer,result,method,feedback) VALUES (?,?,?,?,?,?,?,?)",
      [
        userId,
        exerciseId,
        sessionId,
        e.skill_id,
        answer,
        result,
        method,
        JSON.stringify(feedback),
      ],
    );
    const [old] = await rows(
      "SELECT streak FROM exercise_reviews WHERE user_id=? AND exercise_id=? FOR UPDATE",
      [userId, exerciseId],
      db,
    );
    const schedule = scheduleReview(
      result,
      old?.streak ?? 0,
      new Date(),
      config.REVIEW_INTERVALS.split(",").map(Number),
    );
    await db.execute(
      "INSERT INTO exercise_reviews(user_id,exercise_id,streak,next_review,last_result) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE streak=VALUES(streak),next_review=VALUES(next_review),last_result=VALUES(last_result)",
      [userId, exerciseId, schedule.streak, schedule.nextReview, result],
    );
    const recent = await rows(
      "SELECT result FROM exercise_attempts WHERE user_id=? AND skill_id=? ORDER BY id DESC LIMIT 20",
      [userId, e.skill_id],
      db,
    );
    const p = mastery(
      recent.map((x) => x.result),
      config.MASTERY_MIN_ATTEMPTS,
      config.MASTERY_THRESHOLD,
    );
    await db.execute(
      "INSERT INTO skill_progress(user_id,skill_id,attempts,correct,accuracy,mastery,last_practice) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE attempts=VALUES(attempts),correct=VALUES(correct),accuracy=VALUES(accuracy),mastery=VALUES(mastery),last_practice=VALUES(last_practice)",
      [userId, e.skill_id, p.attempts, p.correct, p.accuracy, p.mastery],
    );
    await db.execute(
      "UPDATE study_sessions SET position_index=position_index+1,status=IF(position_index>=?,'completed','active'),updated_at=UTC_TIMESTAMP(),finished_at=IF(position_index>=?,UTC_TIMESTAMP(),NULL) WHERE id=?",
      [ids.length, ids.length, sessionId],
    );
    return feedback;
  });
}
export async function finishSession(
  userId: number,
  id: string,
  action: "pause" | "finish",
) {
  const s = await getSession(userId, id);
  if (s.status !== "active") return s;
  // Pausing preserves an active resumable session; finishing closes only the session, never its history.
  await pool.execute(
    action === "pause"
      ? "UPDATE study_sessions SET updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?"
      : "UPDATE study_sessions SET status='finished',finished_at=UTC_TIMESTAMP(),updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=? AND status='active'",
    [id, userId],
  );
  return getSession(userId, id);
}
