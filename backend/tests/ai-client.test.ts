import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenRouterClient, AiRequestError } from "../src/ai/client.js";
import { correctionSchema } from "../src/ai/schema.js";

const options = {
  baseUrl: "https://example.invalid/api/v1",
  apiKey: "test-secret-api-key",
  model: "test/model:free",
  maxTokens: 1000,
  timeoutMs: 1000,
  responseFormat: "auto" as const,
};
const valid = {
  isCorrect: true,
  suggestedAnswer: "She is my friend.",
  explanationPtBr: "A frase mantém o significado e a gramática.",
  errorType: "none",
  feedback: "Muito bem!",
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const success = () =>
  json({
    choices: [
      { finish_reason: "stop", message: { content: JSON.stringify(valid) } },
    ],
    usage: { total_tokens: 25, cost: 0 },
  });

test("usa JSON Schema quando o provedor oferece suporte", async () => {
  let calls = 0;
  const client = new OpenRouterClient(options, async (_url, init) => {
    calls++;
    const request = JSON.parse(String(init?.body));
    assert.equal(request.response_format.type, "json_schema");
    assert.equal(request.response_format.json_schema.strict, true);
    assert.equal(request.provider.require_parameters, true);
    return success();
  });
  const result = await client.complete("correction", correctionSchema, {
    answer: "She is my friend.",
  });
  assert.equal(result.data.isCorrect, true);
  assert.equal(result.responseFormat, "json_schema");
  assert.equal(calls, 1);
});

test("404 por parâmetros incompatíveis usa JSON e memoriza o formato, mantendo o esquema no prompt", async () => {
  const modes: string[] = [];
  const signals: unknown[] = [];
  const client = new OpenRouterClient(options, async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    modes.push(request.response_format.type);
    signals.push(init?.signal);
    if (modes.length === 1)
      return json(
        {
          error: {
            code: 404,
            message:
              "No endpoints found that can handle the requested parameters.",
          },
        },
        404,
      );
    assert.match(request.messages[0].content, /JSON Schema/);
    assert.match(request.messages[0].content, /explanationPtBr/);
    return success();
  });
  const result = await client.complete("correction", correctionSchema, {});
  assert.equal(result.responseFormat, "json_object");
  assert.equal(
    signals[0],
    signals[1],
    "As tentativas compartilham o mesmo prazo.",
  );
  await client.complete("correction", correctionSchema, {});
  assert.deepEqual(modes, ["json_schema", "json_object", "json_object"]);
});

test("400 de json_schema sem suporte também permite fallback", async () => {
  let calls = 0;
  const client = new OpenRouterClient(options, async () =>
    ++calls === 1
      ? json(
          {
            error: { message: "json_schema is not supported by this provider" },
          },
          400,
        )
      : success(),
  );
  assert.equal(
    (await client.complete("correction", correctionSchema, {})).responseFormat,
    "json_object",
  );
  assert.equal(calls, 2);
});

test("formatos explícitos respeitam a configuração e não fazem fallback", async () => {
  let calls = 0;
  const strict = new OpenRouterClient(
    { ...options, responseFormat: "json_schema" },
    async () => {
      calls++;
      return json(
        {
          error: {
            message:
              "No endpoints found that can handle the requested parameters.",
          },
        },
        404,
      );
    },
  );
  await assert.rejects(
    strict.complete("correction", correctionSchema, {}),
    (error: unknown) =>
      error instanceof AiRequestError &&
      error.code === "no_compatible_provider",
  );
  assert.equal(calls, 1);
  const plain = new OpenRouterClient(
    { ...options, responseFormat: "json_object" },
    async (_url, init) => {
      assert.equal(
        JSON.parse(String(init?.body)).response_format.type,
        "json_object",
      );
      return success();
    },
  );
  assert.equal(
    (await plain.complete("correction", correctionSchema, {})).responseFormat,
    "json_object",
  );
});

test("erros de chave, saldo, limite, permissão e indisponibilidade não geram uma segunda chamada", async () => {
  for (const [status, code] of [
    [401, "invalid_api_key"],
    [402, "insufficient_credits"],
    [403, "access_denied"],
    [429, "rate_limit"],
    [503, "provider_unavailable"],
  ] as const) {
    let calls = 0;
    const client = new OpenRouterClient(options, async () => {
      calls++;
      return json({ error: { message: "Request rejected" } }, status);
    });
    await assert.rejects(
      client.complete("correction", correctionSchema, {}),
      (error: unknown) =>
        error instanceof AiRequestError &&
        error.code === code &&
        error.providerStatus === status,
    );
    assert.equal(calls, 1);
  }
});

