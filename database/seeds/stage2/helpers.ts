import type { Draft } from "../stage1/helpers.js";
import { buildModule } from "../stage1/helpers.js";
export { C, O, T, X, B } from "../stage1/helpers.js";

// Each selected blank has an explicit, authored set of alternatives.
// Written blanks use the infinitive or the Portuguese cue in the prompt.
type Slot = string | [string, string, string];
export function G(
  topic: string,
  text: string,
  slots: Slot[],
  explanation: string,
): Draft {
  let count = 0;
  const prompt = text.replace(/\{\}/g, () => `[[b${++count}]]`);
  if (count !== slots.length)
    throw new Error(`Lacunas incompatíveis: ${topic}`);
  const blanks = slots.map((slot, i) => ({
    id: `b${i + 1}`,
    label: `Lacuna ${i + 1}`,
    accepted_answers: [typeof slot === "string" ? slot : slot[0]],
    ...(typeof slot === "string" ? {} : { options: slot }),
  }));
  return {
    topic,
    type: "multi_gap",
    prompt,
    instruction:
      "Complete todas as lacunas. Quando indicado, use o verbo entre parênteses no Simple Present ou a pista em português.",
    blanks,
    accepted_answers: [
      JSON.stringify(
        Object.fromEntries(blanks.map((b) => [b.id, b.accepted_answers[0]])),
      ),
    ],
    explanation,
  };
}
export const build = (lesson: number, practice: Draft[], exam: Draft[]) =>
  buildModule(lesson, practice, exam, 2);
export const CG = (...args: Parameters<typeof G>): Draft => ({
  ...G(...args),
  instruction:
    "Complete todas as lacunas usando a estrutura indicada. No Present Continuous, use am/is/are + verbo com -ing. Observe o sujeito e o sentido da situação.",
});
