import { Router } from "express";
import { z } from "zod";
import {
  startExam,
  getExam,
  examHistory,
  saveExamAnswer,
  submitExam,
} from "./service.js";
export const examsRouter = Router();
examsRouter.post("/", async (req, res) => {
  const body = z
    .object({ lessonId: z.number().int().positive() })
    .strict()
    .parse(req.body);
  res.status(201).json(await startExam(req.user.id, body.lessonId));
});
examsRouter.get("/lessons/:lessonId/history", async (req, res) =>
  res.json(
    await examHistory(
      req.user.id,
      z.coerce.number().int().positive().parse(req.params.lessonId),
    ),
  ),
);
examsRouter.get("/:id", async (req, res) =>
  res.json(await getExam(req.user.id, z.uuid().parse(req.params.id))),
);
examsRouter.post("/:id/answers", async (req, res) => {
  const body = z
    .object({
      exerciseId: z.string().min(1).max(80),
      answer: z.string().max(5000),
    })
    .strict()
    .parse(req.body);
  res.json(
    await saveExamAnswer(
      req.user.id,
      z.uuid().parse(req.params.id),
      body.exerciseId,
      body.answer,
    ),
  );
});
examsRouter.post("/:id/submit", async (req, res) => {
  z.object({})
    .strict()
    .parse(req.body ?? {});
  res.json(await submitExam(req.user.id, z.uuid().parse(req.params.id)));
});
