# Search and playback improvements — 20 October 2026

Release 3.2 addresses missing discovery rather than treating the seven-video starter catalog as a complete feed.

- Home and topic chips now request real public videos, including a Music topic. The checked-in catalog remains an explicit offline/error fallback.
- Search supports 20 results per page, Load more up to five pages, ID deduplication, visible failures and Retry. The previous eight-result cap is removed.
- Typing requests query suggestions after 350 ms. Selecting a suggestion submits it; recent searches are stored locally. Requests use the browser language. Autocomplete has no Google account access.
- Recommendations below playback use a channel-name search and smaller horizontal thumbnail cards. This is public discovery, not the signed-in YouTube recommendation system.
- Video selection now uses `loadVideoById` and requests playback, replacing the old `cueVideoById` behavior that waited for another tap. Browser autoplay blocking produces a visible Play button. Embed-restricted videos show a clear error and other choices.
- The app's backend requests no longer require `AbortSignal.any`, avoiding a compatibility failure on older iOS browsers.
- Service worker updates are checked again on foreground/online events. About displays version 3.2.0 so stale installations can be identified. Updates still wait for the user and do not interrupt playback.

The deployed server's custom media extraction remains blocked by YouTube. Standard playback still uses the visible official iframe; this release does not remove its branding, enable account sign-in, or establish native iOS parity. [YouTube's IFrame API documentation](https://developers.google.com/youtube/iframe_api_reference#onAutoplayBlocked) explains that browsers can block scripted playback. Physical iPhone checks remain necessary.

## Validation

The live gateway returned 20 results on each of two music-search pages, with 37 distinct IDs across those changing result pages. Query autocomplete returned real suggestions. Desktop Chromium real-media testing passed with playback advancing after selection without an additional provider Play tap. Deterministic tests cover topic feeds, pagination, suggestion selection by keyboard, compact recommendations, error retry and the requested playback call; their intercepted responses do not prove external-media behavior.

Ten deterministic Chromium checks passed, along with two targeted WebKit checks for discovery and error recovery. A separate live browser pass observed 20 Home videos, 20 Music videos, eight autocomplete suggestions, 39 unique results after Load more and 20 compact recommendations, with no uncaught errors. These desktop checks do not establish physical iPhone behavior.

The same checks passed against the published Pages release. [Published observations](discovery-verification.json) record the result, including actual video time advancement without a second Play tap. Arabic music search separately returned HTTP 200 with 20 results, 17 with Arabic titles. [Deployment](DEPLOYMENT.md) records the application commit and successful CI run.
