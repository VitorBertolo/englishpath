import { rows } from "../db.js";
import { getLessons } from "../curriculum/service.js";
export async function getSkills(userId: number) {
  return rows(
    `SELECT s.*,COALESCE(p.attempts,0) attempts,COALESCE(p.correct,0) correct,COALESCE(p.accuracy,0) accuracy,COALESCE(p.mastery,'new') mastery,p.last_practice FROM skills s LEFT JOIN skill_progress p ON p.skill_id=s.id AND p.user_id=? ORDER BY s.id`,
    [userId],
  );
}
export async function getDue(userId: number) {
  return rows(
    `SELECT e.id,e.prompt,e.type,e.lesson_id,l.title lesson_title,s.title skill_title,r.next_review,r.last_result FROM exercise_reviews r JOIN exercises e ON e.id=r.exercise_id JOIN lessons l ON l.id=e.lesson_id JOIN skills s ON s.id=e.skill_id WHERE r.user_id=? AND r.next_review<=UTC_TIMESTAMP() AND e.active=1 AND e.purpose='practice' AND EXISTS (SELECT 1 FROM study_sessions started WHERE started.user_id=r.user_id AND started.lesson_id=e.lesson_id AND started.mode='lesson') ORDER BY r.next_review`,
    [userId],
  );
}
export async function dashboard(userId: number) {
  const [stats] = await rows(
    `SELECT COUNT(*) attempts,COALESCE(SUM(result='correct'),0) correct,COALESCE(SUM(result='incorrect'),0) incorrect,COALESCE(SUM(result='needs_review'),0) needs_review FROM exercise_attempts WHERE user_id=?`,
    [userId],
  );
  const lessons = await getLessons(userId);
  const [active] = await rows(
    "SELECT id,lesson_id,position_index,JSON_LENGTH(exercise_ids) total FROM study_sessions WHERE user_id=? AND status='active' AND mode IN ('lesson','review') ORDER BY updated_at DESC LIMIT 1",
    [userId],
  );
  const current =
    lessons.find((l) => l.id === active?.lesson_id) ??
    lessons.find((l) => l.isUnlocked && !l.examPassed) ??
    lessons[lessons.length - 1];
  const due = await getDue(userId);
  const skills = await getSkills(userId);
  const total = lessons.reduce((n, l) => n + l.total, 0);
  const completed = lessons.reduce((n, l) => n + l.completed, 0);
  return {
    stats: {
      ...stats,
      accuracy:
        stats.correct + stats.incorrect
          ? Math.round(
              (stats.correct / (stats.correct + stats.incorrect)) * 100,
            )
          : null,
    },
    currentLesson: current,
    activeSession: active ? { ...active, cursor: active.position_index } : null,
    due: due.length,
    progress: total ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
    skills,
    difficultSkills: skills
      .filter((s) => s.attempts > 0 && s.accuracy < 0.85)
      .slice(0, 4),
  };
}
