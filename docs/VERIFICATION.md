# Verification

VibeTube Mobile 2.0 is an installation screen and Home Screen launcher for official YouTube. It supersedes the custom video-browser implementation. No video API key, account integration, intermediary player, password field or video cache remains.

## Local checks — 20 October 2026

Environment: Windows, Node.js 22.17.0, Vite production preview, Playwright desktop Chromium. This is not a physical iOS or Android installation test.

- **TypeScript and production build:** PASS.
- **Formatting:** PASS.
- **Browser tests:** 8 passed in the initial complete run (5.1 seconds); final pre-publication result is recorded in the publishing update.
- **Application errors:** no uncaught errors in the installation-gating test.
- **External requests before handoff:** none observed in the privacy/network test.
- **Responsive inspection:** 320×568, 375×812, 390×844, 430×932, 844×390 and 1440×1000. No horizontal overflow. Captures visually inspected on phone and desktop layouts.
- **Production JS:** approximately 240 kB / 75 kB gzip. CSS approximately 11 kB / 3 kB gzip. Bundle sizes are not phone performance measurements.

| Check                                               | Evidence / status                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Browser visit                                       | Installation guide appears; launch controls are absent                                   |
| iPhone and Android guide links                      | Hash selection, device switching and refresh tested                                      |
| Installed launcher                                  | Emulated standalone signal exposes launch controls                                       |
| Open YouTube                                        | Navigation to `https://m.youtube.com/` tested at a controlled destination boundary       |
| Account access                                      | Navigation to `https://www.youtube.com/signin?next=%2F` tested at that boundary          |
| Browser back                                        | Returning to VibeTube leaves account action usable                                       |
| Android prompt                                      | Dismissal handled; `appinstalled` alone does not unlock the browser page                 |
| Manifest and icons                                  | `/VibeTube-Mobile/` id/start_url/scope, standalone display and PNG responses tested      |
| Offline                                             | Installed shell reloads; launcher disabled offline and re-enabled on connection recovery |
| Update                                              | Waiting worker notice, explicit activation and scoped cache change tested                |
| Privacy dialog                                      | Focus trapping through native modal dialog; Escape closes and restores focus             |
| Reduced motion                                      | Layout inspected with motion preference enabled                                          |
| Native iPhone / Android installation                | **UNVERIFIED** — no physical device available                                            |
| Private Google account sign-in                      | **UNVERIFIED** — no user credentials used; performed directly on Google/YouTube          |
| YouTube playback on an installed phone              | **UNVERIFIED** — handled by official YouTube after leaving the launcher                  |
| PiP, locked/background playback, AirPlay, downloads | Not added by VibeTube; depend on YouTube/account/device                                  |

The test intercepts the final YouTube navigation to verify exact destination URLs without signing into a private account. It does not simulate a successful Google login or claim successful media playback. YouTube's own [mobile-browser documentation](https://support.google.com/youtube/answer/3008060) describes normal sign-in and browsing on its mobile website.

## Published deployment

Pending the first GitHub Pages deployment at the time this source record was prepared. See `docs/DEPLOYMENT.md` for the actual deployment URL and external checks after publication. A successful local build alone is not a live deployment.

## Physical-device acceptance

Record device model, operating-system/browser version, installed vs browser mode, duration and actual outcome for each test:

1. Open the published URL in Safari on iPhone. Confirm that only the installation guide appears and that there is no Open YouTube bypass.
2. Share → Add to Home Screen → Open as Web App if shown → Add. Launch the icon; check safe areas, icon quality and launcher availability.
3. Tap Open YouTube. Record whether Safari, another browser window or the YouTube app opens. The launcher is allowed to leave its standalone window.
4. On official YouTube, tap profile → Sign in. Complete Google's normal flow yourself. Confirm real subscriptions/history if your account offers them. Never enter credentials into a VibeTube form; none exists.
5. Play an available video for two minutes on YouTube. Exercise play/pause, seek and rotation. Record any provider restrictions separately from launcher behavior.
6. Return to the VibeTube icon. Confirm the launch button still works; disconnect networking and verify the offline explanation, then restore it.
7. Repeat installation in Chrome on Android, including native-prompt acceptance and dismissal. Browser-provided wording and installation eligibility can vary.
8. Test PiP, screen lock/background playback or downloads only on official YouTube if offered. Record account/Premium requirements and actual device results; do not attribute them to VibeTube.

Standalone detection is a UI signal, not cryptographic proof of installation. There is no secret browser bypass in the product, but browser developer tools can emulate display mode. This is not an access-control system.
