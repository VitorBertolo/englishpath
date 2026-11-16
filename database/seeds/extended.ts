import { pronounExercises } from "./stage1/pronouns.js";
import { agreementExercises } from "./stage1/agreement.js";
import { affirmativeExercises } from "./stage1/affirmatives.js";
import { negativeExercises } from "./stage1/negatives.js";
import { questionExercises } from "./stage1/questions.js";
import { contractionExercises } from "./stage1/contractions.js";
// One authored situation per question; formats never duplicate a case.
export function additionalExercises() {
  return [
    pronounExercises,
    agreementExercises,
    affirmativeExercises,
    negativeExercises,
    questionExercises,
    contractionExercises,
  ].flatMap((build) => build());
}
