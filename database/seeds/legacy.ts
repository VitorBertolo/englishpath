// Exact identifiers from the first catalog. Keep their rows for attempt history.
export const legacyStageOneIds = Array.from(
  { length: 6 },
  (_, i) => i + 1,
).flatMap((lesson) => [
  ...Array.from({ length: 30 }, (_, i) => `to-be-${lesson}-${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) =>
    ["a", "b"].map((variant) => `exam-${lesson}-${i + 1}-${variant}`),
  ).flat(),
]);
