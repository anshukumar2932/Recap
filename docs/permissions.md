# Recap Chrome Extension Permissions Explained

Recap requests only what its features need. Keep this table in sync with `public/manifest.json` before each release.

| Permission | Why Recap needs it |
| --- | --- |
| `cookies` | Read the `LEETCODE_SESSION` cookie so LeetCode returns your own status, username, and streak |
| `alarms` | Schedule the daily check and retries |
| `notifications` | Show reminder notifications |
| `storage` | Save your settings and reminder state locally |
| Host access: leetcode.com | Call the LeetCode GraphQL API |
| Host access: Codeforces API | Fetch your solving streak when Codeforces tracking is on |

VERIFY: confirm the exact permission names and host patterns against `manifest.json`.

See [privacy](privacy.md) for how data is handled.
