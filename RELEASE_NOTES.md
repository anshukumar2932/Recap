# v0.1.0 — LeetCode Daily Challenge popup with streak counter

Initial tagged release of **Recap**, a Chrome extension (Manifest V3) that helps you stay on top of LeetCode's Daily Challenge.

## Features

- **Daily Challenge status** — Fetches today's question and shows whether you've completed it, with a link, difficulty, and topic tags.
- **Sign-in status** — Detects your LeetCode session cookie and displays your username (with a link to your profile), or a prompt to sign in.
- **Streak counter** — Shows your current LeetCode streak (🔥 N days) in the popup navbar, pulled from LeetCode's GraphQL `streakCounter`.
- **Daily reminder** — A background service worker uses the `alarms` and `notifications` APIs to remind you to solve the daily challenge.

## How it works

The popup (`src/popup.jsx`) queries LeetCode's GraphQL API for:

| Query | Purpose |
| --- | --- |
| `questionOfToday` | Today's daily challenge, your `userStatus`, difficulty, topic tags |
| `globalData` | Signed-in `userStatus` / username |
| `getStreakCounter` | Current `streakCount` (plus `daysSkipped` and `currentDayCompleted`) |

All queries require the `LEETCODE_SESSION` cookie, read via the `cookies` permission and sent as a request header.

## Install

1. Run `npm install` then `npm run build`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` directory.

## Notes

- This is a `v0.1.0` pre-1.0 release: features like external notifier channels (e.g. Telegram/WhatsApp) and a hosted backend are not yet implemented.
- Versioning follows SemVer: `MAJOR` for breaking changes, `MINOR` for new features, `PATCH` for bug fixes.
