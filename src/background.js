const ALARM_NAME = "Reminder-Alarm";
const DAILY_HOUR_UTC = 0;
const DAILY_MINUTE_UTC = 0;

const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  retryInterval: 30,
  notificationsEnabled: true,
};

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (data) => resolve(data));
  });
}

function scheduleNextDailyCheck() {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(DAILY_HOUR_UTC, DAILY_MINUTE_UTC, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  chrome.alarms.create(ALARM_NAME, { when: next.getTime() });
}

async function scheduleRetry() {
  const { retryInterval } = await getSettings();
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: retryInterval });
}

chrome.alarms.get(ALARM_NAME, (alarm) => {
  if (!alarm) {
    scheduleNextDailyCheck();
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId !== "Leetcode Reminder") return;

  chrome.storage.local.get("pendingProblemUrl", (data) => {
    if (data.pendingProblemUrl) {
      chrome.tabs.create({ url: data.pendingProblemUrl });
    }
  });
});

let consecutiveFailures = 0;

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const settings = await getSettings();
  if (!settings.remindersEnabled) {
    scheduleNextDailyCheck();
    return;
  }

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
        scheduleRetry();
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
        .then((response) => response.json())
        .then((result) => {
          consecutiveFailures = 0;

          const challenge = result.data.activeDailyCodingChallengeQuestion;

          if (challenge.userStatus !== "Finish") {
            const problemUrl = "https://leetcode.com" + challenge.link;
            chrome.storage.local.set({ pendingProblemUrl: problemUrl });

            if (settings.notificationsEnabled) {
              chrome.notifications.clear("Leetcode Reminder", () => {
                chrome.notifications.create("Leetcode Reminder", {
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

            scheduleRetry();
          } else {
            chrome.notifications.clear("Leetcode Reminder");
            chrome.storage.local.remove("pendingProblemUrl");
            scheduleNextDailyCheck();
          }
        })
        .catch((error) => {
          console.log(error);
          consecutiveFailures++;

          if (consecutiveFailures === 3 && settings.notificationsEnabled) {
            chrome.notifications.create("Leetcode Reminder Error", {
              type: "basic",
              iconUrl: "/Recap.png",
              title: "Reminder check failing",
              message:
                "Couldn't reach LeetCode 3 times in a row — session cookie may have expired.",
              priority: 1,
            });
          }

          scheduleRetry();
        });
    }
  );
});