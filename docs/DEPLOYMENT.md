# Published deployment

**Live:** [https://mustafa1p.github.io/VibeTube-Mobile/](https://mustafa1p.github.io/VibeTube-Mobile/)

Repository: [Mustafa1p/VibeTube-Mobile](https://github.com/Mustafa1p/VibeTube-Mobile).

Application release: `0c8beefcf3f6d7d1e1bf4b52b55755d8a2f2dd8d`.

[Successful GitHub Actions build and Pages deployment](https://github.com/Mustafa1p/VibeTube-Mobile/actions/runs/39351136579). Formatting, TypeScript/build, all eight browser tests, Pages artifact upload and deployment completed successfully on GitHub's runner.

## Published-site checks — 20 October 2026

The actual GitHub Pages URL was inspected in a fresh desktop Chromium session after the final application deployment. [Machine-readable observations](live-verification.json) record the result.

| Check                           | Observed result                                                               |
| ------------------------------- | ----------------------------------------------------------------------------- |
| HTTPS application URL           | HTTP 200; correct VibeTube Mobile title                                       |
| Normal browser                  | Installation guide visible; Open YouTube controls absent                      |
| Android installation link       | `#install-android` selects the Android guide and survives refresh             |
| Manifest                        | HTTP 200; id, scope and start_url use `/VibeTube-Mobile/`; standalone display |
| Icons                           | 192px, 512px, maskable and Apple touch icons all return HTTP 200              |
| Destination icon and worker     | `youtube.svg` and `sw.js` return HTTP 200                                     |
| Production script               | Current `/VibeTube-Mobile/assets/index-C1L_8QRy.js` loads                     |
| Service worker scope            | `https://mustafa1p.github.io/VibeTube-Mobile/`                                |
| Offline reload                  | Cached installation shell remains usable                                      |
| Installed view                  | Launch controls visible with an explicitly emulated standalone signal         |
| Real Open YouTube handoff       | Reaches `https://m.youtube.com/`                                              |
| Real Sign in on YouTube handoff | Reaches Google's `accounts.google.com/v3/signin/identifier` page for YouTube  |
| Uncaught application errors     | None observed                                                                 |

No Google credentials were entered. Reaching the genuine Google sign-in form does not establish a completed private account login. Browser emulation does not establish physical Home Screen installation.

Live screenshots: [installation](screenshots/live-install.png), [launcher in emulated standalone mode](screenshots/live-launcher.png).

## Repository configuration

GitHub Pages uses **GitHub Actions** as its build source. The repository description, homepage and relevant topics have been updated. The Pages workflow deploys application changes on `main` and supports manual dispatch. README/docs-only changes do not trigger a redundant application deployment.

The launcher's static files need no server-side runtime, API keys, OAuth client setup or private configuration. Opening YouTube leaves VibeTube's origin; Google and YouTube handle authentication, media and account capabilities there.

## Remaining physical checks

Install in Safari on an iPhone and Chrome on Android, launch the icon, confirm the real external handoff, complete your own Google sign-in on the official page, and play a video. Record device model, OS/browser version and observed results using the checklist in [VERIFICATION.md](VERIFICATION.md). These physical-device checks remain **UNVERIFIED** in this session.
