export function dayKey(ms, timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function shiftDay(key, delta) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// brokeOn = the first day (walking backwards) with no accepted submission,
// used by fetchCodeforcesStreak to know whether the streak's true start
// has been reached yet, or whether an earlier page might still be needed.
export function getCurrentStreak(submissions, timeZone = "Asia/Kolkata") {
  const days = new Set(
    submissions
      .filter((s) => s.verdict === "OK")
      .map((s) => dayKey(s.creationTimeSeconds * 1000, timeZone))
  );

  const today = dayKey(Date.now(), timeZone);

  // Streak stays alive if today is empty but yesterday was solved
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return { streak, solvedToday: days.has(today), brokeOn: cursor };
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 10; // safety cap: 10,000 submissions
const PAGE_DELAY_MS = 2100; // Codeforces allows ~1 request per 2 seconds

export async function fetchCodeforcesStreak(handle, timeZone = "Asia/Kolkata") {
  const all = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
    }

    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(
        handle
      )}&from=${page * PAGE_SIZE + 1}&count=${PAGE_SIZE}`
    );
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error(data.comment || "Codeforces request failed");
    }

    all.push(...data.result);

    const reachedEndOfHistory = data.result.length < PAGE_SIZE;
    const result = getCurrentStreak(all, timeZone);

    // Submissions are newest-first, so the last item fetched is the oldest.
    // If the streak's real gap (brokeOn) falls after that oldest day, the
    // gap is confirmed and no earlier page can change the answer.
    const oldestDayFetched = dayKey(
      all[all.length - 1].creationTimeSeconds * 1000,
      timeZone
    );

    if (reachedEndOfHistory || result.brokeOn > oldestDayFetched) {
      return { streak: result.streak, solvedToday: result.solvedToday };
    }
  }

  // Hit the safety cap without confirming the gap — return the best
  // estimate from everything fetched so far rather than fetching forever.
  const result = getCurrentStreak(all, timeZone);
  return { streak: result.streak, solvedToday: result.solvedToday };
}