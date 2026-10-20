import { useState } from "react";
import { liveSearchEnabled } from "./backend";
import { useSponsorPreference } from "./sponsorBlock";
import { write } from "./storage";
export default function BackendSettings({
  onChange,
}: {
  onChange: () => void;
}) {
  const sponsor = useSponsorPreference();
  const [liveSearch, setLiveSearch] = useState(liveSearchEnabled),
    [status, setStatus] = useState("");
  return (
    <section className="v-library v-playback-settings">
      <h1>Playback settings</h1>
      <p>
        Videos use the standard YouTube player. Selecting a video requests
        playback immediately. If sound is blocked, playback tries muted; use
        Unmute or the player’s volume control to enable sound.
      </p>
      <h2>SponsorBlock</h2>
      <p>
        Skip community-reported sponsor segments inside videos. This does not
        block YouTube ads. When enabled, SponsorBlock receives your IP address
        and a four-character video hash prefix, rather than the full video ID.
        No account or cookies are sent.
      </p>
      <label className="v-backend-toggle">
        <input
          type="checkbox"
          checked={sponsor.enabled}
          onChange={(e) => {
            if (!sponsor.change(e.target.checked))
              setStatus("Could not save this setting.");
          }}
        />
        Skip sponsored segments
      </label>
      <h2>Live search</h2>
      <p>
        Search public YouTube videos using our server. Search terms and your IP
        address reach the hosting provider; search results are cached for five
        minutes. No Google credentials are sent.
      </p>
      <label className="v-backend-toggle">
        <input
          type="checkbox"
          checked={liveSearch}
          onChange={(e) => {
            const next = e.target.checked;
            if (write("live-search", next)) {
              setLiveSearch(next);
              onChange();
            } else setStatus("Could not save this setting.");
          }}
        />
        Search YouTube through VibeTube
      </label>
      <p role="status">{status}</p>
      <p>
        Saved videos and history remain on this device. YouTube account sign-in
        is unavailable.
      </p>
    </section>
  );
}
