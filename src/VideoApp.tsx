import { useEffect, useRef, useState } from "react";
import {
  Home,
  Library,
  Search,
  Settings,
  Bookmark,
  Check,
  History,
  Plus,
  ListVideo,
  ArrowLeft,
  X,
  Music2,
} from "lucide-react";
import Player, { warmPlayer, type PlayerHandle } from "./Player";
import ChannelPage from "./ChannelPage";
import ChannelAvatar from "./ChannelAvatar";
import { catalog, lookup, thumb, videoId } from "./data";
import type { Video } from "./data";
import { read, write } from "./storage";
import "./video.css";
import BackendSettings from "./BackendSettings";
import { liveSearchEnabled } from "./backend";
import { useDiscovery } from "./useDiscovery";
import SearchSuggestions from "./SearchSuggestions";
import MusicLibrary, { type MusicTrack } from "./MusicLibrary";
const base = import.meta.env.BASE_URL;
function getRoute() {
  try {
    const r = decodeURIComponent(location.hash.slice(1) || "home");
    return r.startsWith("install-") ? "home" : r;
  } catch {
    return "home";
  }
}
export default function VideoApp({ onAbout }: { onAbout: () => void }) {
  const [route, setRoute] = useState(getRoute),
    [active, setActive] = useState<Video | null>(null),
    [channels, setChannels] = useState<Record<string, Video>>(() =>
      read("channel-sources", {}),
    ),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [saved, setSaved] = useState<Video[]>(() => read("saved", [])),
    [recent, setRecent] = useState<Video[]>(() => read("history", [])),
    [music, setMusic] = useState<MusicTrack[]>(() => read("music", [])),
    [musicSession, setMusicSession] = useState(false),
    [isPlaying, setIsPlaying] = useState(false),
    [musicLoading, setMusicLoading] = useState(false),
    [playlists, setPlaylists] = useState<Record<string, Video[]>>(() =>
      read("playlists", { "Watch later": [] }),
    ),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [liveSearch, setLiveSearch] = useState(liveSearchEnabled),
    [searchTerm, setSearchTerm] = useState(""),
    [suggesting, setSuggesting] = useState(false),
    [allowed, setAllowed] = useState(() => read("video-consent", false));
  const playerControl = useRef<PlayerHandle>(null);
  useEffect(() => {
    if (allowed) warmPlayer();
  }, [allowed]);
  const topics: Record<string, string> = {
    All: "popular videos",
    Music: "official music video",
    Films: "short film",
    Nature: "nature documentary",
    Technology: "technology",
  };
  const feed = useDiscovery(
    allowed && liveSearch && route === "home"
      ? topics[category] || topics.All
      : "",
  );
  const search = useDiscovery(
    allowed && liveSearch && route === "search" ? searchTerm : "",
  );
  const related = useDiscovery(
    allowed && liveSearch && active && route === "watch/" + active.id
      ? active.channel + (active.category === "Films" ? " short films" : "")
      : "",
  );
  const nav = (v: string) => {
    location.hash = encodeURIComponent(v);
  };
  useEffect(() => {
    const change = () => {
      setRoute(getRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!route.startsWith("watch/") || !allowed) return;
    const id = route.slice(6);
    if (active?.id === id) return;
    const c = new AbortController();
    setLoading(true);
    lookup(id, c.signal)
      .then(setActive)
      .catch((e) => {
        if (e.name !== "AbortError") setMessage(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => {
      c.abort();
      setLoading(false);
    };
  }, [route, active?.id, allowed]);
  const watch = !!active && route === "watch/" + active.id;
  const play = (v: Video, asMusic = false, navigate = true) => {
    setIsPlaying(false);
    setMusicLoading(true);
    setMusicSession(asMusic);
    playerControl.current?.select(v);
    setActive(v);
    if (navigate) nav(asMusic ? "music" : "watch/" + v.id);
  };
  const addMusic = (v: Video) => {
    if (music.some((t) => t.video.id === v.id)) {
      setMessage("Already in your music collection");
      return;
    }
    if (music.length >= 200) {
      setMessage(
        "Your music collection is full. Remove a track to add another.",
      );
      return;
    }
    const tracks = [{ video: v, title: v.title, artist: v.channel }, ...music];
    if (write("music", tracks)) {
      setMusic(tracks);
      setMessage("Added to music");
    } else setMessage("Storage is full. Could not add this track.");
  };
  const stepMusic = (offset: number, navigate = true) => {
    const index = music.findIndex((t) => t.video.id === active?.id);
    const next = music[index + offset];
    if (index >= 0 && next) play(next.video, true, navigate);
  };
  const browseMusic = () => {
    setQuery("music");
    setSearchTerm("music");
    setSuggesting(false);
    nav("search");
  };
  const save = (v: Video) => {
    const exists = saved.some((x) => x.id === v.id);
    const n = exists
      ? saved.filter((x) => x.id !== v.id)
      : [v, ...saved].slice(0, 200);
    if (write("saved", n)) {
      setSaved(n);
      setMessage(exists ? "Removed from saved videos" : "Saved on this device");
    } else setMessage("Storage is full. Could not save this video.");
  };
  const submit = (value = query) => {
    const q = value.trim().slice(0, 200);
    if (!q) return;
    const id = videoId(q);
    nav(id ? "watch/" + id : "search");
    setQuery(q);
    setSuggesting(false);
    const history = read<string[]>("search-history", []);
    write(
      "search-history",
      [q, ...history.filter((s) => s !== q)].slice(0, 20),
    );
    if (q === searchTerm) search.retry();
    setSearchTerm(q);
  };
  const started = (v: Video) =>
    setRecent((old) => {
      const n = [v, ...old.filter((x) => x.id !== v.id)].slice(0, 100);
      write("history", n);
      return n;
    });
  const list =
    route === "saved"
      ? saved
      : route === "history"
        ? recent
        : route.startsWith("playlist/")
          ? playlists[route.slice(9)] || []
          : route === "search" && liveSearch
            ? search.items
            : route === "home" && liveSearch && feed.items.length
              ? feed.items
              : catalog.filter(
                  (v) =>
                    (category === "All" ||
                      route === "search" ||
                      v.category === category) &&
                    (route !== "search" ||
                      (v.title + " " + v.channel + " " + v.category)
                        .toLowerCase()
                        .includes(query.toLowerCase())),
                );
  const addLater = (v: Video) => {
    const p = {
      ...playlists,
      "Watch later": [
        v,
        ...(playlists["Watch later"] || []).filter((x) => x.id !== v.id),
      ].slice(0, 200),
    };
    if (write("playlists", p)) {
      setPlaylists(p);
      setMessage("Added to Watch later");
    } else setMessage("Storage is full.");
  };
  const openChannel = (v: Video) => {
    const sources = Object.fromEntries(
      Object.entries({ ...channels, [v.id]: v }).slice(-30),
    );
    setChannels(sources);
    write("channel-sources", sources);
    nav("channel/" + v.id);
  };
  function card(v: Video) {
    return (
      <article className="v-card" key={v.id}>
        <button
          className="v-thumbnail"
          aria-label={"Watch " + v.title}
          onClick={() => play(v)}
        >
          <img src={thumb(v)} alt="" loading="lazy" />
        </button>
        <div className="v-card-copy">
          <button
            className="v-channel-avatar"
            aria-label={`Open ${v.channel} channel photo`}
            onClick={() => openChannel(v)}
          >
            <ChannelAvatar video={v} />
          </button>
          <div>
            <button className="v-title" onClick={() => play(v)}>
              {v.title}
            </button>
            <button
              className="v-channel-name"
              aria-label={`Open ${v.channel} channel`}
              onClick={() => openChannel(v)}
            >
              {v.channel}
            </button>
            <small>
              {route === "search" && liveSearch
                ? "YouTube · Search result"
                : "YouTube · Video"}
            </small>
            <button
              className="v-add-music"
              onClick={() => addMusic(v)}
              aria-label={`Add to music: ${v.title}`}
            >
              <Music2 size={16} />
              {music.some((t) => t.video.id === v.id)
                ? "In music"
                : "Add to music"}
            </button>
          </div>
          <button
            className="v-save"
            aria-label={
              (saved.some((x) => x.id === v.id) ? "Unsave " : "Save ") + v.title
            }
            onClick={() => save(v)}
          >
            {saved.some((x) => x.id === v.id) ? (
              <Check size={19} />
            ) : (
              <Bookmark size={19} />
            )}
          </button>
        </div>
      </article>
    );
  }
  return (
    <div className="video-app">
      <header className="v-header">
        <button className="v-brand" onClick={() => nav("home")}>
          <img src={base + "youtube.svg"} alt="" width="28" height="24" />
          VibeTube
        </button>
        <div>
          <button
            aria-label="Search videos"
            onClick={() => {
              setSuggesting(true);
              nav("search");
            }}
          >
            <Search />
          </button>
          <button aria-label="About and settings" onClick={onAbout}>
            <Settings size={21} />
          </button>
        </div>
      </header>
      {!allowed ? (
        <section className="v-consent">
          <h1>Watch inside VibeTube.</h1>
          <p>
            VibeTube uses YouTube's embedded player and thumbnails. Google may
            receive your IP address, browser data and cookies, and may serve
            ads. Saved items stay on this device. Live search sends your search
            terms to VibeTube’s hosting server.
          </p>
          <p>
            By continuing, you agree to the{" "}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
            >
              YouTube Terms
            </a>{" "}
            and acknowledge the{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Google Privacy Policy
            </a>
            .
          </p>
          <button
            className="primary"
            onClick={() => {
              write("video-consent", true);
              setAllowed(true);
            }}
          >
            Agree & start watching
          </button>
          <button className="v-text" onClick={onAbout}>
            About & privacy
          </button>
        </section>
      ) : (
        <>
          {active && (
            <Player
              ref={playerControl}
              video={active}
              expanded={watch}
              musicDock={route === "music"}
              onExpand={() => nav(watch ? "home" : "watch/" + active.id)}
              onClose={() => {
                setActive(null);
                setIsPlaying(false);
                setMusicSession(false);
                if (watch) nav("home");
              }}
              onStarted={started}
              onPlaybackChange={setIsPlaying}
              onLoadingChange={setMusicLoading}
              onEnded={() => {
                const screen = document
                  .querySelector(".player-screen")
                  ?.getBoundingClientRect();
                const viewport = window.visualViewport;
                const top = viewport?.offsetTop || 0,
                  left = viewport?.offsetLeft || 0;
                const width = viewport?.width || innerWidth,
                  height = viewport?.height || innerHeight;
                const visible = screen
                  ? Math.max(
                      0,
                      Math.min(screen.right, left + width) -
                        Math.max(screen.left, left),
                    ) *
                    Math.max(
                      0,
                      Math.min(screen.bottom, top + height) -
                        Math.max(screen.top, top),
                    )
                  : 0;
                if (
                  musicSession &&
                  !document.hidden &&
                  !document.querySelector("dialog[open]") &&
                  screen &&
                  visible > (screen.width * screen.height) / 2
                )
                  stepMusic(1, false);
              }}
            />
          )}
          <main className="v-main">
            {route === "search" && (
              <section className="v-search">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Search videos or paste a YouTube link"
                    aria-controls="search-suggestions"
                    value={query}
                    onFocus={() => setSuggesting(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSuggesting(false);
                      if (e.key === "ArrowDown") {
                        document
                          .getElementById("search-suggestions")
                          ?.querySelector("button")
                          ?.focus();
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSuggesting(true);
                    }}
                    placeholder="Search videos or paste a YouTube link"
                  />
                  <button aria-label="Submit search">
                    <Search />
                  </button>
                </form>
                <SearchSuggestions
                  value={query}
                  enabled={liveSearch && suggesting}
                  onSelect={submit}
                  onDismiss={() => setSuggesting(false)}
                />
                <p>
                  {liveSearch
                    ? "Search public YouTube videos through VibeTube’s server, or paste a video link."
                    : "Search this collection, or paste a YouTube video link to play it here."}
                </p>
              </section>
            )}
            {route === "playback-settings" ? (
              <BackendSettings
                onChange={() => {
                  setActive(null);
                  setLiveSearch(liveSearchEnabled());
                }}
              />
            ) : route.startsWith("channel/") ? (
              <ChannelPage
                videoId={route.slice(8)}
                source={channels[route.slice(8)]}
                live={liveSearch}
                card={card}
                onBack={() =>
                  history.length > 1 ? history.back() : nav("home")
                }
              />
            ) : route === "music" ? (
              <MusicLibrary
                tracks={music}
                activeId={active?.id}
                playing={isPlaying}
                loading={musicLoading}
                onBrowse={browseMusic}
                onPlay={(track) => {
                  if (active?.id === track.video.id && isPlaying) {
                    setMusicSession(true);
                    playerControl.current?.pause();
                  } else play(track.video, true);
                }}
                onStep={stepMusic}
                onRemove={(id) => {
                  const next = music.filter((t) => t.video.id !== id);
                  if (write("music", next)) {
                    setMusic(next);
                    if (musicSession && active?.id === id) {
                      setActive(null);
                      setIsPlaying(false);
                      setMusicSession(false);
                    }
                    setMessage("Removed from music");
                  } else setMessage("Could not update your music collection.");
                }}
                onEdit={(id, title, artist) => {
                  if (!title || !artist) {
                    setMessage("Enter a song title and artist.");
                    return false;
                  }
                  const next = music.map((t) =>
                    t.video.id === id ? { ...t, title, artist } : t,
                  );
                  if (!write("music", next)) {
                    setMessage("Could not save song details.");
                    return false;
                  }
                  setMusic(next);
                  return true;
                }}
              />
            ) : watch && active ? (
              <section className="v-watch">
                <h1>{active.title}</h1>
                <div className="v-meta">
                  <button
                    className="v-channel-avatar"
                    aria-label={`Open ${active.channel} channel photo`}
                    onClick={() => openChannel(active)}
                  >
                    <ChannelAvatar video={active} />
                  </button>
                  <button
                    className="v-channel-name"
                    aria-label={`Open ${active.channel} channel`}
                    onClick={() => openChannel(active)}
                  >
                    {active.channel}
                  </button>
                  <span>Playing inside VibeTube</span>
                </div>
                <div className="v-watch-actions">
                  <button onClick={() => save(active)}>
                    <Bookmark size={18} />
                    {saved.some((v) => v.id === active.id) ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => addLater(active)}>
                    <Plus size={18} />
                    Watch later
                  </button>
                  <button onClick={() => addMusic(active)}>
                    <Music2 size={18} />
                    {music.some((t) => t.video.id === active.id)
                      ? "In music"
                      : "Add to music"}
                  </button>
                  <button
                    onClick={() =>
                      setMessage(
                        active.description ||
                          "No description is available for this video. It is played by the official YouTube embed.",
                      )
                    }
                  >
                    Description
                  </button>
                </div>
                <h2>More to watch</h2>
                {related.loading && <p role="status">Finding more videos…</p>}
                {related.error && (
                  <div className="v-request-error" role="alert">
                    <p>{related.error}</p>
                    <button onClick={related.retry}>Retry suggestions</button>
                  </div>
                )}
                <div className="v-grid v-related">
                  {(related.items.length ? related.items : catalog)
                    .filter((v) => v.id !== active.id)
                    .map(card)}
                </div>
                {related.hasMore && (
                  <button
                    className="v-load-more"
                    disabled={related.loading}
                    onClick={related.more}
                  >
                    More videos
                  </button>
                )}
              </section>
            ) : route === "library" ? (
              <section className="v-library">
                <h1>Your library</h1>
                <p>Saved on this device · No account synchronization</p>
                <button
                  onClick={() => {
                    setActive(null);
                    nav("playback-settings");
                  }}
                >
                  <Settings />
                  Playback settings
                </button>
                <button onClick={() => nav("saved")}>
                  <Bookmark />
                  Saved videos<span>{saved.length}</span>
                </button>
                <button onClick={() => nav("history")}>
                  <History />
                  History<span>{recent.length}</span>
                </button>
                <h2>Playlists</h2>
                {Object.entries(playlists).map(([n, v]) => (
                  <button key={n} onClick={() => nav("playlist/" + n)}>
                    <ListVideo />
                    {n}
                    <span>{v.length} videos</span>
                  </button>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const n = String(
                      new FormData(form).get("name") || "",
                    ).trim();
                    if (!n || n in playlists) return;
                    const p = { ...playlists, [n]: [] };
                    if (write("playlists", p)) {
                      setPlaylists(p);
                      form.reset();
                    }
                  }}
                >
                  <input
                    name="name"
                    aria-label="New playlist name"
                    placeholder="New playlist name"
                    required
                    maxLength={50}
                  />
                  <button aria-label="Create playlist">
                    <Plus />
                  </button>
                </form>
              </section>
            ) : (
              <>
                {route === "home" && (
                  <>
                    <div className="v-chips">
                      {["All", "Music", "Films", "Nature", "Technology"].map(
                        (c) => (
                          <button
                            key={c}
                            aria-pressed={category === c}
                            onClick={() => setCategory(c)}
                          >
                            {c}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="v-feed-title">
                      <h1>Find your next favorite.</h1>
                      <small>
                        {liveSearch ? "Discover videos" : "Local collection"}
                      </small>
                    </div>
                  </>
                )}
                {["saved", "history"].includes(route) ||
                route.startsWith("playlist/") ? (
                  <div className="v-page-title">
                    <button
                      aria-label="Back to library"
                      onClick={() => nav("library")}
                    >
                      <ArrowLeft />
                    </button>
                    <h1>
                      {route === "saved"
                        ? "Saved videos"
                        : route === "history"
                          ? "History"
                          : route.slice(9)}
                    </h1>
                  </div>
                ) : null}
                {!liveSearch && ["home", "search"].includes(route) && (
                  <div className="v-request-error">
                    <p>
                      Live search is off. Only the saved collection is shown.
                    </p>
                    <button
                      onClick={() => {
                        write("live-search", true);
                        setLiveSearch(true);
                      }}
                    >
                      Enable live search
                    </button>
                  </div>
                )}
                {(loading ||
                  (route === "home"
                    ? feed.loading
                    : route === "search" && search.loading)) && (
                  <p role="status" className="v-loading">
                    Loading videos…
                  </p>
                )}
                {(route === "home"
                  ? feed.error
                  : route === "search"
                    ? search.error
                    : "") && (
                  <div className="v-request-error" role="alert">
                    <p>
                      {route === "home"
                        ? `${feed.error} Showing the offline collection until you retry.`
                        : search.error}
                    </p>
                    <button
                      onClick={route === "home" ? feed.retry : search.retry}
                    >
                      Retry loading videos
                    </button>
                  </div>
                )}
                <div className="v-grid">{list.map(card)}</div>
                {(route === "home"
                  ? feed.hasMore
                  : route === "search" && search.hasMore) && (
                  <button
                    className="v-load-more"
                    disabled={route === "home" ? feed.loading : search.loading}
                    onClick={route === "home" ? feed.more : search.more}
                  >
                    Load more videos
                  </button>
                )}
                {!list.length &&
                  !loading &&
                  !search.loading &&
                  !feed.loading && (
                    <div className="v-empty">
                      <h2>
                        {route === "search" && !searchTerm
                          ? "What do you want to watch?"
                          : "No videos here yet"}
                      </h2>
                      <p>
                        {route === "search"
                          ? "Search for music, a creator or a video title, or paste a YouTube link."
                          : "Save a video or explore the collection to get started."}
                      </p>
                    </div>
                  )}
              </>
            )}
          </main>
          <nav className="v-nav" aria-label="Main navigation">
            <button
              aria-current={route === "home" ? "page" : undefined}
              onClick={() => nav("home")}
            >
              <Home />
              <span>Home</span>
            </button>
            <button
              aria-current={route === "music" ? "page" : undefined}
              onClick={() => nav("music")}
            >
              <Music2 />
              <span>Music</span>
            </button>
            <button
              aria-current={route === "search" ? "page" : undefined}
              onClick={() => {
                setSuggesting(true);
                nav("search");
              }}
            >
              <Search />
              <span>Search</span>
            </button>
            <button
              aria-current={route === "library" ? "page" : undefined}
              onClick={() => nav("library")}
            >
              <Library />
              <span>You</span>
            </button>
          </nav>
        </>
      )}
      {message && (
        <div className="v-toast" role="status">
          <p>{message}</p>
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
