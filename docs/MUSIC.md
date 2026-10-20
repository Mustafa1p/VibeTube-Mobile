# Music collection — version 3.4.1

Use **Add to music** on a video card or the watch page, then open **Music** beside Home. The collection is stored locally and remains available after reloading the app. Each row shows the video's artwork, a saved song title, an artist name and an explicit play/pause button.

Artist names start with the source channel because public search does not reliably identify the performing artist. **Options → Edit song details** lets you correct the title and artist without modifying the source video. The original video ID and metadata remain attached to the entry. **Remove from music** removes only that local collection entry.

**Play all** follows the displayed list order. Next/previous controls use the same mounted player. When a track ends, the next entry starts only while the app is visible and more than half of the player is visible. The last track stops. Selecting another ordinary video leaves the music queue. A collection can contain up to 200 unique video IDs; duplicates do not create extra entries, and storage failures leave the current collection intact.

This is a music-library interface using the standard YouTube player. The player stays visible at no less than 200×200 pixels and its original controls remain available. This is not audio extraction, offline audio, hidden-player playback, Spotify integration or background playback. Playback still requires a connection and can be restricted by a video owner or the browser's sound rules. Minimizing the app pauses the player.

While a requested track is loading, its row shows **Starting track…** until YouTube starts the content. Standard YouTube ads and their own controls remain available.

## Verification

The build, formatting checks and 16 deterministic Chromium tests passed, including four music tests covering save/deduplication, title/artist editing, reload persistence, removal, play/pause, queue advancement and the visible standard-player layout. The same four music checks passed in WebKit with mobile-sized views. Test fixtures verify UI and queue commands; they do not establish real provider media playback.

A separate browser check used two real Elektronomia videos. The collection survived reload with edited artist names and real artwork, the first video played beyond one second, row controls paused/resumed it, and Next selected the second video without remounting the iframe. The player was 354×200 at a 390px viewport and no uncaught errors were observed. [Observed results](music-verification.json). Physical iPhone installation/playback remains unverified.
