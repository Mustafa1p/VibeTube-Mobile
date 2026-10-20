import { useState } from "react";
import { liveSearchEnabled } from "./backend";
import { write } from "./storage";
export default function BackendSettings({
  onChange,
}: {
  onChange: () => void;
}) {
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
