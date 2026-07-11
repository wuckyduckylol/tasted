/**
 * Weekly streak (handoff 3a): consecutive calendar weeks (Mon-anchored) with
 * ≥1 rating, counting back from the current week — with a one-week grace so a
 * streak "ending last week" still shows until this week lapses.
 */
export function weeklyStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0;
  const weekKey = (d: Date) => {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  };
  const weeks = new Set(isoDates.map((iso) => weekKey(new Date(iso))));
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let cursor = weekKey(new Date());
  if (!weeks.has(cursor)) cursor -= WEEK_MS;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor -= WEEK_MS;
  }
  return streak;
}