test("404 de modelo ausente não é confundido com incompatibilidade de formato", async () => {
  let calls = 0;
  const client = new OpenRouterClient(options, async () => {
    calls++;
    return json({ error: { message: "Model not found" } }, 404);
  });
  await assert.rejects(client.complete("correction", correctionSchema, {}));
  assert.equal(calls, 1);
});

test("retira a chave e bearer tokens de mensagens do provedor", async () => {
  const client = new OpenRouterClient(options, async () =>
    json(
      {
        error: {
          message: `Invalid key ${options.apiKey}; Authorization: Bearer sk-or-other-secret`,
        },
      },
      401,
    ),
  );
  await assert.rejects(
    client.complete("correction", correctionSchema, {}),
    (error: unknown) => {
      assert(error instanceof AiRequestError);
      assert(!JSON.stringify(error).includes(options.apiKey));
      assert(!JSON.stringify(error).includes("sk-or-other-secret"));
      assert.match(error.providerMessage!, /REDACTED/);
      return true;
    },
  );
});

test("extrai o diagnóstico de quota do provedor sem guardar metadados completos", async () => {
  const client = new OpenRouterClient(options, async () =>
    json(
      {
        error: {
          message: "Provider returned error",
          metadata: {
            raw: JSON.stringify({
              error: {
                message: `Quota exceeded: requests per day; key ${options.apiKey}`,
                details: [{ privateField: "do-not-log" }],
              },
            }),
          },
        },
      },
      429,
    ),
  );
  await assert.rejects(
    client.complete("correction", correctionSchema, {}),
    (error: unknown) => {
      assert(error instanceof AiRequestError);
      assert.match(error.providerMessage!, /requests per day/);
      assert(!JSON.stringify(error).includes(options.apiKey));
      assert(!JSON.stringify(error).includes("do-not-log"));
      return true;
    },
  );
});

test("preserva diagnóstico textual de limite upstream e remove segredos", async () => {
  const client = new OpenRouterClient(options, async () =>
    json(
      {
        error: {
          message: "Provider returned error",
          metadata: {
            raw: `Model temporarily rate-limited upstream; ${options.apiKey}`,
          },
        },
      },
      429,
    ),
  );
  await assert.rejects(
    client.complete("correction", correctionSchema, {}),
    (error: unknown) => {
      assert(error instanceof AiRequestError);
      assert.match(error.providerMessage!, /rate-limited upstream/);
      assert(!JSON.stringify(error).includes(options.apiKey));
      return true;
    },
  );
});

test("JSON inválido e resposta fora do esquema são recusados sem relaxar a validação", async () => {
  for (const [content, code] of [
    ["{invalid", "invalid_json"],
    [JSON.stringify({ ...valid, isCorrect: "yes" }), "invalid_response_schema"],
  ]) {
    let calls = 0;
    const client = new OpenRouterClient(
      { ...options, responseFormat: "json_object" },
      async () => {
        calls++;
        return json({ choices: [{ message: { content } }] });
      },
    );
    await assert.rejects(
      client.complete("correction", correctionSchema, {}),
      (error: unknown) =>
        error instanceof AiRequestError && error.code === code,
    );
    assert.equal(calls, 1);
  }
});

test("resposta vazia ou cortada tem diagnóstico específico e mantém uso disponível", async () => {
  for (const [content, finishReason, code] of [
    ["", "stop", "empty_response"],
    ["{", "length", "output_truncated"],
  ]) {
    const client = new OpenRouterClient(options, async () =>
      json({
        choices: [{ finish_reason: finishReason, message: { content } }],
        usage: { cost: 0.01 },
      }),
    );
    await assert.rejects(
      client.complete("correction", correctionSchema, {}),
      (error: unknown) =>
        error instanceof AiRequestError &&
        error.code === code &&
        error.usage.cost === 0.01,
    );
  }
});

test("erro de inferência dentro de HTTP 200 é reconhecido", async () => {
  const client = new OpenRouterClient(options, async () =>
    json({ error: { code: 429, message: "Rate limit exceeded" } }),
  );
  await assert.rejects(
    client.complete("correction", correctionSchema, {}),
    (error: unknown) =>
      error instanceof AiRequestError && error.code === "rate_limit",
  );
});

test("timeout e falha de rede são distinguidos", async () => {
  for (const [failure, code] of [
    [new DOMException("Timed out", "TimeoutError"), "timeout"],
    [new TypeError("fetch failed"), "network_error"],
  ] as const) {
    const client = new OpenRouterClient(options, async () => {
      throw failure;
    });
    await assert.rejects(
      client.complete("correction", correctionSchema, {}),
      (error: unknown) =>
        error instanceof AiRequestError && error.code === code,
    );
  }
});
