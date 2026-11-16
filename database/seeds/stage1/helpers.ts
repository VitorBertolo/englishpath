import type { Exercise, Blank } from "../catalog.js";
export type Draft = Omit<
  Exercise,
  "id" | "lesson_id" | "skill_id" | "difficulty" | "purpose" | "family"
> & { topic: string; caseKey?: string };
const pronouns = ["I", "you", "he", "she", "it", "we", "they"];
function bank(answer: string) {
  const a = answer.toLowerCase().replace(/[’‘]/g, "'");
  if (pronouns.map((x) => x.toLowerCase()).includes(a)) return pronouns;
  if (["am", "is", "are"].includes(a)) return ["am", "is", "are"];
  if (["am not", "is not", "are not"].includes(a))
    return ["am not", "is not", "are not"];
  if (["a", "an"].includes(a)) return ["a", "an", "are"];
  if (["isn't", "aren't"].includes(a)) return ["isn't", "aren't", "am not"];
  if (
    ["i'm", "you're", "he's", "she's", "it's", "we're", "they're"].includes(a)
  )
    return ["I'm", "you're", "he's", "she's", "it's", "we're", "they're"];
  throw new Error("Não há alternativas definidas para: " + answer);
}
export function G(
  topic: string,
  text: string,
  answers: string[],
  explanation: string,
  strict = false,
): Draft {
  let index = 0;
  const prompt = text.replace(/\{\}/g, () => `[[b${++index}]]`);
  if (index !== answers.length)
    throw new Error("Lacunas incompatíveis em " + topic);
  const blanks: Blank[] = answers.map((answer, i) => ({
    id: `b${i + 1}`,
    label: `Lacuna ${i + 1}`,
    accepted_answers: [answer],
    strict_form: strict,
    ...(i % 2 === 0 ? { options: bank(answer) } : {}),
  }));
  return {
    topic,
    type: "multi_gap",
    prompt,
    instruction: strict
      ? "Complete o texto usando as contrações adequadas."
      : "Leia a situação e complete todas as lacunas. Escolha ou escreva a resposta.",
    accepted_answers: [
      JSON.stringify(
        Object.fromEntries(blanks.map((b) => [b.id, b.accepted_answers[0]])),
      ),
    ],
    blanks,
    explanation,
  };
}
export function C(
  topic: string,
  prompt: string,
  right: string,
  wrong: string[],
  explanation: string,
  passage?: string,
): Draft {
  return {
    topic,
    type: passage ? "reading" : "choice",
    prompt,
    instruction:
      "Leia o contexto e escolha a alternativa que resolve a tarefa.",
    options: [right, ...wrong],
    accepted_answers: [right],
    explanation,
    ...(passage ? { passage } : {}),
  };
}
export function O(
  topic: string,
  prompt: string,
  answer: string,
  explanation: string,
): Draft {
  return {
    topic,
    type: "order",
    prompt,
    instruction:
      "Monte a frase com todas as palavras, preservando a pontuação interna.",
    words: answer
      .replace(/[.!?]$/, "")
      .split(" ")
      .reverse(),
    accepted_answers: [answer],
    explanation,
  };
}
export function T(
  topic: string,
  prompt: string,
  answer: string,
  explanation: string,
  strict_form = false,
): Draft {
  return {
    topic,
    type: "transform",
    prompt,
    instruction:
      "Faça apenas as mudanças solicitadas e mantenha as demais informações.",
    accepted_answers: [answer],
    explanation,
    strict_form,
  };
}
export function X(
  topic: string,
  prompt: string,
  answer: string,
  explanation: string,
  strict_form = false,
): Draft {
  return {
    topic,
    type: "translate",
    prompt,
    instruction:
      "Traduza para o inglês, preservando as informações da situação.",
    accepted_answers: [answer],
    explanation,
    strict_form,
  };
}
export function B(
  topic: string,
  prompt: string,
  answer: string,
  explanation: string,
): Draft {
  return {
    topic,
    type: "gap",
    prompt,
    instruction: "Complete a lacuna de acordo com a situação.",
    accepted_answers: [answer],
    explanation,
  };
}
function mixed<T>(values: T[], seed: number): T[] {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function buildModule(
  lesson: number,
  practice: Draft[],
  exam: Draft[],
  stage = 1,
): Exercise[] {
  if (practice.length !== 30 || exam.length !== 24)
    throw new Error(
      `Lição ${lesson}: esperado 30/24, recebido ${practice.length}/${exam.length}`,
    );
  return (
    [
      ["practice", practice],
      ["exam", exam],
    ] as const
  ).flatMap(([purpose, items]) =>
    items.map((draft, index) => {
      const id = `s${stage}-v${stage === 1 ? 2 : 1}-l${lesson}-${purpose === "practice" ? "p" : "e"}${String(index + 1).padStart(2, "0")}`;
      const seed = lesson * 1000 + (purpose === "exam" ? 500 : 0) + index + 1;
      return {
        ...draft,
        options: draft.options ? mixed(draft.options, seed) : undefined,
        words: draft.words ? mixed(draft.words, seed) : undefined,
        blanks: draft.blanks?.map((b, i) => ({
          ...b,
          options: b.options ? mixed(b.options, seed + i * 31) : undefined,
        })),
        id,
        lesson_id: lesson,
        skill_id: lesson * 10 + ((index % 2) + 1),
        purpose,
        family: draft.caseKey ?? id,
        difficulty: purpose === "exam" ? 3 : index < 20 ? 2 : 3,
      };
    }),
  );
}
