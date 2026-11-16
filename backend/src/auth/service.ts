import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { RequestHandler } from "express";
import { rows, pool, HttpError } from "../db.js";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const tokenHash = (v: string) =>
  createHash("sha256").update(v).digest("hex");
declare global {
  namespace Express {
    interface Request {
      user: { id: number; username: string };
    }
  }
}
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.english_session;
    if (!token) throw new HttpError(401, "Entre para continuar.");
    const [user] = await rows(
      "SELECT u.id,u.username FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()",
      [tokenHash(token)],
    );
    if (!user) throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
};
export async function createUser(username: string, password: string) {
  if (password.length < 12)
    throw new Error("Use uma senha com pelo menos 12 caracteres.");
  await pool.execute(
    "INSERT INTO users(username,password_hash) VALUES (?,?) ON DUPLICATE KEY UPDATE username=VALUES(username)",
    [username, hashPassword(password)],
  );
}
export const newToken = () => randomBytes(32).toString("hex");
