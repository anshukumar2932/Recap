const ALARM_NAME = "Reminder-Alarm";
const RETRY_MINUTES = 30;
const DAILY_HOUR_UTC = 0;
const DAILY_MINUTE_UTC = 0;

function scheduleNextDailyCheck() {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(DAILY_HOUR_UTC, DAILY_MINUTE_UTC, 0, 0);

  // If today's check time already passed, schedule tomorrow's.
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  chrome.alarms.create(ALARM_NAME, { when: next.getTime() });
}

function scheduleRetry() {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: RETRY_MINUTES });
}

// Make sure the alarm exists on install/startup — don't reset it if it's
// already scheduled (avoids drift every time the service worker restarts).
chrome.alarms.get(ALARM_NAME, (alarm) => {
  if (!alarm) {
    scheduleNextDailyCheck();
  }
});

// Register the click handler ONCE, at load time — reads the URL from
// storage so it survives a service-worker restart between notification
// creation and the user clicking it.
chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId !== "Leetcode Reminder") return;

  chrome.storage.local.get("pendingProblemUrl", (data) => {
    if (data.pendingProblemUrl) {
      chrome.tabs.create({ url: data.pendingProblemUrl });
    }
  });
});

let consecutiveFailures = 0;

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;

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

  // Match by name only, then confirm domain from the returned cookie —
  // LeetCode sometimes sets this on ".leetcode.com" rather than
  // "leetcode.com", which can make a strict domain filter return nothing.
  chrome.cookies.getAll({ name: "LEETCODE_SESSION" }, (cookies) => {
    const cookie = cookies.find((c) => c.domain.includes("leetcode.com"));

    if (!cookie) {
      // Not logged in — nothing to check. Retry at the normal cadence
      // rather than spinning tighter, in case the user logs in later.
      scheduleRetry();
      return;
    }

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Cookie", `LEETCODE_SESSION=${cookie.value}`);

    fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers,
      body: graphqlQuery,
      credentials: "omit", // cookie is sent explicitly via header above
    })
      .then((response) => response.json())
      .then((result) => {
        consecutiveFailures = 0;

        const challenge = result.data.activeDailyCodingChallengeQuestion;

        if (challenge.userStatus !== "Finish") {
          const problemUrl = "https://leetcode.com" + challenge.link;

          chrome.storage.local.set({ pendingProblemUrl: problemUrl });

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

          // Not done yet — check again in 2 hours.
          scheduleRetry();
        } else {
          chrome.notifications.clear("Leetcode Reminder");
          chrome.storage.local.remove("pendingProblemUrl");

          // Done — stop polling, resume at tomorrow's 05:30 UTC.
          scheduleNextDailyCheck();
        }
      })
      .catch((error) => {
        consecutiveFailures++;

        if (consecutiveFailures === 3) {
          chrome.notifications.create("Leetcode Reminder Error", {
            type: "basic",
            iconUrl: "/leetcode-logo.png",
            title: "Reminder check failing",
            message:
              "Couldn't reach LeetCode 3 times in a row — session cookie may have expired.",
            priority: 1,
          });
        }

        // Retry on failure too, rather than leaving the schedule dead.
        scheduleRetry();
      });
  });
});