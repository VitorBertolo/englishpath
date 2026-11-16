import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { z } from "zod";
// Source and compiled builds have different depths; npm runs with backend as cwd.
import path from "node:path";
export const projectRoot = path.resolve(
  process.cwd(),
  process.cwd().endsWith("backend") ? ".." : ".",
);
dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });
const env = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3000),
    BIND_HOST: z.string().default("127.0.0.1"),
    APP_ORIGIN: z.string().default("http://localhost:4200"),
    DB_HOST: z.string().min(1, "Configure DB_HOST no .env."),
    DB_PORT: z.coerce.number().int().min(1).max(65535),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/),
    DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).default(10),
    DB_SSL: z.string().default("false"),
    DB_SSL_CA_FILE: z.string().optional(),
    SESSION_DAYS: z.coerce.number().min(1).max(90).default(14),
    TRUST_PROXY: z.string().default("false"),
    AI_ENABLED: z.string().default("false"),
    OPENROUTER_API_KEY: z.string().default(""),
    OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
    OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
    AI_MAX_TOKENS: z.coerce.number().min(100).max(16000).default(3500),
    AI_RESPONSE_FORMAT: z
      .enum(["auto", "json_schema", "json_object"])
      .default("auto"),
    AI_TIMEOUT_MS: z.coerce.number().min(100).max(60000).default(20000),
    SESSION_EXERCISES: z.coerce.number().int().min(1).max(20).default(20),
    SESSION_REVIEW_RATIO: z.coerce.number().min(0).max(0.8).default(0.25),
    MASTERY_MIN_ATTEMPTS: z.coerce.number().int().min(1).default(8),
    EXAM_PASS_PERCENT: z.coerce.number().min(50).max(100).default(85),
    EXAM_QUESTIONS: z.coerce.number().int().min(4).max(12).default(12),
    MASTERY_THRESHOLD: z.coerce.number().min(0.5).max(1).default(0.85),
    REVIEW_INTERVALS: z.string().default("1,3,7,14,30"),
  })
  .parse(process.env);
export const config = {
  ...env,
  aiEnabled: env.AI_ENABLED === "true" && !!env.OPENROUTER_API_KEY,
  ssl:
    env.DB_SSL === "true"
      ? {
          rejectUnauthorized: true,
          ...(env.DB_SSL_CA_FILE
            ? { ca: readFileSync(env.DB_SSL_CA_FILE, "utf8") }
            : {}),
        }
      : undefined,
};
