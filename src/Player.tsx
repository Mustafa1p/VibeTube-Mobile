import { useEffect, useRef, useState } from "react";
import type { Video } from "./data";
import { read, write } from "./storage";
import { ChevronDown, Maximize2, X, Play, Pause } from "lucide-react";
import { resolveMedia } from "./backend";
import { sponsorSegments, type Segment } from "./enhancements/sponsorBlock";
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
let apiPromise: Promise<void> | undefined;
function api() {
  return (apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = resolve;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      apiPromise = undefined;
      reject(Error("YouTube player could not connect. Check your network."));
    };
    document.head.append(s);
    setTimeout(() => {
      if (!window.YT?.Player) {
        apiPromise = undefined;
        reject(
          Error("YouTube did not respond. Check your connection and retry."),
        );
      }
    }, 15000);
  }));
}
export default function Player({
  video,
  expanded,
  onExpand,
  onClose,
  onStarted,
  onUseEmbedded,
}: {
  video: Video;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  onStarted: (v: Video) => void;
  onUseEmbedded: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<any>(null),
    direct = useRef<HTMLVideoElement>(null),
    current = useRef(video),
    ready = useRef(false);
  const [error, setError] = useState(""),
    [playing, setPlaying] = useState(false),
    [retry, setRetry] = useState(0),
    [media, setMedia] = useState(""),
    [resolving, setResolving] = useState(false),
    [segments, setSegments] = useState<Segment[]>([]),
    [sponsorStatus, setSponsorStatus] = useState(""),
    [blocked, setBlocked] = useState(false);
  current.current = video;
  useEffect(() => {
    let disposed = false;
    ready.current = false;
    setError("");
    setPlaying(false);
    setBlocked(false);
    if (video.provider === "backend") return;
    const node = document.createElement("div");
    const loadTimeout = setTimeout(() => {
      if (!disposed && !ready.current)
        setError(
          "The player is taking too long to connect. Check your connection and retry.",
        );
    }, 18000);
    host.current?.replaceChildren(node);
    api()
      .then(() => {
        if (disposed) return;
        player.current = new window.YT.Player(node, {
          width: "100%",
          height: "100%",
          videoId: current.current.id,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            origin: location.origin,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (disposed) return;
              ready.current = true;
              const id = current.current.id;
              player.current.loadVideoById({
                videoId: id,
                startSeconds:
                  read<Record<string, number>>("positions", {})[id] || 0,
              });
            },
            onStateChange: (e: any) => {
              if (disposed) return;
              setPlaying(e.data === 1);
              if (e.data === 1) {
                setError("");
                setBlocked(false);
                onStarted(current.current);
              }
            },
            onError: (e: any) =>
              setError(
                e.data === 101 || e.data === 150
                  ? "The creator does not allow this video in embedded players. Choose another video below."
                  : e.data === 153
                    ? "YouTube could not verify this host. Reload the installed HTTPS app and retry."
                    : "This video is unavailable or could not be played.",
              ),
            onAutoplayBlocked: () => setBlocked(true),
          },
        });
      })
      .catch((e) => !disposed && setError(e.message));
    const tick = setInterval(() => {
      if (!ready.current) return;
      const t = player.current?.getCurrentTime?.();
      if (Number.isFinite(t) && t > 0) {
        const p = read<Record<string, number>>("positions", {});
        p[current.current.id] = t;
        write("positions", Object.fromEntries(Object.entries(p).slice(-200)));
      }
    }, 3000);
    const visibility = () => {
      if (document.hidden) player.current?.pauseVideo?.();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearInterval(tick);
      clearTimeout(loadTimeout);
      document.removeEventListener("visibilitychange", visibility);
      ready.current = false;
      player.current?.destroy?.();
      player.current = null;
    };
  }, [video.provider, retry]);
  useEffect(() => {
    setError("");
    setBlocked(false);
    if (ready.current)
      player.current?.loadVideoById({
        videoId: video.id,
        startSeconds:
          read<Record<string, number>>("positions", {})[video.id] || 0,
      });
  }, [video.id]);
  useEffect(() => {
    if (video.provider !== "backend") return;
    const c = new AbortController();
    setMedia("");
    setError("");
    setResolving(true);
    resolveMedia(video.id, c.signal)
      .then((d) => {
        if (!c.signal.aborted) setMedia(d.url);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setResolving(false);
      });
    return () => c.abort();
  }, [video.id, video.provider, retry]);
  useEffect(() => {
    setSegments([]);
    setSponsorStatus("");
    if (video.provider !== "backend" || !read("sponsor-skip", false)) return;
    const c = new AbortController();
    sponsorSegments(video.id, c.signal)
      .then((s) => {
        if (!c.signal.aborted) setSegments(s);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setSponsorStatus(
            "Sponsor skipping unavailable. Playback is unaffected.",
          );
      });
    return () => c.abort();
  }, [video.id, video.provider]);
  useEffect(() => {
    if (video.provider !== "backend" || !("mediaSession" in navigator)) return;
    const s = navigator.mediaSession;
    s.metadata = new MediaMetadata({
      title: video.title,
      artist: video.channel,
    });
    const actions: Partial<Record<MediaSessionAction, () => void>> = {
      play: () => {
        void direct.current
          ?.play()
          .catch(() => setError("Tap video to resume."));
      },
      pause: () => direct.current?.pause(),
      seekbackward: () => {
        if (direct.current)
          direct.current.currentTime = Math.max(
            0,
            direct.current.currentTime - 10,
          );
      },
      seekforward: () => {
        if (direct.current) direct.current.currentTime += 10;
      },
    };
    for (const [a, f] of Object.entries(actions)) {
      try {
        s.setActionHandler(a as MediaSessionAction, f!);
      } catch {}
    }
    return () => {
      for (const a of Object.keys(actions)) {
        try {
          s.setActionHandler(a as MediaSessionAction, null);
        } catch {}
      }
      s.metadata = null;
    };
  }, [video.id, video.provider]);
  return (
    <section
      className={"player " + (expanded ? "expanded" : "mini")}
      aria-label="Video player"
    >
      <div className="player-heading">
        <button
          onClick={onExpand}
          aria-label={expanded ? "Minimize player" : "Expand player"}
        >
          {expanded ? <ChevronDown /> : <Maximize2 />}
        </button>
        <span>{video.title}</span>
        <button aria-label="Close player" onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="player-screen">
        {video.provider === "backend" ? (
          <video
            key={retry}
            ref={direct}
            controls
            playsInline
            preload="metadata"
            src={media || undefined}
            onLoadedMetadata={() => {
              if (direct.current)
                direct.current.currentTime =
                  read<Record<string, number>>("positions", {})[video.id] || 0;
              void direct.current?.play().catch(() => setBlocked(true));
            }}
            onPlay={() => {
              setPlaying(true);
              setBlocked(false);
              onStarted(video);
            }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              const el = direct.current;
              if (el && !el.paused && Number.isFinite(el.duration)) {
                const skip = segments.find(
                  (s) =>
                    el.currentTime >= s.segment[0] &&
                    el.currentTime < s.segment[1] &&
                    s.segment[1] < el.duration,
                );
                if (skip) {
                  el.currentTime = skip.segment[1];
                  setSponsorStatus(
                    "Skipped a community-reported sponsor segment.",
                  );
                }
              }
              if (direct.current)
                write("positions", {
                  ...read("positions", {}),
                  [video.id]: direct.current.currentTime,
                });
            }}
            onError={() =>
              setError("Direct media could not load. Check your connection.")
            }
          />
        ) : (
          <div ref={host} className="youtube-host" />
        )}
      </div>
      {resolving && <p role="status">Connecting to the media server…</p>}
      {blocked && (
        <div className="player-error">
          <p>Your browser requires a tap to start this video.</p>
          <button
            onClick={() => {
              if (video.provider === "backend")
                void direct.current?.play().catch(() => setBlocked(true));
              else player.current?.playVideo?.();
            }}
          >
            Play video
          </button>
        </div>
      )}
      {sponsorStatus && <p role="status">{sponsorStatus}</p>}
      {video.provider === "backend" && media && (
        <label className="v-speed">
          Playback speed{" "}
          <select
            aria-label="Playback speed"
            defaultValue="1"
            onChange={(e) => {
              if (direct.current)
                direct.current.playbackRate = Number(e.target.value);
            }}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </label>
      )}
      {error && (
        <div className="player-error" role="alert">
          {error}
          <button onClick={() => setRetry((r) => r + 1)}>Retry</button>
          {video.provider === "backend" && (
            <button onClick={onUseEmbedded}>Use standard player</button>
          )}
        </div>
      )}
      {!expanded && (
        <div className="mini-caption">
          <button onClick={onExpand}>Continue watching</button>
          <button
            aria-label={playing ? "Pause video" : "Play video"}
            onClick={() => {
              if (video.provider === "backend") {
                if (direct.current?.paused)
                  void direct.current
                    .play()
                    .catch(() => setError("Tap video to play."));
                else direct.current?.pause();
              } else if (ready.current) {
                if (playing) player.current.pauseVideo();
                else player.current.playVideo();
              }
            }}
          >
            {playing ? <Pause /> : <Play />}
          </button>
        </div>
      )}
    </section>
  );
}
