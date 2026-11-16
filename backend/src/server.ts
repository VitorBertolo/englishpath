import { app } from "./app.js";
import { pool } from "./db.js";
import { config } from "./config.js";
try {
  console.log(
    `Conectando ao MariaDB: ${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME} | usuário: ${config.DB_USER}`,
  );
  await pool.query("SELECT 1");
  const server = app.listen(config.PORT, config.BIND_HOST, () =>
    console.log(
      `API: http://${config.BIND_HOST}:${config.PORT} | MariaDB: ${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME} | IA ${config.aiEnabled ? "ativa" : "desativada"}`,
    ),
  );
  const stop = () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (e: any) {
  console.error(
    "Banco indisponível:",
    e.code || e.name,
    "— confira .env e execute npm run setup.",
  );
  await pool.end();
  process.exitCode = 1;
}
