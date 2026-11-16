import { randomUUID } from "node:crypto";
import { pool, rows, transaction, HttpError } from "../db.js";
import {
  containsReadingTerm,
  normalizeReadingText,
  vocabularySchedule,
} from "./rules.js";

export async function listReadingVocabulary(userId: number) {
  const [counts] = await rows(
    "SELECT COUNT(*) total,COALESCE(SUM(next_review_at<=UTC_TIMESTAMP()),0) dueCount FROM reading_vocabulary WHERE user_id=?",
    [userId],
  );
  const items = await rows(
    `SELECT id,passage_id,term,meaning_pt_br,context_en,streak,review_version,next_review_at,
     (next_review_at<=UTC_TIMESTAMP()) is_due FROM reading_vocabulary
     WHERE user_id=? ORDER BY next_review_at ASC,created_at DESC LIMIT 200`,
    [userId],
  );
  return {
    total: Number(counts.total),
    dueCount: Number(counts.dueCount),
    items,
  };
}

export async function saveReadingVocabulary(
  userId: number,
  passageId: string,
  term: string,
  meaning: string,
) {
  const [passage] = await rows(
    "SELECT content FROM reading_passages WHERE id=? AND user_id=?",
    [passageId, userId],
  );
  if (!passage) throw new HttpError(404, "Texto não encontrado.");
  const cleanTerm = normalizeReadingText(term);
  if (
    !/[\p{L}]/u.test(cleanTerm) ||
    !containsReadingTerm(passage.content, cleanTerm)
  )
    throw new HttpError(
      400,
      "Escolha uma palavra ou expressão que apareça neste texto.",
    );
  const context =
    passage.content
      .split(/(?<=[.!?])\s+|\n+/)
      .find((sentence: string) => containsReadingTerm(sentence, cleanTerm)) ??
    passage.content;
  await pool.execute(
    `INSERT INTO reading_vocabulary(id,user_id,passage_id,term,normalized_term,meaning_pt_br,context_en)
     VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE meaning_pt_br=VALUES(meaning_pt_br),
     passage_id=VALUES(passage_id),context_en=VALUES(context_en)`,
    [
      randomUUID(),
      userId,
      passageId,
      cleanTerm,
      cleanTerm.toLocaleLowerCase("en"),
      meaning,
      context,
    ],
  );
  return listReadingVocabulary(userId);
}

export async function reviewReadingVocabulary(
  userId: number,
  id: string,
  input: {
    reviewId: string;
    version: number;
    answer: string;
    remembered: boolean;
  },
) {
  await transaction(async (db) => {
    const [card] = await rows(
      "SELECT *,next_review_at<=UTC_TIMESTAMP() is_due FROM reading_vocabulary WHERE id=? AND user_id=? FOR UPDATE",
      [id, userId],
      db,
    );
    if (!card) throw new HttpError(404, "Expressão não encontrada.");
    const [previous] = await rows(
      "SELECT * FROM reading_vocabulary_reviews WHERE id=?",
      [input.reviewId],
      db,
    );
    if (previous) {
      if (
        previous.user_id !== userId ||
        previous.vocabulary_id !== id ||
        previous.answer !== input.answer ||
        Boolean(previous.remembered) !== input.remembered ||
        previous.review_version !== input.version
      )
        throw new HttpError(
          409,
          "Esta revisão já está associada a outra resposta.",
        );
      return;
    }
    if (input.version !== card.review_version || !card.is_due)
      throw new HttpError(
        409,
        "Esta expressão já foi revisada. Atualize sua lista para continuar.",
      );
    const scheduled = vocabularySchedule(input.remembered, card.streak);
    await db.execute(
      "INSERT INTO reading_vocabulary_reviews(id,vocabulary_id,user_id,answer,remembered,review_version) VALUES (?,?,?,?,?,?)",
      [
        input.reviewId,
        id,
        userId,
        input.answer,
        input.remembered,
        input.version,
      ],
    );
    await db.execute(
      "UPDATE reading_vocabulary SET streak=?,review_version=review_version+1,next_review_at=?,last_reviewed_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?",
      [scheduled.streak, scheduled.nextReview, id, userId],
    );
  });
  return listReadingVocabulary(userId);
}
