# Dark notification cards and sound

24 November 2026: dark charcoal cards, white titles, light descriptions and orange icons distinguish incoming notifications from page content. New displayed batches play a quiet locally generated two-note chime after a browser user gesture. Audio is optional browser capability; failure leaves visual delivery intact.

Verification: 171 automated tests passed; typecheck and full production build passed. Chromium with real Web Audio confirmed no baseline/pre-interaction sound, two oscillator starts for a batch after interaction, no duplicate sound, dark surface, mobile bounds and zero page errors. Synthetic feed events and an isolated local database were used; no production notifications were created. This verifies audio scheduling, not physical speaker volume or every device's autoplay behavior.

Wordcraft source assessment is in docs/WORDCRAFT-REVIEW.md. No document engine replacement was performed.
