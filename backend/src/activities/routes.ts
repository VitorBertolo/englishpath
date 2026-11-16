import { Router, type RequestHandler } from "express";
import { z } from "zod";
import {
  getActivity,
  saveActivityDraft,
  submitActivity,
  reviewWriting,
} from "./service.js";
export function activitiesRouter(aiLimit: RequestHandler) {
  const router = Router();
  const activityId = (value: unknown) => z.string().min(1).max(80).parse(value);
  router.get("/:id", async (req, res) =>
    res.json(await getActivity(req.user.id, activityId(req.params.id))),
  );
  router.post("/:id/draft", async (req, res) => {
    const body = z
      .object({ response: z.string().max(5000) })
      .strict()
      .parse(req.body);
    res.json(
      await saveActivityDraft(
        req.user.id,
        activityId(req.params.id),
        body.response,
      ),
    );
  });
  router.post("/:id/submissions", async (req, res) => {
    const body = z
      .object({
        submissionId: z.uuid(),
        response: z.string().trim().min(5).max(5000),
        selfReview: z.array(z.boolean()).max(10),
      })
      .strict()
      .parse(req.body);
    res
      .status(201)
      .json(
        await submitActivity(
          req.user.id,
          activityId(req.params.id),
          body.submissionId,
          body.response,
          body.selfReview,
        ),
      );
  });
  router.post(
    "/:id/submissions/:submissionId/review",
    aiLimit,
    async (req, res) =>
      res.json(
        await reviewWriting(
          req.user.id,
          activityId(req.params.id),
          z.uuid().parse(req.params.submissionId),
        ),
      ),
  );
  return router;
}
