# Standard player and channel photos — release 3.3

VibeTube now uses only the standard YouTube iframe player. The experimental HTML5 player, sponsor-skipping adapter and custom media routes are retired. Old stored playback preferences cannot enable them; the retired server routes return HTTP 410.

The player API is prepared after privacy consent. A ready player receives video-selection commands directly inside the user's click handler, avoiding an unnecessary effect delay. The first selection still needs the iframe to become ready. Playback requests sound first. If YouTube reports blocked autoplay, the app makes one muted retry and displays an Unmute control. It does not repeatedly retry, simulate user gestures, hide YouTube's controls, or automatically unmute without user action. The separate browser-tap message and extra Play button are removed. Browser policy can still prevent playback; physical iPhone behavior remains unverified. [WebKit autoplay policy](https://webkit.org/blog/6784/new-video-policies-for-ios/) explains the distinction between muted playback and sound.

Channel circles now load actual profile photos instead of always displaying initials. Search returns validated channel IDs. Older catalog/saved entries use their video ID to resolve the author through YouTube oEmbed. The gateway reads public channel-image metadata and returns only trusted HTTPS YouTube image hosts. Its requests use an anonymous opt-out consent preference to avoid a regional consent redirect, without using a Google account session. Successful image metadata is cached for a day. Photos load near the viewport with at most three metadata requests in flight, and unavailable or failed images keep initials. CSP now allows the two required YouTube profile-image hosts.

## Validation

- Ten deterministic Chromium tests passed, including stale playback preferences, a bounded muted fallback, absence of the extra tap prompt, profile-image loading and failed-image fallback.
- Four targeted WebKit tests passed for playback UI, avatars and discovery; external provider playback remains a separate check.
- Actual standard-player playback on the desktop preview advanced after selection without a second Play tap.
- Live endpoint validation passed for real search, a real channel-photo URL, rejected invalid avatar IDs, untrusted CORS origins and retired media endpoints.
- Physical iPhone installation and autoplay remain unverified.

Older verification documents describe earlier releases and their retired experimental features.
