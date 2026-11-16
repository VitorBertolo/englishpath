import mysql, { type RowDataPacket, type PoolConnection } from "mysql2/promise";
import { config } from "./config.js";
export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  connectionLimit: config.DB_CONNECTION_LIMIT,
  charset: "utf8mb4",
  timezone: "Z",
  ssl: config.ssl,
  decimalNumbers: true,
  connectTimeout: 5000,
});
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
export async function rows<T = any>(
  sql: string,
  params: any[] = [],
  db: typeof pool | PoolConnection = pool,
): Promise<T[]> {
  const [r] = await db.execute<RowDataPacket[]>(sql, params);
  return r as T[];
}
export function json<T = any>(value: any): T {
  return typeof value === "string" ? JSON.parse(value) : value;
}
export async function transaction<T>(work: (db: PoolConnection) => Promise<T>) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const r = await work(db);
    await db.commit();
    return r;
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
