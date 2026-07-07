# Recap

Chrome extension (Manifest V3) that reminds you to solve LeetCode's Daily Challenge and shows your completion status at a glance.

## Features

- **Daily Challenge status** – Fetches today's question and shows whether you've completed it, with a link, difficulty, and topic tags.
- **Sign-in status** – Detects your LeetCode session cookie and displays your username (with a link to your profile), or a prompt to sign in.
- **Streak counter** – Shows your current LeetCode streak (🔥 N days) in the popup navbar, pulled from LeetCode's GraphQL `streakCounter`.

## How it works

The popup (`src/popup.jsx`) uses the LeetCode GraphQL API:

| Query | Purpose |
| --- | --- |
| `questionOfToday` | Today's daily challenge, your `userStatus`, difficulty, and topic tags |
| `globalData` | Signed-in `userStatus` / username |
| `getStreakCounter` | Current `streakCount` (plus `daysSkipped` and `currentDayCompleted`) |

A background service worker (`src/background.js`) uses the `alarms` and `notifications` permissions to remind you to solve the daily challenge.

All queries require the `LEETCODE_SESSION` cookie, which the extension reads via the `cookies` permission and sends as a request header.

## Project structure

```
public/            Static assets copied to dist/ (manifest.json, icons)
src/popup.jsx      React popup UI
src/popup.html     Popup entry HTML
src/background.js  Service worker (alarms + notifications)
.babelrc           Babel presets (env + react)
webpack.config.js  Shared webpack config
webpack.dev.js     Dev build (watch mode)
webpack.prod.js    Production build
```

## Setup

```bash
npm install
```

## Development

Run webpack in watch mode to rebuild on changes:

```bash
npm run dev
```

Then load the unpacked extension from the `dist/` folder in `chrome://extensions` (enable "Developer mode").

## Build

```bash
npm run build
```

The production bundle is output to `dist/`.

## Install in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` directory.
