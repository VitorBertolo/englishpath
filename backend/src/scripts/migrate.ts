import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool, rows } from "../db.js";
import { projectRoot, config } from "../config.js";
export async function migrate() {
  console.log(
    `Destino das migrations: ${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME} | usuário: ${config.DB_USER}`,
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(120) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB",
  );
  const dir = path.join(projectRoot, "database/migrations");
  const conn = await pool.getConnection();
  try {
    const [lock]: any = await conn.query("SELECT GET_LOCK(?, 15) AS acquired", [
      "english_migrate_" + config.DB_NAME,
    ]);
    if (lock[0].acquired !== 1)
      throw new Error("Outra migration está em execução.");
    for (const f of (await readdir(dir))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      if (
        (
          await rows(
            "SELECT version FROM schema_migrations WHERE version=?",
            [f],
            conn,
          )
        ).length
      )
        continue;
      const sql = await readFile(path.join(dir, f), "utf8");
      for (const statement of sql
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean))
        await conn.query(statement);
      await conn.execute("INSERT INTO schema_migrations(version) VALUES (?)", [
        f,
      ]);
      console.log("Migration aplicada:", f);
    }
  } finally {
    await conn.query("SELECT RELEASE_LOCK(?)", [
      "english_migrate_" + config.DB_NAME,
    ]);
    conn.release();
  }
}
if (/migrate\.(ts|js)$/.test(process.argv[1] ?? "")) {
  migrate()
    .then(() => pool.end())
    .catch(async (e) => {
      console.error("Falha na migration:", e.code || e.message);
      await pool.end();
      process.exitCode = 1;
    });
}
