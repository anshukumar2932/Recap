# Recap v0.2.1 — Settings & Multi-Platform Streaks

Recap v0.2.1 expands the extension from a simple LeetCode Daily Challenge reminder into a more configurable coding consistency tool.

## What's New

### Settings Page

A dedicated settings page is now available from the Recap popup.

Users can configure:

- Enable or disable daily reminders.
- Choose the first daily check time in their local timezone.
- Choose the retry interval when the LeetCode Daily Challenge is incomplete: 15, 30, 60, or 120 minutes.
- Enable or disable Chrome notifications.
- Enable Codeforces streak tracking.
- Configure a Codeforces handle.

### Codeforces Integration

Recap now supports Codeforces daily solving streak tracking.

The popup displays the configured Codeforces handle, current solving streak, and whether a problem has been solved today. Recap can also remind users when no accepted submission has been recorded for the day.

Codeforces uses an independent background alarm from the LeetCode reminder system.

### Improved Reminder Scheduling

For LeetCode:

1. Recap performs the daily check at the configured time.
2. If today's challenge is incomplete, Recap retries using the configured interval.
3. Once the challenge is completed, the retry loop stops.
4. The next daily check is scheduled for the following day.
5. Each check performs a fresh request to LeetCode.

### Reliability Improvements

- Settings changes rebuild the relevant reminder schedules.
- Alarm scheduling is serialized to avoid concurrent rescheduling operations.
- Reminder state is preserved across Manifest V3 service-worker restarts.
- LeetCode failure counts are persisted across service-worker restarts.
- Successful LeetCode checks clear previous reminder-error notifications.
- Disabling reminders clears the corresponding alarms and notifications.
- HTTP errors and invalid LeetCode API responses are handled as failed checks.

## Technical Details

Recap continues to use:

- React
- Chrome Extensions Manifest V3
- Chrome Alarms API
- Chrome Notifications API
- Chrome Storage API
- LeetCode GraphQL API
- Codeforces API

## Installation

### Option A — Download the release

1. Download `Recap-v0.2.1.zip` from the GitHub release assets.
2. Unzip the file to a folder.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the unzipped extension folder.

### Option B — Build from source

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the generated `dist/` directory.

## Upgrade Notes

This is a pre-1.0 feature release.

Existing Recap users should review the new Settings page after upgrading and configure their preferred reminder time, retry interval, notification preference, and optional Codeforces integration.

## Previous Releases

- `v0.1.0` — Initial LeetCode Daily Challenge extension.
- `v0.1.1` — Fixed Daily Challenge reminder scheduling and retry behavior.
- `v0.2.1` — Added configurable settings, improved scheduling, and Codeforces integration.
