# Backend verification — 20 October 2026

## Observed results

| Check | Result |
| --- | --- |
| HTTPS gateway | 200 at `https://vibetubemobile.ipxer.online/api.php?action=health` |
| Runtime | PHP with cURL and process execution; yt-dlp 2026.08.19 and Node 22.23.3 |
| Release integrity | yt-dlp and Node binaries matched official release SHA-256 lists |
| Live search | 200, eight real results for `Blender open movie` |
| CORS | Pages origin accepted; unrelated origin rejected with 403 |
| Invalid ID / token | 400; a valid but nonexistent ticket returns 410 |
| Host video extraction | 502; YouTube bot/sign-in rejection for `aqz-KE-bpKQ`, two extraction clients |
| Local extraction | Real public Blender video, muxed 360p AVC/AAC MP4 |
| Local upstream range | 206, `video/mp4`, 2,048 requested bytes received |
| Host HTML5 playback / seeking | Not verified: extraction blocked |
| Sponsor skipping end to end | Not verified: host HTML5 playback unavailable |
| Physical iPhone Home Screen | Not verified |
| YouTube account sign-in | Not implemented |

`python backend/verify.py` performs live endpoint validation and prints sanitized status only. `VIBETUBE_REAL_BACKEND=1 npx playwright test --grep 'real hosting search'` checks real search through a browser. Deterministic tests use intercepted responses for failure recovery; those are not evidence of server media playback.

## Extension adaptation

The experimental HTML5 player adapts SponsorBlock timestamp validation and the hash-prefix lookup from the referenced upstream service. It is opt-in and only requests the `sponsor` category. Validation rejects nonfinite, negative, reversed, unsupported-category and non-skip records. Timestamps are applied only to the app-owned HTML5 element, never the official embedded player. SponsorBlock failures leave playback unaffected.

The original Chrome extension is not installed or running in an iPhone PWA. Chrome request-blocking APIs, the extension worker and YouTube page injection were not ported. There is no verified YouTube-ad-blocking claim. Source provenance and MIT terms are retained in [third-party notices](../public/THIRD-PARTY-LICENSES.txt).
