import { fetchCodeforcesStreak } from "./codeforces";

const LEETCODE_ALARM = "Leetcode-Reminder";
const CODEFORCES_ALARM = "Codeforces-Reminder";

const LEETCODE_NOTIF = "Leetcode Reminder";
const LEETCODE_ERROR_NOTIF = "Leetcode Reminder Error";
const CODEFORCES_NOTIF = "Codeforces Reminder";

const CODEFORCES_RETRY_MINUTES = 120; // mirrors LeetCode's own retry pattern

const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  retryInterval: 30,
  notificationsEnabled: true,
  codeforcesEnabled: false,
  codeforcesHandle: "",
  dailyCheckHourUTC: 0,
  dailyCheckMinuteUTC: 0,
};

// Keys that require rebuilding alarms
const RESCHEDULE_KEYS = [
  "remindersEnabled",
  "retryInterval",
  "dailyCheckHourUTC",
  "dailyCheckMinuteUTC",
  "codeforcesEnabled",
  "codeforcesHandle",
];

// Keys that only affect notification visibility, never alarm timing
const NOTIFICATION_ONLY_KEYS = ["notificationsEnabled"];

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (data) => resolve(data));
  });
}

// ---------- failure counters, persisted across SW restarts ----------

async function getFailureCount(key) {
  const data = await new Promise((resolve) =>
    chrome.storage.local.get({ [key]: 0 }, resolve)
  );
  return data[key];
}

async function setFailureCount(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

// ---------- LeetCode scheduling ----------

function nextDailyInstant(hourUTC, minuteUTC) {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(hourUTC, minuteUTC, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime();
}

function scheduleLeetCodeDailyCheck(hourUTC, minuteUTC) {
  chrome.alarms.create(LEETCODE_ALARM, { when: nextDailyInstant(hourUTC, minuteUTC) });
}

function scheduleLeetCodeRetry(retryInterval) {
  chrome.alarms.create(LEETCODE_ALARM, { delayInMinutes: retryInterval });
}

function clearLeetCodeAlarm() {
  return chrome.alarms.clear(LEETCODE_ALARM);
}

// ---------- Codeforces scheduling ----------

function scheduleCodeforcesDailyCheck(hourUTC, minuteUTC) {
  chrome.alarms.create(CODEFORCES_ALARM, { when: nextDailyInstant(hourUTC, minuteUTC) });
}

function scheduleCodeforcesRetry() {
  chrome.alarms.create(CODEFORCES_ALARM, { delayInMinutes: CODEFORCES_RETRY_MINUTES });
}

function clearCodeforcesAlarm() {
  return chrome.alarms.clear(CODEFORCES_ALARM);
}

// ---------- Rebuild schedules from current settings (serialized) ----------

async function rescheduleFromSettings() {
  const settings = await getSettings();

  await clearLeetCodeAlarm();
  if (settings.remindersEnabled) {
    scheduleLeetCodeDailyCheck(settings.dailyCheckHourUTC, settings.dailyCheckMinuteUTC);
  } else {
    chrome.notifications.clear(LEETCODE_NOTIF);
    chrome.notifications.clear(LEETCODE_ERROR_NOTIF);
    await setFailureCount("leetcodeConsecutiveFailures", 0);
  }

  await clearCodeforcesAlarm();
  if (settings.remindersEnabled && settings.codeforcesEnabled && settings.codeforcesHandle) {
    scheduleCodeforcesDailyCheck(settings.dailyCheckHourUTC, settings.dailyCheckMinuteUTC);
  } else {
    chrome.notifications.clear(CODEFORCES_NOTIF);
    await setFailureCount("codeforcesConsecutiveFailures", 0);
  }
}

// Serialize all reschedule requests through one promise chain so concurrent
// triggers (startup + storage change, or rapid settings edits) can't race.
let reschedulePromise = Promise.resolve();
function requestReschedule() {
  reschedulePromise = reschedulePromise.catch(() => {}).then(rescheduleFromSettings);
  return reschedulePromise;
}

chrome.runtime.onStartup.addListener(requestReschedule);
chrome.runtime.onInstalled.addListener(requestReschedule);

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;

  if (RESCHEDULE_KEYS.some((key) => key in changes)) {
    requestReschedule();
    return; // reschedule already clears notifications where relevant
  }

  if (NOTIFICATION_ONLY_KEYS.some((key) => key in changes)) {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) {
      chrome.notifications.clear(LEETCODE_NOTIF);
      chrome.notifications.clear(LEETCODE_ERROR_NOTIF);
      chrome.notifications.clear(CODEFORCES_NOTIF);
    }
    // Existing alarms/retries are left untouched — only visibility changes.
  }
});

chrome.alarms.getAll((alarms) => {
  if (alarms.length === 0) {
    requestReschedule();
  }
});

