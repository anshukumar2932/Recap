// Fire once shortly after install, then every 2 hours
chrome.alarms.create("Reminder-Alarm", { delayInMinutes: 2, periodInMinutes: 120 });

// Register the click handler ONCE, at load time — not inside the alarm
// listener — to avoid stacking duplicate listeners on every tick.
let pendingProblemUrl = null;
chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId === "Leetcode Reminder" && pendingProblemUrl) {
    chrome.tabs.create({ url: pendingProblemUrl });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "Reminder-Alarm") return;

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
        // Not logged in — nothing to check.
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
          const challenge = result.data.activeDailyCodingChallengeQuestion;
          if (challenge.userStatus !== "Finish") {
            pendingProblemUrl = "https://leetcode.com" + challenge.link;
            chrome.notifications.clear("Leetcode Reminder", () => {
              chrome.notifications.create("Leetcode Reminder", {
                type: "basic",
                iconUrl: "/leetcode-logo.png",
                title: "Daily-Challenge Reminder!",
                message:
                  "You haven't completed today's Problem: " +
                  challenge.question.title,
                priority: 2,
              });
            });
          } else {
            chrome.notifications.clear("Leetcode Reminder");
          }
        })
        .catch((error) => console.log(error));
    }
  );
});

