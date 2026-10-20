# Published VibeTube 3.2

**Live:** https://mustafa1p.github.io/VibeTube-Mobile/?v=3.2

Application commit: `ef055a19e33ee38db2eb308ad99594e80d44f155`.

[Successful GitHub Pages build and deployment](https://github.com/Mustafa1p/VibeTube-Mobile/actions/runs/39362267902). Formatting, PHP syntax, build and ten deterministic tests passed in CI.

## Actual published-site verification — 20 October 2026

A fresh Chromium session loaded release 3.2 on Pages with standalone mode emulated. [Current observations](discovery-verification.json) record HTTP 200, 20 Home videos, 20 Music videos, eight autocomplete suggestions, 20 first-page search results and 39 unique videos after Load more. The selected public Blender video played beyond 1.63 seconds without a second Play tap. Twenty compact recommendations appeared below it, with thumbnails approximately 164 px wide at a 390 px viewport. There were no uncaught app errors. [Discovery changes](DISCOVERY-FIX.md) explain the fixes and limits.

Separate targeted WebKit tests passed for discovery and retry. Physical iPhone behavior remains unverified. YouTube's official iframe and branding remain in use; custom server playback is still blocked by YouTube on this hosting IP.

## Earlier release 3.1 playback record

A fresh desktop Chromium session with standalone mode explicitly emulated loaded the deployed app over HTTPS. [Raw observations](live-verification.json) record:

- HTTP 200.
- The installed view displays the collection and embedded player.
- No Open YouTube launcher button and no Sign in on YouTube button.
- Actual video playback advanced to 1.45 seconds inside the iframe, then to 2.56 seconds after navigation to the local library.
- The exact iframe element remained connected during navigation; the top-level origin stayed `https://mustafa1p.github.io`.
- Saving a video produced one entry in the local saved collection.
- The application shell reloaded offline.
- No uncaught application errors were observed.

[Published playback screenshot](screenshots/published-in-app-playing.png).

The published live-search view returned eight public videos through the actual hosting gateway and browser CORS. Experimental HTML5 playback was off by default. The visible Test media server control reported extraction failure, matching the host's YouTube bot/sign-in rejection. No uncaught errors were observed. [Published backend observations](backend-live-verification.json) · [Search screenshot](screenshots/published-live-search.png) · [Backend limitations](BACKEND-VERIFICATION.md).

The embedded player retains YouTube's own native controls and branding. The app itself does not redirect video selections to the official site. Full Google/YouTube account sign-in is unavailable in this architecture and no account-handoff control is exposed.

## Updating an existing installation

Close the player, tap **Update now** when the notice appears, then reopen VibeTube from the Home Screen. About should display **VibeTube Mobile 3.2.0**. The same manifest identity and project path are retained, so the Home Screen icon does not need to be recreated. The `?v=3.2` link can fetch the current installation shell in a normal browser, but watching still requires launching the installed app.

## Remaining physical check

Actual iPhone/Android installation and device playback remain unverified in this session. Install or update on a physical phone, open the Home Screen icon, accept the player notice and tap a video followed by the player's Play control. Test navigation, minimize/expand, pause, seek and fullscreen. Record device model and OS/browser version. No background-media or account-sync claim is made.
