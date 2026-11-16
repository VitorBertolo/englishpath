import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";
import { config, projectRoot } from "./config.js";
import { pool, rows, json, HttpError, transaction } from "./db.js";
import {
  requireAuth,
  verifyPassword,
  newToken,
  tokenHash,
  hashPassword,
} from "./auth/service.js";
import {
  getLesson,
  getLessons,
  publicExercise,
  assertLessonUnlocked,
} from "./curriculum/service.js";
import { examsRouter } from "./exams/routes.js";
import {
  answerExercise,
  startSession,
  getSession,
  finishSession,
} from "./study/service.js";
import { dashboard, getSkills, getDue } from "./progress/service.js";
import { generateExercises } from "./ai/service.js";
import { generatedExerciseSchema } from "./ai/schema.js";
import { readingRouter, generateReadingHandler } from "./reading/routes.js";
import { activitiesRouter } from "./activities/routes.js";
import { listActivities } from "./activities/service.js";
import { supportPlan } from "../../database/seeds/evolution.js";
export const app = express();
app.disable("x-powered-by");
if (config.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
const allowedOrigins = new Set([
  config.APP_ORIGIN,
  ...(config.NODE_ENV !== "production"
    ? [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]
    : []),
]);
app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (origin && !allowedOrigins.has(origin))
    return next(new HttpError(403, "Origem não permitida."));
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.get("sec-fetch-site") === "cross-site"
  )
    return next(new HttpError(403, "Solicitação externa bloqueada."));
  res.setHeader("Cache-Control", "no-store");
  next();
});
const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: config.SESSION_DAYS * 86400000,
};
const dummyHash = hashPassword("nonexistent-user-dummy-password");
app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "MariaDB" });
});
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Aguarde 15 minutos." },
  }),
  async (req, res) => {
    const input = z
      .object({
        username: z.string().trim().min(1).max(80),
        password: z.string().min(1).max(200),
      })
      .parse(req.body);
    const [user] = await rows("SELECT * FROM users WHERE username=?", [
      input.username,
    ]);
    const valid = verifyPassword(
      input.password,
      user?.password_hash ?? dummyHash,
    );
    if (!user || !valid)
      throw new HttpError(401, "Usuário ou senha incorretos.");
    const token = newToken();
    await pool.execute(
      "DELETE FROM auth_sessions WHERE expires_at<=UTC_TIMESTAMP()",
    );
    await pool.execute(
      "INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)",
      [
        tokenHash(token),
        user.id,
        new Date(Date.now() + config.SESSION_DAYS * 86400000),
      ],
    );
    res
      .cookie("english_session", token, cookieOptions)
      .json({ id: user.id, username: user.username });
  },
);
app.use("/api", requireAuth);
app.use("/api/exams", examsRouter);
app.get("/api/auth/me", (req, res) => res.json(req.user));
app.post("/api/auth/logout", async (req, res) => {
  await pool.execute("DELETE FROM auth_sessions WHERE token_hash=?", [
    tokenHash(req.cookies.english_session),
  ]);
  res
    .clearCookie("english_session", { ...cookieOptions, maxAge: undefined })
    .json({ ok: true });
});
app.get("/api/config", (req, res) =>
  res.json({
    aiEnabled: config.aiEnabled,
    aiModel: config.aiEnabled ? config.OPENROUTER_MODEL : null,
    masteryMin: config.MASTERY_MIN_ATTEMPTS,
    masteryThreshold: config.MASTERY_THRESHOLD,
    examPassPercent: config.EXAM_PASS_PERCENT,
    examQuestions: config.EXAM_QUESTIONS,
  }),
);
app.get("/api/stages", async (req, res) => {
  const lessons = await getLessons(req.user.id);
  res.json({
    stages: await rows("SELECT * FROM stages ORDER BY id"),
    modules: await rows("SELECT * FROM modules ORDER BY stage_id,position,id"),
    lessons,
    activities: await listActivities(req.user.id, lessons),
    supportPlan,
  });
});
const id = (value: unknown) => z.coerce.number().int().positive().parse(value);
app.get("/api/stages/:id", async (req, res) => {
  const stageId = id(req.params.id);
  const [stage] = await rows("SELECT * FROM stages WHERE id=?", [stageId]);
  if (!stage) throw new HttpError(404, "Etapa não encontrada.");
  res.json({
    ...stage,
    modules: await rows(
      "SELECT * FROM modules WHERE stage_id=? ORDER BY position,id",
      [stageId],
    ),
    lessons: (await getLessons(req.user.id)).filter(
      (l) => l.stage_id === stageId,
    ),
    activities: (await listActivities(req.user.id)).filter(
      (a) => a.stage_id === stageId,
    ),
    supportPlan: supportPlan.find((p) => p.stage_id === stageId)?.topics ?? [],
  });
});
app.get("/api/lessons/:id", async (req, res) =>
  res.json(await getLesson(req.user.id, id(req.params.id))),
);
app.get("/api/lessons/:id/exercises", async (req, res) => {
  const lesson = await assertLessonUnlocked(req.user.id, id(req.params.id));
  res.json(
    (
      await rows(
        "SELECT * FROM exercises WHERE lesson_id=? AND active=1 AND purpose='practice' ORDER BY difficulty,id",
        [lesson.id],
      )
    ).map(publicExercise),
  );
});
app.post("/api/study-sessions", async (req, res) => {
  if (req.body?.mode === "reading")
    throw new HttpError(
      410,
      "A leitura agora é uma prática independente. Abra a página Leitura para gerar um texto.",
    );
  const body = z
    .object({
      lessonId: z.number().int().positive(),
      mode: z.enum(["lesson", "review"]).default("lesson"),
    })
    .parse(req.body);
  res
    .status(201)
    .json(await startSession(req.user.id, body.lessonId, body.mode));
});
app.get("/api/study-sessions/:id", async (req, res) =>
  res.json(await getSession(req.user.id, z.uuid().parse(req.params.id))),
);
app.post("/api/study-sessions/:id/finish", async (req, res) => {
  const { action } = z
    .object({ action: z.enum(["pause", "finish"]).default("pause") })
    .parse(req.body);
  res.json(
    await finishSession(req.user.id, z.uuid().parse(req.params.id), action),
  );
});
app.post("/api/exercises/:id/answer", async (req, res) => {
  const input = z
    .object({
      sessionId: z.uuid(),
      answer: z.string().trim().min(1, "Escreva sua resposta.").max(2000),
    })
    .parse(req.body);
  res.json(
    await answerExercise(
      req.user.id,
      input.sessionId,
      z.string().min(1).max(80).parse(req.params.id),
      input.answer,
    ),
  );
});
app.get("/api/progress/dashboard", async (req, res) =>
  res.json(await dashboard(req.user.id)),
);
app.get("/api/progress/skills", async (req, res) =>
  res.json(await getSkills(req.user.id)),
);
app.get("/api/reviews/due", async (req, res) =>
  res.json(await getDue(req.user.id)),
);
app.get("/api/attempts", async (req, res) => {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(1)
    .parse(req.query.page);
  const data = await rows(
    "SELECT a.id,a.answer,a.result,a.method,a.created_at,a.feedback,e.prompt,l.title lesson_title,s.title skill_title,session.mode session_mode FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id JOIN lessons l ON l.id=e.lesson_id JOIN skills s ON s.id=a.skill_id JOIN study_sessions session ON session.id=a.session_id WHERE a.user_id=? ORDER BY a.id DESC LIMIT 25 OFFSET ?",
    [req.user.id, (page - 1) * 25],
  );
  res.json(data.map((a) => ({ ...a, feedback: json(a.feedback) })));
});
app.get("/api/vocabulary", async (req, res) =>
  res.json(await rows("SELECT * FROM vocabulary ORDER BY id")),
);
const aiLimit = rateLimit({
  windowMs: 60000,
  limit: 10,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Aguarde um minuto antes de gerar mais conteúdo." },
});
app.use("/api/readings", readingRouter(aiLimit));
app.use("/api/activities", activitiesRouter(aiLimit));
app.post("/api/ai/generate-exercises", aiLimit, async (req, res) => {
  const body = z
    .object({
      lessonId: z.number().int().positive(),
      skillId: z.number().int().positive(),
      difficulty: z.number().int().min(1).max(3).default(1),
      quantity: z.number().int().min(1).max(8).default(4),
      types: z
        .array(
          z.enum([
            "gap",
            "choice",
            "translate",
            "order",
            "transform",
            "reading",
          ]),
        )
        .min(1)
        .default(["gap", "choice", "translate", "order"]),
    })
    .parse(req.body);
  const lesson = await assertLessonUnlocked(req.user.id, body.lessonId);
  const skill = lesson.skills.find(
    (s: { id: number }) => s.id === body.skillId,
  );
  if (!skill) throw new HttpError(400, "A habilidade deve pertencer à lição.");
  const generated = await generateExercises(req.user.id, {
    ...body,
    stage: lesson.stage_id,
    lesson: lesson.title,
    skill: skill.title,
    explanation: lesson.explanation,
    task: "Gere exatamente quantity exercícios apenas dos tipos types. Respostas devem ser corretas e únicas nas alternativas. Use ___ para lacunas. Para order, todas as palavras da resposta precisam estar em words.",
  });
  if (
    generated.data.exercises.length !== body.quantity ||
    generated.data.exercises.some((e) => !body.types.includes(e.type))
  )
    throw new HttpError(
      502,
      "A IA não respeitou a quantidade ou os tipos solicitados. Nenhum exercício foi publicado.",
    );
  // Store association server-side; never trust lesson or skill from a publish request.
  await pool.execute("UPDATE ai_generations SET payload=? WHERE id=?", [
    JSON.stringify({
      ...generated.data,
      lessonId: body.lessonId,
      skillId: body.skillId,
    }),
    generated.id,
  ]);
  res.json({ id: generated.id, ...generated.data, status: "draft" });
});
app.post("/api/ai/generations/:id/approve", async (req, res) => {
  const generationId = z.uuid().parse(req.params.id);
  await transaction(async (db) => {
    const [g] = await rows(
      "SELECT * FROM ai_generations WHERE id=? AND user_id=? AND kind='exercises' FOR UPDATE",
      [generationId, req.user.id],
      db,
    );
    if (!g) throw new HttpError(404, "Geração não encontrada.");
    if (g.status === "approved") return;
    if (g.status !== "draft")
      throw new HttpError(409, "Geração indisponível para aprovação.");
    const payload = json(g.payload);
    if (!payload.lessonId || !payload.skillId)
      throw new HttpError(409, "Geração incompleta.");
    for (const [i, raw] of payload.exercises.entries()) {
      const e = generatedExerciseSchema.parse(raw);
      await db.execute(
        "INSERT INTO exercises(id,lesson_id,skill_id,type,prompt,instruction,passage,options,words,accepted_answers,explanation,difficulty,source,model) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          `ai-${generationId}-${i}`,
          payload.lessonId,
          payload.skillId,
          e.type,
          e.prompt,
          e.instruction,
          e.passage,
          e.options ? JSON.stringify(e.options) : null,
          e.words ? JSON.stringify(e.words) : null,
          JSON.stringify(e.accepted_answers),
          e.explanation,
          e.difficulty,
          "ai",
          g.model,
        ],
      );
    }
    await db.execute("UPDATE ai_generations SET status='approved' WHERE id=?", [
      generationId,
    ]);
  });
  res.json({ ok: true });
});
app.post("/api/ai/generate-reading", aiLimit, generateReadingHandler);
// AI correction is only available through the answer endpoint, with server-owned references.
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint não encontrado." }),
);
const web = path.join(projectRoot, "frontend/dist/browser");
if (existsSync(web)) {
  app.use(express.static(web));
  app.get("/{*path}", (req, res) => res.sendFile(path.join(web, "index.html")));
}
const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: "Dados inválidos.",
      details: error.issues.map((i) => i.message),
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON inválido." });
    return;
  }
  console.error("API error:", error.code || error.name);
  res.status(500).json({
    error: "Não foi possível concluir. Verifique o banco e tente novamente.",
  });
};
app.use(errorHandler);
