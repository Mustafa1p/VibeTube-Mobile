# VibeTube discovery gateway

The gateway supplies search, query suggestions and channel-photo metadata. Videos play only in YouTube's standard iframe player. The earlier custom-media routes return HTTP 410 and are no longer used by the app.

## Setup

Requires PHP 8.2+ with cURL and `proc_open`, Linux x86_64 and permission to execute private binaries. No Google account or YouTube Data API key is required.

1. Run `bash backend/install-runtime.sh` over SSH. It installs checksum-verified yt-dlp 2026.08.19 and Node 22.23.3 under `$HOME/vibetube-runtime`. Keep the directory outside the document root, mode 0700. `TMPDIR` uses this directory because shared-host `/tmp` can disallow executable mappings.
2. Upload `backend/api.php` to the subdomain document root. The default runtime path fits `domains/<domain>/public_html/<subdomain>`; other layouts should configure `VIBETUBE_RUNTIME` in the PHP server environment.
3. Check `api.php?action=health` and run `python backend/verify.py`. Browser playback must be checked separately against YouTube's standard player.

The frontend pins its gateway URL and CSP to `https://vibetubemobile.ipxer.online`. A new host requires updating both and republishing. Never store SSH credentials in this repo or public files.

## HTTP interface

| Request | Behavior |
| --- | --- |
| `?action=health` | Search runtime status and `playback: youtube-embed` |
| `?action=search&q=...&page=1` | Up to 20 public videos per page, pages 1–5; five-minute cache; includes validated channel IDs |
| `?action=suggest&q=...&lang=en` | Up to eight query suggestions from Google's YouTube autocomplete service |
| `?action=avatar&channel=UC...` | Public channel image URL from a strict channel ID |
| `?action=avatar&video=...` | Channel image lookup for an older saved video via oEmbed |
| `?action=video...` / `?action=media...` | HTTP 410: retired |

Avatar requests fetch only fixed YouTube origins. The request uses an anonymous optional-cookie rejection preference to avoid the regional consent redirect; user Google cookies and account sessions are never accepted or copied. Returned images must use HTTPS on `yt3.googleusercontent.com` or `yt3.ggpht.com`. Successful metadata is cached for a day, unavailable images for one minute, with a 300-entry bound. The browser lazy-loads photos and keeps initials if lookup or image loading fails.

Search has two worker slots and bounded output/time limits. Query and avatar inputs are validated; the gateway exposes no arbitrary URL proxy, unrestricted extractor command, or account-cookie input. TLS verification stays enabled. CORS permits the Pages app, the supplied subdomain and local development; it does not authenticate a public service. Hosting worker, bandwidth and rate limits still apply.
