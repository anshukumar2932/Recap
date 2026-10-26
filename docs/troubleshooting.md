# Troubleshooting Recap

## The Daily Challenge is not loading
1. Sign in to leetcode.com in the same Chrome profile.
2. Rebuild if you changed the source: `npm run build`.
3. Reload Recap from `chrome://extensions`.

## My username or streak is not showing
Make sure your LeetCode session is active, then reopen the popup.

## Reminders are not appearing
1. Check that reminders and notifications are on in Recap Settings.
2. Allow Chrome notifications in your operating system settings.
3. Confirm the background service worker is running in `chrome://extensions`.

## Reminders stopped after a LeetCode error
Recap counts HTTP errors and invalid responses as failed checks. A later successful check clears the error notification.

## Codeforces streak is wrong or missing
Confirm Codeforces tracking is enabled and your handle is spelled correctly in Settings.

## Changes are not appearing
Run `npm run build`, then reload the unpacked extension.

Still stuck? Open an issue: https://github.com/anshukumar2932/Recap/issues
