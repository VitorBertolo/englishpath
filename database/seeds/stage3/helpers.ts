import { G as gaps } from "../stage2/helpers.js";
import { buildModule, type Draft } from "../stage1/helpers.js";
export { C, O, T, X, B } from "../stage1/helpers.js";

export const G = (...args: Parameters<typeof gaps>): Draft => ({
  ...gaps(...args),
  instruction:
    "Leia as respostas e as pistas da situação. Complete todas as lacunas com a palavra ou expressão indicada, preservando a informação e o tempo verbal.",
});
export const build = (lesson: number, practice: Draft[], exam: Draft[]) =>
  buildModule(lesson, practice, exam, 3);
