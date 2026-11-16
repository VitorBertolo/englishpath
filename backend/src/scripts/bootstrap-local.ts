import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
// First local initialization only. A password is assigned to root after provisioning.
const file = path.resolve("../.env");
const rootSecret = path.resolve("../.runtime/local-root-secret");
const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
if (
  existing &&
  (!/^DB_HOST=127\.0\.0\.1\s*$/m.test(existing) ||
    !/^DB_PORT=3307\s*$/m.test(existing) ||
    !/^DB_USER=english_app\s*$/m.test(existing) ||
    !/^DB_NAME=curso_ingles_db\s*$/m.test(existing))
)
  throw new Error(
    "O setup portátil exige as configurações locais padrão. Seu .env foi preservado. Use npm run setup para um banco já configurado.",
  );
const dbPassword =
  existing.match(/^DB_PASSWORD=(.*)$/m)?.[1] || randomBytes(24).toString("hex");
const rootPassword = existsSync(rootSecret)
  ? readFileSync(rootSecret, "utf8")
  : "";
const db = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: rootPassword,
});
await db.query(
  "CREATE DATABASE IF NOT EXISTS curso_ingles_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
);
await db.query(
  "CREATE DATABASE IF NOT EXISTS curso_ingles_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
);
await db.query(
  "CREATE USER IF NOT EXISTS 'english_app'@'127.0.0.1' IDENTIFIED BY ?",
  [dbPassword],
);
await db.query(
  "GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON curso_ingles_db.* TO 'english_app'@'127.0.0.1'",
);
await db.query(
  "GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON curso_ingles_test.* TO 'english_app'@'127.0.0.1'",
);
if (!rootPassword) {
  const secret = randomBytes(32).toString("hex");
  await db.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [secret]);
  writeFileSync(rootSecret, secret);
}
if (!existing) {
  let template = readFileSync(path.resolve("../.env.example"), "utf8");
  template = template
    .replace(/^DB_HOST=.*$/m, "DB_HOST=127.0.0.1")
    .replace(/^DB_PORT=.*$/m, "DB_PORT=3307")
    .replace(/^DB_USER=.*$/m, "DB_USER=english_app")
    .replace("change-this-database-password", dbPassword)
    .replace(
      "change-this-login-password",
      randomBytes(12).toString("base64url"),
    );
  writeFileSync(file, template);
}
await db.end();
console.log(
  "Banco local e usuário da aplicação preparados. Credenciais locais em .env (não versionado).",
);
