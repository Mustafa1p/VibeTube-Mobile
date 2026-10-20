import { useState } from "react";
import { backendEnabled, backendRequest, liveSearchEnabled } from "./backend";
import { read, write } from "./storage";

export default function BackendSettings({
  onChange,
}: {
  onChange: () => void;
}) {
  const [enabled, setEnabled] = useState(backendEnabled);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveSearch, setLiveSearch] = useState(liveSearchEnabled);
  const [sponsors, setSponsors] = useState(() => read("sponsor-skip", false));
  return (
    <section className="v-library v-playback-settings">
      <h1>Playback settings</h1>
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
        />{" "}
        Search YouTube through VibeTube
      </label>
      <h2>Experimental media server</h2>
      <p>
        Play public videos using VibeTube’s own video controls and search
        through the media server. No Google account or API key is used.
      </p>
      <p>
        The current hosting IP was rejected by YouTube during deployment. This
        mode may fail. The standard embedded player remains available.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setStatus("Checking the server and a public Blender video…");
          try {
            const health = await backendRequest("health");
            if (!health.runtime)
              throw Error("The extraction runtime is unavailable.");
            await backendRequest("video", { id: "aqz-KE-bpKQ" });
            setStatus(
              "A media ticket was resolved. Actual playback still needs testing on this device.",
            );
          } catch (e) {
            setStatus((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Checking…" : "Test media server"}
      </button>
      <p role="status">{status}</p>
      <label className="v-backend-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const next = e.target.checked;
            if (write("experimental-media", next)) {
              setEnabled(next);
              onChange();
            } else setStatus("Could not save this setting.");
          }}
        />{" "}
        Use experimental video player
      </label>
      <p>
        Changing this closes the current player. If playback fails, turn this
        off to return to the embedded player.
      </p>
      <p>
        This does not install a browser extension or enable YouTube account
        sign-in. Saved videos and history remain on this device.
      </p>
      <h2>Community sponsor skipping</h2>
      <label className="v-backend-toggle">
        <input
          type="checkbox"
          checked={sponsors}
          onChange={(e) => {
            const next = e.target.checked;
            if (write("sponsor-skip", next)) {
              setSponsors(next);
              onChange();
            } else setStatus("Could not save this setting.");
          }}
        />{" "}
        Skip reported sponsor segments in experimental playback
      </label>
      <p>
        Off by default. Uses SponsorBlock community timestamps for public
        videos. When enabled, SponsorBlock receives your IP address and a
        four-character video hash prefix. This does not remove YouTube
        advertisements and does not modify the embedded player.
      </p>
    </section>
  );
}
