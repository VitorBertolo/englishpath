import { createUser } from "../auth/service.js";
import { pool } from "../db.js";
const username = process.env.INITIAL_USERNAME;
const password = process.env.INITIAL_PASSWORD;
if (!username || !password) {
  console.error("Configure INITIAL_USERNAME e INITIAL_PASSWORD no .env.");
  process.exitCode = 1;
  await pool.end();
} else
  try {
    await createUser(username, password);
    console.log(
      "Usuário disponível:",
      username,
      "(senhas existentes são preservadas).",
    );
    await pool.end();
  } catch (e: any) {
    console.error(e.code || e.message);
    await pool.end();
    process.exitCode = 1;
  }
