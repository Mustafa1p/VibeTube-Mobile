# In-app playback verification — 20 October 2026

Release 3.2 discovery fixes and current published observations are recorded in [Discovery fix](DISCOVERY-FIX.md) and [Deployment](DEPLOYMENT.md). Ten deterministic Chromium checks and two targeted WebKit checks passed; Home/Music feeds, autocomplete, pagination, compact recommendations and playback on selection were also checked against the published site.

Release 3.1 adds verified hosted live search, optional HTML5 playback and adapted sponsor-timestamp logic. See [backend verification](BACKEND-VERIFICATION.md) for the current results and hosting-IP blocker. The release 3 record below predates those additions. The latest deterministic suite has eight passing tests; both separately enabled real search and real embedded-playback tests also pass on the desktop preview.

Release 3 replaces the external launcher with a persistent embedded YouTube player.

- Formatting and TypeScript/Vite build: PASS.
- Core browser tests: 6 passed (6.4 seconds), covering installation gating, absent launcher/sign-in buttons, in-app watch navigation, saves, Watch later, deep-link refresh, URL input, privacy explanation, offline shell, manifest/icons, responsive overflow and update gating.
- Separate live YouTube playback test: PASS (5.3 seconds). Real iframe video currentTime advanced beyond 1 second; the top-level URL stayed on VibeTube; navigation to the local library kept the same iframe element connected and media advanced beyond 2 seconds.
- Desktop Chromium, production preview, standalone mode emulated. This is not a physical iPhone result.
- Screenshots: `screenshots/in-app-home.png`, `in-app-playing.png`, `in-app-library.png`.

The core CI suite skips the separately enabled provider test; run it locally with VIBETUBE_REAL_MEDIA=1. Successful media advancement is asserted, not inferred from a player preview image.

Full YouTube account sign-in and synchronization are unavailable. No sign-in form or external account handoff is exposed. Search is scoped to the curated collection, with YouTube URL input for other videos. No Data API key is required.

Physical acceptance still requires installing on an iPhone/Android device, launching the Home Screen icon, accepting the player notice, opening a video, tapping the provider Play control, navigating while playing, checking fullscreen, and recording device/OS/browser results. Background playback is not offered.
