type Candidate = {
  id: string;
  type: string;
  topic?: string | null;
  family?: string | null;
};
// Preserve the input priority (unseen, difficulty, weak skills) while avoiding
// adjacent repetitions whenever the remaining pool offers another context/format.
export function diverseSelection<T extends Candidate>(
  ranked: T[],
  count: number,
): T[] {
  const remaining = ranked.slice();
  const selected: T[] = [];
  const used = new Set<string>();
  while (selected.length < count && remaining.length) {
    const previous = selected.at(-1);
    const eligible = (q: T) => !used.has(q.family ?? q.id);
    const differentType = (q: T) => !previous || q.type !== previous.type;
    const differentTopic = (q: T) =>
      !previous?.topic || !q.topic || q.topic !== previous.topic;
    let index = remaining.findIndex(
      (q) => eligible(q) && differentType(q) && differentTopic(q),
    );
    if (index < 0)
      index = remaining.findIndex((q) => eligible(q) && differentType(q));
    if (index < 0)
      index = remaining.findIndex((q) => eligible(q) && differentTopic(q));
    if (index < 0) index = remaining.findIndex(eligible);
    if (index < 0) break;
    const [next] = remaining.splice(index, 1);
    selected.push(next);
    used.add(next.family ?? next.id);
  }
  return selected;
}
