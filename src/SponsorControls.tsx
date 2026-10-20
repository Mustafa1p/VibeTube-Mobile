import { useEffect, useRef, useState, type RefObject } from "react";
import {
  segmentAt,
  sponsorSegments,
  useSponsorPreference,
} from "./sponsorBlock";

export default function SponsorControls({
  videoId,
  player,
}: {
  videoId: string;
  player: RefObject<any>;
}) {
  const { enabled, change } = useSponsorPreference();
  const [status, setStatus] = useState("");
  const [undo, setUndo] = useState<{ videoId: string; start: number } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const skipped = useRef<{ start: number; end: number }[]>([]);
  useEffect(() => {
    setUndo(null);
    setStatus("");
    skipped.current = [];
    if (!enabled) return;
    const c = new AbortController();
    let tick: ReturnType<typeof setInterval> | undefined;
    setStatus("Checking sponsored segments…");
    sponsorSegments(videoId, c.signal)
      .then((segments) => {
        if (c.signal.aborted) return;
        setStatus(
          segments.length
            ? "Sponsor skipping ready"
            : "No sponsor segments reported",
        );
        tick = setInterval(() => {
          const api = player.current;
          if (
            document.hidden ||
            api?.getPlayerState?.() !== 1 ||
            api?.getVideoData?.()?.video_id !== videoId
          )
            return;
          const time = api.getCurrentTime?.();
          if (
            skipped.current.some(
              (range) => time >= range.start && time < range.end,
            )
          )
            return;
          const hit = segmentAt(segments, time, api.getDuration?.());
          if (!hit || !api.seekTo) return;
          skipped.current.push(hit);
          api.seekTo(hit.end, true);
          setUndo({ videoId, start: hit.start });
          setStatus("Skipped sponsored segment");
        }, 250);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setStatus("SponsorBlock unavailable. Playback continues normally.");
      });
    return () => {
      c.abort();
      clearInterval(tick);
    };
  }, [enabled, videoId, attempt, player]);
  return (
    <div className="sponsor-controls">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (!change(e.target.checked))
              setStatus("Could not save this setting.");
          }}
        />
        Skip sponsors
      </label>
      <p>
        Community timestamps from SponsorBlock. YouTube ads may still appear.
      </p>
      {enabled && (
        <div className="sponsor-feedback">
          <span role="status">{status}</span>
          {status.startsWith("SponsorBlock unavailable") && (
            <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
          )}
          {undo?.videoId === videoId && (
            <button
              onClick={() => {
                if (player.current?.getVideoData?.()?.video_id !== videoId)
                  return;
                player.current?.seekTo?.(undo.start, true);
                setUndo(null);
                setStatus("Sponsor skip undone");
              }}
            >
              Undo skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
