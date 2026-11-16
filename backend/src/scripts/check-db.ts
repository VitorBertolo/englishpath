import { config } from "../config.js";
import { pool, rows } from "../db.js";

console.log(
  `MariaDB: ${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME} | usuário: ${config.DB_USER}`,
);
try {
  const [identity] = await rows(
    "SELECT DATABASE() database_name, @@hostname server_name, VERSION() version",
  );
  if (identity.database_name !== config.DB_NAME)
    throw new Error(
      "O banco conectado não corresponde ao DB_NAME configurado.",
    );
  console.log("Conexão confirmada:", JSON.stringify(identity));
  const tables = await rows(
    "SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME",
    [config.DB_NAME],
  );
  console.log(
    `Tabelas (${tables.length}): ${tables.map((table) => table.name).join(", ") || "nenhuma"}`,
  );
  const names = new Set(tables.map((table) => table.name));
  if (
    [
      "stages",
      "lessons",
      "skills",
      "exercises",
      "users",
      "vocabulary",
      "exercise_attempts",
    ].every((name) => names.has(name))
  ) {
    const [counts] = await rows(
      "SELECT (SELECT COUNT(*) FROM stages) stages, (SELECT COUNT(*) FROM lessons) lessons, (SELECT COUNT(*) FROM skills) skills, (SELECT COUNT(*) FROM exercises) exercises, (SELECT COUNT(*) FROM vocabulary) vocabulary, (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM exercise_attempts) attempts",
    );
    console.log("Conteúdo persistido:", JSON.stringify(counts));
  }
} catch (error: any) {
  console.error("Falha ao verificar o banco:", error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
