import { evaluateAnswer, structuredAnswer } from "../correction/evaluate.js";
import { HttpError } from "../db.js";
import type { ActivityContent } from "../../../database/seeds/evolution.js";
export function supportFeedback(content: ActivityContent, response: string) {
  const answers = structuredAnswer(response);
  const questions = content.questions ?? [];
  if (
    !answers ||
    Object.keys(answers).length !== questions.length ||
    !questions.every((q) => answers[q.id]?.trim())
  )
    throw new HttpError(400, "Responda a todas as questões desta atividade.");
  const fields = questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    answer: answers[q.id],
    reference: q.accepted_answers[0],
    explanation: q.explanation,
    correct: evaluateAnswer(answers[q.id], q.accepted_answers),
  }));
  return {
    fields,
    correct: fields.filter((f) => f.correct).length,
    total: fields.length,
  };
}
