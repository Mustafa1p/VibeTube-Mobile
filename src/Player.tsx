import { useEffect, useRef, useState } from "react";
import type { Video } from "./data";
import { read, write } from "./storage";
import { ChevronDown, Maximize2, X, Play, Pause } from "lucide-react";
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
}: {
  video: Video;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  onStarted: (v: Video) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<any>(null),
    direct = useRef<HTMLVideoElement>(null),
    current = useRef(video),
    ready = useRef(false);
  const [error, setError] = useState(""),
    [playing, setPlaying] = useState(false),
    [retry, setRetry] = useState(0);
  current.current = video;
  useEffect(() => {
    let disposed = false;
    ready.current = false;
    setError("");
    setPlaying(false);
    if (video.provider === "direct") return;
    const node = document.createElement("div");
    const loadTimeout = setTimeout(() => {
      if (!disposed && !ready.current)
        setError(
          "The player is taking too long to connect. Retry or open YouTube.",
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
          playerVars: { playsinline: 1, origin: location.origin, rel: 0 },
          events: {
            onReady: () => {
              if (disposed) return;
              ready.current = true;
              const id = current.current.id;
              player.current.cueVideoById({
                videoId: id,
                startSeconds:
                  read<Record<string, number>>("positions", {})[id] || 0,
              });
            },
            onStateChange: (e: any) => {
              if (disposed) return;
              setPlaying(e.data === 1);
              if (e.data === 1) onStarted(current.current);
            },
            onError: (e: any) =>
              setError(
                e.data === 101 || e.data === 150
                  ? "The creator has disabled embedding. Open this video on YouTube."
                  : e.data === 153
                    ? "YouTube could not verify this host. Use the HTTPS app or open YouTube."
                    : "This video is unavailable or could not be played.",
              ),
            onAutoplayBlocked: () =>
              setError("Tap Play in the video to start playback."),
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
    if (ready.current)
      player.current?.cueVideoById({
        videoId: video.id,
        startSeconds:
          read<Record<string, number>>("positions", {})[video.id] || 0,
      });
  }, [video.id]);
  useEffect(() => {
    if (video.provider !== "direct" || !("mediaSession" in navigator)) return;
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
  }, [video.id]);
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
        {video.provider === "direct" ? (
          <video
            key={retry}
            ref={direct}
            controls
            playsInline
            preload="metadata"
            src="https://media.w3.org/2010/05/bunny/trailer.mp4"
            onLoadedMetadata={() => {
              if (direct.current)
                direct.current.currentTime =
                  read<Record<string, number>>("positions", {})[video.id] || 0;
            }}
            onPlay={() => {
              setPlaying(true);
              onStarted(video);
            }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
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
      {error && (
        <div className="player-error" role="alert">
          {error}
          <button onClick={() => setRetry((r) => r + 1)}>Retry</button>
        </div>
      )}
      {!expanded && (
        <div className="mini-caption">
          <button onClick={onExpand}>Continue watching</button>
          <button
            aria-label={playing ? "Pause video" : "Play video"}
            onClick={() => {
              if (video.provider === "direct") {
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
