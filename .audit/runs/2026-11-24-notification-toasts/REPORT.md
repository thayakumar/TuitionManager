# Notification popup verification — 24 November 2026

Implemented scoped notification and incoming family-chat popups, mobile layout, related-page navigation, unread-preserving dismissal, refresh suppression and atomic browser deduplication across tabs. Existing badges share the same feed.

## Results

- Automated regression suite: 171 passed, zero failed.
- Focused feed tests: six passed, including authorization, revoked access, recipient isolation, baseline suppression, pagination and safe destinations.
- Production Next.js build and TypeScript check passed.
- Nine browser workflow groups passed; no page errors. See browser-results.json and desktop/mobile screenshots.
- All event creation and business-action tests used isolated local data. No production messages or notifications were created for testing.

The visible website checks every five seconds. Closed-site push is outside this feature. Deployment status is reported separately after release.
