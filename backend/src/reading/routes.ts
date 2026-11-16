import { Router, type RequestHandler } from "express";
import { z } from "zod";
import {
  createReading,
  getReading,
  listReadings,
  saveReadingDraft,
  evaluateReading,
} from "./service.js";

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
  router.get("/:id", async (req, res) =>
    res.json(await getReading(req.user.id, z.uuid().parse(req.params.id))),
  );
  router.post("/:id/draft", async (req, res) => {
    const { interpretation } = z
      .object({ interpretation: z.string().max(5000) })
      .strict()
      .parse(req.body);
    res.json(
      await saveReadingDraft(
        req.user.id,
        z.uuid().parse(req.params.id),
        interpretation,
      ),
    );
  });
  router.post("/:id/interpretations", aiLimit, async (req, res) => {
    const body = z
      .object({
        attemptId: z.uuid(),
        interpretation: z.string().trim().min(5).max(5000),
      })
      .strict()
      .parse(req.body);
    res.json(
      await evaluateReading(
        req.user.id,
        z.uuid().parse(req.params.id),
        body.attemptId,
        body.interpretation,
      ),
    );
  });
  return router;
}
