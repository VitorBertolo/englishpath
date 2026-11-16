import { Router, type RequestHandler } from "express";
import { z } from "zod";
import {
  createReading,
  getReading,
  listReadings,
  saveReadingDraft,
  evaluateReading,
  readingProfile,
} from "./service.js";
import { readingAnswersSchema } from "./rules.js";
import {
  listReadingVocabulary,
  saveReadingVocabulary,
  reviewReadingVocabulary,
} from "./vocabulary.js";

export const generateReadingHandler: RequestHandler = async (req, res) => {
  z.object({})
    .strict()
    .parse(req.body ?? {});
  res.status(201).json(await createReading(req.user.id));
};

export function readingRouter(aiLimit: RequestHandler) {
  const router = Router();
  router.get("/", async (req, res) =>
    res.json(await listReadings(req.user.id)),
  );
  router.post("/generate", aiLimit, generateReadingHandler);
  router.get("/profile", async (req, res) =>
    res.json(await readingProfile(req.user.id)),
  );
  router.get("/vocabulary", async (req, res) =>
    res.json(await listReadingVocabulary(req.user.id)),
  );
  router.post("/vocabulary", async (req, res) => {
    const body = z
      .object({
        passageId: z.uuid(),
        term: z.string().trim().min(1).max(120),
        meaningPtBr: z.string().trim().min(2).max(500),
      })
      .strict()
      .parse(req.body);
    res.json(
      await saveReadingVocabulary(
        req.user.id,
        body.passageId,
        body.term,
        body.meaningPtBr,
      ),
    );
  });
  router.post("/vocabulary/:id/reviews", async (req, res) => {
    const body = z
      .object({
        reviewId: z.uuid(),
        version: z.number().int().min(0),
        answer: z.string().trim().min(1).max(1000),
        remembered: z.boolean(),
      })
      .strict()
      .parse(req.body);
    res.json(
      await reviewReadingVocabulary(
        req.user.id,
        z.uuid().parse(req.params.id),
        body,
      ),
    );
  });
  router.get("/:id", async (req, res) =>
    res.json(await getReading(req.user.id, z.uuid().parse(req.params.id))),
  );
  router.post("/:id/draft", async (req, res) => {
    const { interpretation, answers } = z
      .object({
        interpretation: z.string().max(5000),
        answers: readingAnswersSchema.default([]),
      })
      .strict()
      .parse(req.body);
    res.json(
      await saveReadingDraft(
        req.user.id,
        z.uuid().parse(req.params.id),
        interpretation,
        answers,
      ),
    );
  });
  router.post("/:id/interpretations", aiLimit, async (req, res) => {
    const body = z
      .object({
        attemptId: z.uuid(),
        interpretation: z.string().trim().min(5).max(5000),
        answers: readingAnswersSchema.default([]),
      })
      .strict()
      .parse(req.body);
    res.json(
      await evaluateReading(
        req.user.id,
        z.uuid().parse(req.params.id),
        body.attemptId,
        body.interpretation,
        body.answers,
      ),
    );
  });
  return router;
}
