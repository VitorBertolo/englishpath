import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";
import { pool, HttpError } from "../db.js";
import {
  correctionSchema,
  generationSchema,
  readingPassageSchema,
  readingInterpretationSchema,
  writingFeedbackSchema,
} from "./schema.js";
import { OpenRouterClient, AiRequestError } from "./client.js";

const client = new OpenRouterClient({
  apiKey: config.OPENROUTER_API_KEY,
  baseUrl: config.OPENROUTER_BASE_URL,
  model: config.OPENROUTER_MODEL,
  maxTokens: config.AI_MAX_TOKENS,
  timeoutMs: config.AI_TIMEOUT_MS,
  responseFormat: config.AI_RESPONSE_FORMAT,
});

async function request<T>(
  userId: number,
  kind: string,
  schema: z.ZodType<T>,
  context: unknown,
): Promise<{ data: T; id: string }> {
  if (!config.aiEnabled)
    throw new HttpError(
      503,
      "IA desativada. Os exercícios do curso continuam disponíveis.",
    );
  const id = randomUUID();
  // Provider failures are recorded separately from database failures.
  let result: Awaited<ReturnType<typeof client.complete<T>>>;
  try {
    result = await client.complete(kind, schema, context);
  } catch (error) {
    const failure =
      error instanceof AiRequestError
        ? error
        : new AiRequestError(
            "unexpected_error",
            "Não foi possível concluir a solicitação de IA.",
          );
    const diagnostics = {
      code: failure.code,
      message: failure.message,
      providerStatus: failure.providerStatus,
      responseFormat: failure.responseFormat,
      providerMessage: failure.providerMessage,
    };
    console.warn(
      "Falha OpenRouter:",
      JSON.stringify({
        id,
        kind,
        model: config.OPENROUTER_MODEL,
        ...diagnostics,
      }),
    );
    try {
      await pool.execute(
        "INSERT IGNORE INTO ai_generations(id,user_id,kind,model,payload,status,usage_data,cost) VALUES (?,?,?,?,?,?,?,?)",
        [
          id,
          userId,
          kind,
          config.OPENROUTER_MODEL,
          JSON.stringify({ diagnostics }),
          "failed",
          failure.usage ? JSON.stringify(failure.usage) : null,
          typeof failure.usage?.cost === "number" ? failure.usage.cost : null,
        ],
      );
    } catch (logError: any) {
      console.error(
        "Falha ao registrar diagnóstico de IA:",
        logError.code || logError.name,
      );
    }
    throw new HttpError(502, failure.message);
  }
  const usage = {
    ...(result.usage ?? {}),
    _app: { responseFormat: result.responseFormat },
  };
  await pool.execute(
    "INSERT INTO ai_generations(id,user_id,kind,model,payload,status,usage_data,cost) VALUES (?,?,?,?,?,?,?,?)",
    [
      id,
      userId,
      kind,
      config.OPENROUTER_MODEL,
      JSON.stringify(result.data),
      kind === "exercises" ? "draft" : "validated",
      JSON.stringify(usage),
      typeof result.usage?.cost === "number" ? result.usage.cost : null,
    ],
  );
  return { data: result.data, id };
}

export const correctWithAi = (userId: number, context: unknown) =>
  request(userId, "correction", correctionSchema, context);
export const generateExercises = (userId: number, context: unknown) =>
  request(userId, "exercises", generationSchema, context);
export const generateReading = (userId: number, context: unknown) =>
  request(userId, "reading", readingPassageSchema, context);
export const assessReading = (userId: number, context: unknown) =>
  request(userId, "reading_feedback", readingInterpretationSchema, context);
export const assessWriting = (userId: number, context: unknown) =>
  request(userId, "writing_feedback", writingFeedbackSchema, context);
