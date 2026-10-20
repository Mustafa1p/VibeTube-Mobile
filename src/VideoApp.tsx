import { useEffect, useState } from "react";
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
} from "lucide-react";
import Player from "./Player";
import { catalog, lookup, thumb, videoId } from "./data";
import type { Video } from "./data";
import { read, write } from "./storage";
import "./video.css";
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
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [saved, setSaved] = useState<Video[]>(() => read("saved", [])),
    [recent, setRecent] = useState<Video[]>(() => read("history", [])),
    [playlists, setPlaylists] = useState<Record<string, Video[]>>(() =>
      read("playlists", { "Watch later": [] }),
    ),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [allowed, setAllowed] = useState(() => read("video-consent", false));
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
    return () => c.abort();
  }, [route, active?.id, allowed]);
  const watch = !!active && route === "watch/" + active.id;
  const play = (v: Video) => {
    setActive(v);
    nav("watch/" + v.id);
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
  const submit = () => {
    const q = query.trim().slice(0, 200);
    if (!q) return;
    const id = videoId(q);
    nav(id ? "watch/" + id : "search");
    setQuery(q);
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
          <span className="v-avatar">{v.channel[0]}</span>
          <div>
            <button className="v-title" onClick={() => play(v)}>
              {v.title}
            </button>
            <p>{v.channel}</p>
            <small>YouTube · Curated collection</small>
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
          <button aria-label="Search collection" onClick={() => nav("search")}>
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
            ads. Saved items stay on this device.
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
              video={active}
              expanded={watch}
              onExpand={() => nav(watch ? "home" : "watch/" + active.id)}
              onClose={() => {
                setActive(null);
                if (watch) nav("home");
              }}
              onStarted={started}
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
                    aria-label="Search collection or paste a YouTube link"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search collection or paste a YouTube link"
                  />
                  <button aria-label="Submit search">
                    <Search />
                  </button>
                </form>
                <p>
                  Search this collection, or paste a YouTube video link to play
                  it here.
                </p>
              </section>
            )}
            {watch && active ? (
              <section className="v-watch">
                <h1>{active.title}</h1>
                <p className="v-meta">
                  {active.channel} · Playing inside VibeTube
                </p>
                <div className="v-watch-actions">
                  <button onClick={() => save(active)}>
                    <Bookmark size={18} />
                    {saved.some((v) => v.id === active.id) ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => addLater(active)}>
                    <Plus size={18} />
                    Watch later
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
                <h2>More to discover</h2>
                <div className="v-grid">
                  {catalog
                    .filter((v) => v.id !== active.id)
                    .slice(0, 6)
                    .map(card)}
                </div>
              </section>
            ) : route === "library" ? (
              <section className="v-library">
                <h1>Your library</h1>
                <p>Saved on this device · No account synchronization</p>
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
                      {["All", "Films", "Nature", "Technology"].map((c) => (
                        <button
                          key={c}
                          aria-pressed={category === c}
                          onClick={() => setCategory(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="v-feed-title">
                      <h1>Find your next favorite.</h1>
                      <small>Curated collection</small>
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
                {loading && (
                  <p role="status" className="v-loading">
                    Loading video…
                  </p>
                )}
                <div className="v-grid">{list.map(card)}</div>
                {!list.length && !loading && (
                  <div className="v-empty">
                    <h2>No videos here yet</h2>
                    <p>
                      {route === "search"
                        ? "Try a title from the collection or paste a YouTube video link."
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
              aria-current={route === "search" ? "page" : undefined}
              onClick={() => nav("search")}
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
