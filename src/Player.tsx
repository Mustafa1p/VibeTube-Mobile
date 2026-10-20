import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import SponsorControls from "./SponsorControls";
import type { Video } from "./data";
import { read, write } from "./storage";
import {
  ChevronDown,
  Maximize2,
  X,
  Play,
  Pause,
  VolumeX,
  Loader2,
} from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
let apiPromise: Promise<void> | undefined;
function api() {
  return (apiPromise ??= new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => {
      clearTimeout(timer);
      apiPromise = undefined;
      reject(
        Error(
          "YouTube player could not connect. Check your network and retry.",
        ),
      );
    };
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = fail;
    document.head.append(s);
  }));
}
export const warmPlayer = () => {
  void api().catch(() => {});
};
export interface PlayerHandle {
  select: (video: Video) => void;
  pause: () => void;
}
interface Props {
  video: Video;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  onStarted: (v: Video) => void;
  onPlaybackChange?: (playing: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
  onEnded?: () => void;
  musicDock?: boolean;
}

export default forwardRef<PlayerHandle, Props>(function Player(
  {
    video,
    expanded,
    onExpand,
    onClose,
    onStarted,
    onPlaybackChange,
    onLoadingChange,
    onEnded,
    musicDock,
  },
  ref,
) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<any>(null),
    current = useRef(video),
    ready = useRef(false),
    loaded = useRef(""),
    mutedAttempt = useRef(false),
    finished = useRef("");
  const [error, setError] = useState(""),
    [playing, setPlaying] = useState(false),
    [muted, setMuted] = useState(false),
    [pending, setPending] = useState(true),
    [retry, setRetry] = useState(0);
  current.current = video;
  const callbacks = useRef({
    onStarted,
    onPlaybackChange,
    onLoadingChange,
    onEnded,
  });
  callbacks.current = { onStarted, onPlaybackChange, onLoadingChange, onEnded };
  function load(v: Video, gesture = false) {
    current.current = v;
    if (!ready.current) return;
    mutedAttempt.current = false;
    finished.current = "";
    if (gesture) {
      player.current.unMute?.();
      player.current.setVolume?.(100);
      setMuted(false);
    }
    setError("");
    const alreadyPlaying =
      loaded.current === v.id && player.current.getPlayerState?.() === 1;
    setPending(!alreadyPlaying);
    callbacks.current.onLoadingChange?.(!alreadyPlaying);
    if (alreadyPlaying) {
      setPlaying(true);
      callbacks.current.onPlaybackChange?.(true);
    }
    if (loaded.current === v.id) {
      player.current.playVideo?.();
      return;
    }
    loaded.current = v.id;
    player.current.loadVideoById({
      videoId: v.id,
      startSeconds: read<Record<string, number>>("positions", {})[v.id] || 0,
    });
  }
  // Called directly from a card click to retain user activation where supported.
  useImperativeHandle(ref, () => ({
    select: (v) => load(v, true),
    pause: () => player.current?.pauseVideo?.(),
  }));
  useEffect(() => {
    let disposed = false;
    ready.current = false;
    loaded.current = "";
    mutedAttempt.current = false;
    setError("");
    setPlaying(false);
    setPending(true);
    callbacks.current.onLoadingChange?.(true);
    setMuted(false);
    const node = document.createElement("div");
    host.current?.replaceChildren(node);
    const timeout = setTimeout(() => {
      if (!disposed && !ready.current)
        setError(
          "The player is taking too long to connect. Check your connection and retry.",
        );
    }, 18000);
    api()
      .then(() => {
        if (disposed) return;
        player.current = new window.YT.Player(node, {
          width: "100%",
          height: "100%",
          videoId: current.current.id,
          playerVars: {
            autoplay: 1,
            mute: 0,
            playsinline: 1,
            origin: location.origin,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (disposed) return;
              ready.current = true;
              clearTimeout(timeout);
              player.current.unMute?.();
              player.current.setVolume?.(100);
              setMuted(false);
              load(current.current);
            },
            onStateChange: (e: any) => {
              if (disposed) return;
              if ([0, 1, 2, 3].includes(e.data)) {
                setPlaying(e.data === 1 || e.data === 3);
                callbacks.current.onPlaybackChange?.(
                  e.data === 1 || e.data === 3,
                );
              }
              if ([0, 1, 2].includes(e.data)) {
                setPending(false);
                callbacks.current.onLoadingChange?.(false);
              }
              if (e.data === 1) {
                setError("");
                callbacks.current.onStarted(current.current);
              }
              const endedId =
                e.target?.getVideoData?.()?.video_id || loaded.current;
              if (
                e.data === 0 &&
                endedId === loaded.current &&
                finished.current !== endedId
              ) {
                finished.current = endedId;
                callbacks.current.onEnded?.();
              }
            },
            onError: (e: any) => {
              if (!disposed) {
                setPending(false);
                setPlaying(false);
                callbacks.current.onLoadingChange?.(false);
                callbacks.current.onPlaybackChange?.(false);
                setError(
                  e.data === 101 || e.data === 150
                    ? "The creator does not allow this video in embedded players. Choose another video below."
                    : e.data === 153
                      ? "YouTube could not verify this host. Reload the installed HTTPS app and retry."
                      : "This video is unavailable or could not be played.",
                );
              }
            },
            onAutoplayBlocked: () => {
              if (disposed || mutedAttempt.current) return;
              mutedAttempt.current = true;
              player.current?.mute?.();
              setMuted(true);
              player.current?.playVideo?.();
            },
          },
        });
      })
      .catch((e) => {
        if (!disposed) {
          clearTimeout(timeout);
          setPending(false);
          callbacks.current.onLoadingChange?.(false);
          setError(e.message);
        }
      });
    const tick = setInterval(() => {
      if (!ready.current) return;
      if (typeof player.current?.isMuted === "function")
        setMuted(player.current.isMuted());
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
      clearTimeout(timeout);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", visibility);
      ready.current = false;
      player.current?.destroy?.();
      player.current = null;
    };
  }, [retry]);
  useEffect(() => {
    if (loaded.current !== video.id) load(video);
  }, [video.id]);
  return (
    <section
      className={
        "player " +
        (expanded ? "expanded" : "mini") +
        (musicDock ? " music-dock" : "")
      }
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
        <div ref={host} className="youtube-host" />
      </div>
      <SponsorControls videoId={video.id} player={player} />
      {muted && (
        <button
          className="player-unmute"
          aria-label="Unmute video"
          onClick={() => {
            player.current?.unMute?.();
            player.current?.setVolume?.(100);
            player.current?.playVideo?.();
            setMuted(false);
          }}
        >
          <VolumeX size={18} />
          Unmute
        </button>
      )}
      {error && (
        <div className="player-error" role="alert">
          {error}
          <button onClick={() => setRetry((r) => r + 1)}>Retry</button>
        </div>
      )}
      {!expanded && (
        <div className="mini-caption">
          <button onClick={onExpand}>
            {musicDock ? "Open video" : "Continue watching"}
          </button>
          <button
            aria-label={
              pending
                ? "Starting video"
                : playing
                  ? "Pause video"
                  : "Play video"
            }
            disabled={pending}
            onClick={() => {
              if (ready.current) {
                if (playing) player.current.pauseVideo();
                else {
                  player.current.playVideo();
                }
              }
            }}
          >
            {pending ? (
              <Loader2 className="music-spinner" />
            ) : playing ? (
              <Pause />
            ) : (
              <Play />
            )}
          </button>
        </div>
      )}
    </section>
  );
});
