import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  Github,
  Share,
  PlusSquare,
  Smartphone,
  ArrowUpRight,
  Download,
  X,
  WifiOff,
} from "lucide-react";
import UpdatePrompt from "./UpdatePrompt";
import { usePlatform } from "./platform";
import { useAppViewport } from "./useAppViewport";
const Videos = lazy(() => import("./VideoApp"));
const base = import.meta.env.BASE_URL;
const release = "3.5.0";
export default function App() {
  const platform = usePlatform();
  useAppViewport(platform.installed);
  const [device, setDevice] = useState(
      location.hash === "#install-android" ? "android" : "iphone",
    ),
    [update, setUpdate] = useState<ServiceWorker | null>(null),
    [about, setAbout] = useState(false),
    [updateDismissed, setUpdateDismissed] = useState(false),
    [applying, setApplying] = useState(false),
    [updateError, setUpdateError] = useState("");
  const approved = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const changed = () => {
      if (approved.current) location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    let alive = true;
    let registration: ServiceWorkerRegistration | undefined;
    const refresh = () => {
      if (!document.hidden) void registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    navigator.serviceWorker
      .register(base + "sw.js", { scope: base })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && alive) setUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => {
            if (
              alive &&
              w.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setUpdate(w);
          });
        });
      })
      .catch(() =>
        platform.setNotice(
          "Offline setup failed. Check your connection and reload.",
        ),
      );
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, [platform.setNotice]);
  useEffect(() => {
    if (!about) return;
    const before = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      before?.focus();
    };
  }, [about]);
  useEffect(() => {
    const hash = () => {
      if (location.hash === "#install-android") setDevice("android");
      if (location.hash === "#install-iphone") setDevice("iphone");
    };
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  const updateOpen = !!update && !updateDismissed;
  useEffect(() => {
    document.body.classList.toggle("modal-open", about || updateOpen);
    return () => document.body.classList.remove("modal-open");
  }, [about, updateOpen]);
  useEffect(() => {
    if (!applying || !update) return;
    // The player has unmounted before activation, so audio stops before reload.
    const failed = () => {
      approved.current = false;
      setApplying(false);
      setUpdateError("The update could not finish. Please try again.");
    };
    const timer = window.setTimeout(failed, 15000);
    approved.current = true;
    try {
      update.postMessage("ACTIVATE");
    } catch {
      failed();
    }
    return () => window.clearTimeout(timer);
  }, [applying, update]);
  return (
    <>
      {updateOpen && (
        <UpdatePrompt
          applying={applying}
          error={updateError}
          onApply={() => {
            setUpdateError("");
            setAbout(false);
            setApplying(true);
          }}
          onLater={() => setUpdateDismissed(true)}
        />
      )}
      {platform.notice && (
        <div className="notice" role="status">
          {platform.notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => platform.setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {!platform.online && (
        <div className="network-note" role="status">
          <WifiOff size={16} />
          You're offline. Video playback needs a connection.
        </div>
      )}
      {platform.installed ? (
        <Suspense
          fallback={
            <div className="loading-screen" role="status">
              Loading VibeTube…
            </div>
          }
        >
          {applying ? (
            <div className="loading-screen" role="status">
              Applying update…
            </div>
          ) : (
            <Videos onAbout={() => setAbout(true)} />
          )}
        </Suspense>
      ) : (
        <div className="app-shell">
          <header className="site-header">
            <a className="brand" href={base}>
              <img src={base + "icon.svg"} alt="" width="32" height="32" />
              VibeTube Mobile
            </a>
            <span className="header-status">HOME SCREEN PLAYER</span>
            <a
              className="icon-button"
              aria-label="GitHub repository"
              href="https://github.com/Mustafa1p/VibeTube-Mobile"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={20} />
            </a>
          </header>
          <main className="install-main">
            <section className="hero">
              <div className="edition">
                <span className="red-line" />
                WATCH HERE. STAY HERE.
              </div>
              <div className="wordmark" aria-label="VibeTube Mobile">
                <span aria-hidden="true">VIBETUBE</span>
                <small>MOBILE</small>
              </div>
              <h1>
                Your videos.
                <br />
                Inside VibeTube.
              </h1>
              <p className="hero-copy">
                An in-app YouTube player, a curated collection, and your own
                saved videos. Install on your Home Screen to start watching.
              </p>
              <div className="feature-tags">
                <span>No API key</span>
                <span>In-app playback</span>
                <span>Local library</span>
              </div>
              <a className="hero-scroll" href="#installation">
                Installation instructions <ArrowUpRight size={16} />
              </a>
            </section>
            <section className="install-card" id="installation">
              <div className="card-eyebrow">
                <span className="step-pill">INSTALL FIRST</span>
                <Smartphone size={20} />
              </div>
              <h2>
                Add VibeTube
                <br />
                to your Home Screen.
              </h2>
              <div
                className="device-tabs"
                role="group"
                aria-label="Installation device"
              >
                <button
                  aria-pressed={device === "iphone"}
                  onClick={() => {
                    setDevice("iphone");
                    history.replaceState(null, "", "#install-iphone");
                  }}
                >
                  iPhone / iPad
                </button>
                <button
                  aria-pressed={device === "android"}
                  onClick={() => {
                    setDevice("android");
                    history.replaceState(null, "", "#install-android");
                  }}
                >
                  Android
                </button>
              </div>
              <ol className="install-steps">
                <li>
                  <span className="step-number">1</span>
                  <div>
                    <strong>
                      Open in {device === "iphone" ? "Safari" : "Chrome"}
                    </strong>
                    <p>
                      If you are in a social app, open this page in your browser
                      first.
                    </p>
                  </div>
                  <Smartphone size={20} />
                </li>
                <li>
                  <span className="step-number">2</span>
                  <div>
                    <strong>
                      {device === "iphone"
                        ? "Tap Share"
                        : "Open the browser menu"}
                    </strong>
                    <p>
                      {device === "iphone"
                        ? "Choose Add to Home Screen."
                        : "Choose Add to Home screen or Install app."}
                    </p>
                  </div>
                  <Share size={20} />
                </li>
                <li>
                  <span className="step-number">3</span>
                  <div>
                    <strong>Confirm installation</strong>
                    <p>
                      {device === "iphone"
                        ? "Enable Open as Web App if shown, then tap Add."
                        : "Follow the browser installation prompt."}
                    </p>
                  </div>
                  <PlusSquare size={20} />
                </li>
                <li>
                  <span className="step-number">4</span>
                  <div>
                    <strong>Open the VibeTube icon</strong>
                    <p>Browse videos and play them inside this app.</p>
                  </div>
                  <ArrowUpRight size={20} />
                </li>
              </ol>
              {device === "android" && platform.prompt && (
                <button
                  className="primary"
                  onClick={async () => {
                    try {
                      await platform.prompt?.prompt();
                      const r = await platform.prompt?.userChoice;
                      platform.setNotice(
                        r?.outcome === "accepted"
                          ? "Open VibeTube from your Home Screen."
                          : "Installation dismissed. Use the browser menu to try again.",
                      );
                    } catch {
                      platform.setNotice("Use the browser menu to install.");
                    } finally {
                      platform.setPrompt(null);
                    }
                  }}
                >
                  <Download size={18} />
                  Install on Android
                </button>
              )}
              <p className="installation-note">
                Installation is handled by your browser. This page cannot
                automatically add an icon.
              </p>
            </section>
          </main>
          <footer>
            <p>
              VibeTube Mobile
              <span>
                Independent app. Not affiliated with YouTube or Google.
              </span>
            </p>
            <button onClick={() => setAbout(true)}>About & privacy</button>
          </footer>
        </div>
      )}
      {about && (
        <dialog
          ref={dialog}
          aria-label="About VibeTube"
          onCancel={() => setAbout(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbout(false);
          }}
        >
          <div className="modal-heading">
            <h2>About VibeTube</h2>
            <button
              aria-label="Close dialog"
              className="icon-button"
              onClick={() => setAbout(false)}
            >
              <X />
            </button>
          </div>
          <p>VibeTube Mobile {release}</p>
          <p>
            Videos play inside VibeTube through YouTube's official embedded
            player. The app does not forward you to the YouTube website.
          </p>
          <p>
            Search sends your query to VibeTube’s hosting server to find public
            YouTube videos. You can turn live search off in You → Playback
            settings to search only the collection. No developer API key is
            needed.
          </p>
          <p>
            Saved videos, music, playlists, history and playback positions stay
            in this browser. They do not sync with a YouTube account. Full
            YouTube account sign-in is not available in this embedded-player
            architecture.
          </p>
          <p>
            Google receives player and thumbnail requests and may serve cookies
            and ads. VibeTube has no password form, analytics, or account
            server. GitHub serves the app and may retain hosting logs. The media
            server is hosted at vibetubemobile.ipxer.online and supplies search
            and channel-photo metadata. Playback uses only the standard YouTube
            player.
          </p>
          <p>
            Playback and available controls depend on YouTube and the video's
            embedding permissions. Background playback is not provided.
          </p>
          <div className="privacy-links">
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Google privacy
            </a>
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
            >
              YouTube terms
            </a>
          </div>
        </dialog>
      )}
    </>
  );
}
