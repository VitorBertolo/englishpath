import { rows, json, HttpError } from "../db.js";
import { config } from "../config.js";
export async function getLessons(userId: number) {
  const data = await rows(
    `SELECT l.*,m.stage_id,m.title module_title,m.position module_position,st.title stage_title,st.available stage_available, (SELECT COUNT(*) FROM exercises e WHERE e.lesson_id=l.id AND e.active=1 AND e.purpose='practice') total,
 (SELECT COUNT(DISTINCT a.exercise_id) FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id JOIN study_sessions session ON session.id=a.session_id WHERE a.user_id=? AND a.result='correct' AND e.lesson_id=l.id AND e.active=1 AND e.purpose='practice' AND session.mode IN ('lesson','review') AND ((session.mode='lesson' AND session.lesson_id=l.id) OR EXISTS (SELECT 1 FROM exercise_attempts exposure JOIN study_sessions origin ON origin.id=exposure.session_id WHERE exposure.user_id=a.user_id AND exposure.exercise_id=a.exercise_id AND exposure.id<a.id AND origin.mode='lesson' AND origin.lesson_id=l.id))) completed, (SELECT COUNT(*) FROM exercise_attempts prior JOIN exercises retired ON retired.id=prior.exercise_id WHERE prior.user_id=? AND retired.lesson_id=l.id AND retired.active=0 AND retired.source='seed') archivedPracticeAttempts FROM lessons l JOIN modules m ON m.id=l.module_id JOIN stages st ON st.id=m.stage_id ORDER BY m.stage_id,l.position`,
    [userId, userId],
  );
  const exams = await rows(
    "SELECT lesson_id,COUNT(*) attempts,MAX(score) best_score,MAX(passed) passed FROM exam_sessions WHERE user_id=? AND status='completed' GROUP BY lesson_id",
    [userId],
  );
  const active = await rows(
    "SELECT id,lesson_id FROM exam_sessions WHERE user_id=? AND status='active'",
    [userId],
  );
  return data.map((l, index) => ({
    ...l,
    examples: json(l.examples),
    progress: l.total ? Math.round((l.completed / l.total) * 100) : 0,
    examPassed: !!exams.find((e) => e.lesson_id === l.id)?.passed,
    examAttempts: exams.find((e) => e.lesson_id === l.id)?.attempts ?? 0,
    bestExamScore: exams.find((e) => e.lesson_id === l.id)?.best_score ?? null,
    activeExamId: active.find((e) => e.lesson_id === l.id)?.id ?? null,
    isUnlocked:
      !!l.stage_available &&
      (index === 0 ||
        !!exams.find((e) => e.lesson_id === data[index - 1].id)?.passed),
    previousLessonId: index > 0 ? data[index - 1].id : null,
    examPassPercent: config.EXAM_PASS_PERCENT,
  }));
}
export async function assertLessonUnlocked(userId: number, id: number) {
  const lesson = await getLesson(userId, id);
  if (!lesson.isUnlocked)
    throw new HttpError(
      403,
      `Conclua a prova da lição anterior com pelo menos ${config.EXAM_PASS_PERCENT}% para liberar esta lição.`,
    );
  return lesson;
}
export async function getLesson(userId: number, id: number) {
  const lesson = (await getLessons(userId)).find((l) => l.id === id);
  if (!lesson) throw new HttpError(404, "Lição não encontrada.");
  return {
    ...lesson,
    skills: await rows("SELECT * FROM skills WHERE lesson_id=?", [id]),
    supportActivities: await rows(
      "SELECT id,title FROM learning_activities WHERE lesson_id=? AND kind='support' ORDER BY position,id",
      [id],
    ),
  };
}
export function parseExercise(e: any) {
  return {
    ...e,
    options: json(e.options),
    words: json(e.words),
    accepted_answers: json(e.accepted_answers),
    blanks: json(e.blanks),
  };
}
export function publicExercise(e: any) {
  return {
    id: e.id,
    lesson_id: e.lesson_id,
    skill_id: e.skill_id,
    type: e.type,
    topic: e.topic,
    prompt: e.prompt,
    instruction: e.instruction,
    passage: e.passage,
    options: json(e.options),
    words: json(e.words),
    difficulty: e.difficulty,
    blanks:
      json<any[] | null>(e.blanks)?.map(({ id, label, options }) => ({
        id,
        label,
        options,
      })) ?? null,
  };
}
