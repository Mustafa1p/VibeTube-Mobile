# VibeTube media gateway

PHP 8.2+ with cURL and `proc_open`, Linux x86_64, and permission to execute private binaries are required. No persistent daemon, Google account, cookies, or YouTube Data API key is used.

## Deployment

1. Run `bash backend/install-runtime.sh` over SSH. It installs pinned yt-dlp 2026.08.19 and Node 22.23.3 under `$HOME/vibetube-runtime`, with release checksum checks. Keep this directory outside the document root and mode 0700. `TMPDIR` points here because shared-host `/tmp` can disallow executable mappings.
2. Upload only `backend/api.php` to the subdomain document root. Its default runtime path fits this deployment's `domains/<domain>/public_html/<subdomain>` layout. For another layout, set `VIBETUBE_RUNTIME` in the PHP server environment to the private absolute runtime path.
3. Confirm `api.php?action=health`, then run `python backend/verify.py` locally. A healthy runtime does **not** prove extraction or playback.
4. Before enabling experimental video for users, resolve a public video, request the returned opaque media ticket with `Range: bytes=0-2047`, verify HTTP 206 and MP4 content, then test seeking and sustained playback on physical iPhone Safari/Home Screen. This deployment has **not** passed that requirement.

The frontend pins its gateway URL and CSP to `https://vibetubemobile.ipxer.online`. A different host requires updating both, rebuilding and republishing Pages. No SSH password belongs in GitHub, deployment scripts, environment files in this repo, or public PHP files.

## HTTP interface

| Request | Behavior |
| --- | --- |
| `?action=health` | Runtime availability; not a playback readiness assertion |
| `?action=search&q=...` | Up to eight real public-video results; five-minute cache |
| `?action=video&id=...` | Resolve a strict 11-character ID to one compatible muxed MP4 ticket |
| `?action=media&token=...` | Stream that private ticket, with single-byte-range support |

The gateway never accepts caller-provided upstream URLs, Google cookies or authorization. Signed provider URLs stay in private files for 30 minutes. Streaming is restricted to HTTPS `*.googlevideo.com`, without redirects. TLS verification remains enabled. Browser CORS permits the Pages app, the supplied subdomain and local development. There are two extraction slots, six streaming slots, extraction timeouts, a per-IP rate limit and bounded search/ticket stores. These controls reduce abuse; CORS does not authenticate a public service. Hosting bandwidth and PHP worker limits still apply. Do not expose unrestricted yt-dlp commands or a generic proxy endpoint.

## Deployment result — 2026-10-20

- HTTPS endpoint, PHP runtime and checksum-verified extraction binaries: available.
- Search: HTTP 200, eight Blender open-movie results, browser-origin CORS allowed.
- Video resolution: HTTP 502. Both default and web-embedded extraction clients received YouTube's bot/sign-in rejection from this host.
- Native media streaming from this host: **not verified**, because no media ticket could be resolved.
- Local development machine: the same public Blender video resolved to a 360p AVC/AAC MP4, and a real upstream byte-range request returned HTTP 206. This proves a local extraction path only.

Changing the PHP UI or adding API keys does not fix the observed hosting-IP rejection. A replacement runtime/network must pass the playback checks before making experimental video the default. The official embedded player remains the app's default.
