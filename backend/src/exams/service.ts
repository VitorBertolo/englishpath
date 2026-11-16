import { randomUUID } from "node:crypto";
import { rows, json, transaction, HttpError } from "../db.js";
import { config } from "../config.js";
import {
  assertLessonUnlocked,
  parseExercise,
  publicExercise,
  getLesson,
} from "../curriculum/service.js";
import { selectExamQuestions, gradeExam, answeredCount } from "./rules.js";

export async function getExam(userId: number, id: string) {
  const [exam] = await rows(
    "SELECT * FROM exam_sessions WHERE id=? AND user_id=?",
    [id, userId],
  );
  if (!exam) throw new HttpError(404, "Prova não encontrada.");
  const questions = json<any[]>(exam.questions);
  const answers = json<Record<string, string>>(exam.answers);
  const lesson = await getLesson(userId, exam.lesson_id);
  const [next] = await rows(
    "SELECT l.id FROM lessons l JOIN modules m ON m.id=l.module_id JOIN stages st ON st.id=m.stage_id WHERE st.available=1 AND (m.stage_id>? OR (m.stage_id=? AND l.position>?)) ORDER BY m.stage_id,l.position LIMIT 1",
    [lesson.stage_id, lesson.stage_id, lesson.position],
  );
  return {
    id: exam.id,
    lessonId: exam.lesson_id,
    lessonTitle: lesson.title,
    stageId: lesson.stage_id,
    nextLessonId: next?.id ?? null,
    status: exam.status,
    questions: questions.map(publicExercise),
    answers,
    answeredCount: answeredCount(questions, answers),
    total: questions.length,
    passPercent: exam.pass_percent,
    grading: exam.status === "completed" ? json(exam.grading) : null,
    createdAt: exam.created_at,
    completedAt: exam.completed_at,
  };
}

export async function examHistory(userId: number, lessonId: number) {
  await getLesson(userId, lessonId);
  return rows(
    "SELECT id,status,score,passed,pass_percent,created_at,completed_at FROM exam_sessions WHERE user_id=? AND lesson_id=? ORDER BY created_at DESC,id DESC LIMIT 50",
    [userId, lessonId],
  );
}

export async function startExam(userId: number, lessonId: number) {
  await assertLessonUnlocked(userId, lessonId);
  const id = await transaction(async (db) => {
    await rows("SELECT id FROM users WHERE id=? FOR UPDATE", [userId], db);
    const [active] = await rows(
      "SELECT id FROM exam_sessions WHERE user_id=? AND lesson_id=? AND status='active' ORDER BY created_at DESC LIMIT 1",
      [userId, lessonId],
      db,
    );
    if (active) return active.id;
    const candidates = (
      await rows(
        "SELECT * FROM exercises WHERE lesson_id=? AND purpose='exam' AND active=1",
        [lessonId],
        db,
      )
    ).map(parseExercise);
    const questions = selectExamQuestions(candidates, config.EXAM_QUESTIONS);
    if (questions.length < config.EXAM_QUESTIONS)
      throw new HttpError(
        409,
        "Ainda não há questões suficientes para a prova desta lição.",
      );
    const id = randomUUID();
    await db.execute(
      "INSERT INTO exam_sessions(id,user_id,lesson_id,questions,answers,pass_percent) VALUES (?,?,?,?,?,?)",
      [
        id,
        userId,
        lessonId,
        JSON.stringify(questions),
        "{}",
        config.EXAM_PASS_PERCENT,
      ],
    );
    return id;
  });
  return getExam(userId, id);
}

export async function saveExamAnswer(
  userId: number,
  id: string,
  exerciseId: string,
  answer: string,
) {
  return transaction(async (db) => {
    const [exam] = await rows(
      "SELECT * FROM exam_sessions WHERE id=? AND user_id=? FOR UPDATE",
      [id, userId],
      db,
    );
    if (!exam) throw new HttpError(404, "Prova não encontrada.");
    if (exam.status !== "active")
      throw new HttpError(
        409,
        "Esta prova já foi finalizada. Inicie uma nova tentativa para responder novamente.",
      );
    const questions = json<any[]>(exam.questions);
    if (!questions.some((q) => q.id === exerciseId))
      throw new HttpError(400, "A questão não pertence a esta prova.");
    const answers = json<Record<string, string>>(exam.answers);
    answers[exerciseId] = answer;
    await db.execute(
      "UPDATE exam_sessions SET answers=?,updated_at=UTC_TIMESTAMP() WHERE id=?",
      [JSON.stringify(answers), id],
    );
    return { ok: true, answeredCount: answeredCount(questions, answers) };
  });
}

export async function submitExam(userId: number, id: string) {
  await transaction(async (db) => {
    const [exam] = await rows(
      "SELECT * FROM exam_sessions WHERE id=? AND user_id=? FOR UPDATE",
      [id, userId],
      db,
    );
    if (!exam) throw new HttpError(404, "Prova não encontrada.");
    if (exam.status === "completed") return;
    const questions = json<any[]>(exam.questions);
    const answers = json<Record<string, string>>(exam.answers);
    if (answeredCount(questions, answers) !== questions.length)
      throw new HttpError(
        400,
        "Responda todas as questões e lacunas antes de finalizar a prova.",
      );
    const grading = gradeExam(questions, answers, Number(exam.pass_percent));
    await db.execute(
      "UPDATE exam_sessions SET status='completed',grading=?,score=?,passed=?,completed_at=UTC_TIMESTAMP(),updated_at=UTC_TIMESTAMP() WHERE id=?",
      [JSON.stringify(grading), grading.score, grading.passed, id],
    );
  });
  return getExam(userId, id);
}