// ---------- Notification click handler ----------

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId !== LEETCODE_NOTIF) return;

  chrome.storage.local.get("pendingProblemUrl", (data) => {
    if (data.pendingProblemUrl) {
      chrome.tabs.create({ url: data.pendingProblemUrl });
    }
  });
});

// ---------- LeetCode alarm handler ----------

async function handleLeetCodeAlarm(settings) {
  if (!settings.remindersEnabled) return;

  const graphqlQuery = JSON.stringify({
    query: `query questionOfToday {
      activeDailyCodingChallengeQuestion {
        date
        userStatus
        link
        question {
          acRate
          difficulty
          freqBar
          frontendQuestionId: questionFrontendId
          isFavor
          paidOnly: isPaidOnly
          status
          title
          titleSlug
          hasVideoSolution
          hasSolution
          topicTags { name id slug }
        }
      }
    }`,
  });

  chrome.cookies.getAll(
    { domain: "leetcode.com", name: "LEETCODE_SESSION" },
    (cookies) => {
      if (!cookies || cookies.length === 0) {
        scheduleLeetCodeRetry(settings.retryInterval);
        return;
      }

      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("LEETCODE_SESSION", cookies[0].value);

      fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers,
        body: graphqlQuery,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`LeetCode HTTP ${response.status}`);
          }
          return response.json();
        })
        .then(async (result) => {
          const challenge = result?.data?.activeDailyCodingChallengeQuestion;
          if (!challenge) {
            throw new Error("Invalid LeetCode response");
          }

          await setFailureCount("leetcodeConsecutiveFailures", 0);
          chrome.notifications.clear(LEETCODE_ERROR_NOTIF);

          if (challenge.userStatus !== "Finish") {
            const problemUrl = "https://leetcode.com" + challenge.link;
            chrome.storage.local.set({ pendingProblemUrl: problemUrl });

            if (settings.notificationsEnabled) {
              chrome.notifications.clear(LEETCODE_NOTIF, () => {
                chrome.notifications.create(LEETCODE_NOTIF, {
                  type: "basic",
                  iconUrl: "/Recap.png",
                  title: "Daily-Challenge Reminder!",
                  message:
                    "You haven't completed today's Problem: " +
                    challenge.question.title,
                  priority: 2,
                });
              });
            }

            scheduleLeetCodeRetry(settings.retryInterval);
          } else {
            chrome.notifications.clear(LEETCODE_NOTIF);
            chrome.storage.local.remove("pendingProblemUrl");
            scheduleLeetCodeDailyCheck(settings.dailyCheckHourUTC, settings.dailyCheckMinuteUTC);
          }
        })
        .catch(async (error) => {
          console.log(error);
          const failures = (await getFailureCount("leetcodeConsecutiveFailures")) + 1;
          await setFailureCount("leetcodeConsecutiveFailures", failures);

          if (failures === 3 && settings.notificationsEnabled) {
            chrome.notifications.create(LEETCODE_ERROR_NOTIF, {
              type: "basic",
              iconUrl: "/Recap.png",
              title: "Reminder check failing",
              message:
                "Couldn't reach LeetCode 3 times in a row — session cookie may have expired.",
              priority: 1,
            });
          }

          scheduleLeetCodeRetry(settings.retryInterval);
        });
    }
  );
}

// ---------- Codeforces alarm handler ----------

async function handleCodeforcesAlarm(settings) {
  if (!settings.codeforcesEnabled || !settings.codeforcesHandle) return;

  try {
    const { solvedToday, streak } = await fetchCodeforcesStreak(settings.codeforcesHandle);
    await setFailureCount("codeforcesConsecutiveFailures", 0);

    if (!solvedToday) {
      if (settings.notificationsEnabled) {
        chrome.notifications.clear(CODEFORCES_NOTIF, () => {
          chrome.notifications.create(CODEFORCES_NOTIF, {
            type: "basic",
            iconUrl: "/Recap.png",
            title: "Codeforces streak reminder!",
            message: `No accepted submission today — current streak: ${streak} day${
              streak === 1 ? "" : "s"
            }.`,
            priority: 2,
          });
        });
      }
      scheduleCodeforcesRetry();
    } else {
      chrome.notifications.clear(CODEFORCES_NOTIF);
      scheduleCodeforcesDailyCheck(settings.dailyCheckHourUTC, settings.dailyCheckMinuteUTC);
    }
  } catch (error) {
    console.error("Codeforces check failed:", error);
    const failures = (await getFailureCount("codeforcesConsecutiveFailures")) + 1;
    await setFailureCount("codeforcesConsecutiveFailures", failures);
    scheduleCodeforcesRetry();
  }
}

// ---------- Single alarm dispatcher ----------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const settings = await getSettings();

  if (alarm.name === LEETCODE_ALARM) {
    await handleLeetCodeAlarm(settings);
  } else if (alarm.name === CODEFORCES_ALARM) {
    await handleCodeforcesAlarm(settings);
  }
});