import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Smartphone,
  ShieldCheck,
  Play,
  WifiOff,
  X,
  RefreshCw,
  ArrowRight,
  Github,
  ExternalLink,
} from "lucide-react";
import { usePlatform } from "./platform";
import type { ReactNode } from "react";
const base = import.meta.env.BASE_URL;
const repo = "https://github.com/Mustafa1p/VibeTube-Mobile";
const youtube = "https://m.youtube.com/";
type Device = "iphone" | "android";
function detectDevice(): Device {
  return /android/i.test(navigator.userAgent) ? "android" : "iphone";
}
function Wordmark() {
  return (
    <div className="wordmark" aria-label="VibeTube Mobile">
      <span aria-hidden="true">VIBETUBE</span>
      <small>MOBILE</small>
    </div>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const focus = document.activeElement as HTMLElement;
    ref.current?.showModal();
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
      focus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const { installed, prompt, setPrompt, online, notice, setNotice } =
    usePlatform();
  const [device, setDevice] = useState<Device>(() =>
      location.hash === "#install-android"
        ? "android"
        : location.hash === "#install-iphone"
          ? "iphone"
          : detectDevice(),
    ),
    [modal, setModal] = useState<"about" | "privacy" | null>(null),
    [pending, setPending] = useState(false),
    [update, setUpdate] = useState<ServiceWorker | null>(null),
    [installing, setInstalling] = useState(false);
  const approved = useRef(false);
  useEffect(() => {
    const resume = () => {
      setPending(false);
      setNotice((current) =>
        current === "Opening official YouTube…" ? "" : current,
      );
    };
    window.addEventListener("pageshow", resume);
    return () => window.removeEventListener("pageshow", resume);
  }, [setNotice]);
  useEffect(() => {
    const hash = () => {
      if (location.hash === "#install-iphone") setDevice("iphone");
      if (location.hash === "#install-android") setDevice("android");
    };
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setNotice(
        "Offline installation is unavailable in this browser. Try Safari on iPhone or Chrome on Android.",
      );
      return;
    }
    let alive = true;
    const change = () => {
      if (approved.current) location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", change);
    navigator.serviceWorker
      .register(base + "sw.js", { scope: base })
      .then((reg) => {
        if (reg.waiting && alive) setUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (
              alive &&
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setUpdate(worker);
          });
        });
      })
      .catch(() =>
        setNotice(
          "Could not prepare offline access. Check your connection, then reload.",
        ),
      );
    return () => {
      alive = false;
      navigator.serviceWorker.removeEventListener("controllerchange", change);
    };
  }, [setNotice]);
  const install = async () => {
    if (!prompt || pending) return;
    setPending(true);
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      setNotice(
        result.outcome === "accepted"
          ? "Installation requested. Finish the browser steps, then open the Home Screen icon."
          : "Installation dismissed. You can try again or use the browser menu.",
      );
    } catch {
      setNotice("The install prompt is unavailable. Use the steps below.");
    } finally {
      setPrompt(null);
      setPending(false);
    }
  };
  const launch = (account = false) => {
    if (!installed || !online || pending) return;
    setPending(true);
    setNotice("Opening official YouTube…");
    window.location.assign(
      account ? "https://www.youtube.com/signin?next=%2F" : youtube,
    );
  };
  const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|wv\)/i.test(
    navigator.userAgent,
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={base} aria-label="VibeTube Mobile home">
          <img src={base + "icon.svg"} alt="" width="32" height="32" />
          <span>
            VibeTube<span className="brand-mobile"> Mobile</span>
          </span>
        </a>
        <span className="header-status">
          <span />
          {installed ? "HOME SCREEN EDITION" : "INSTALL. OPEN. VIBE."}
        </span>
        <a
          className="icon-button"
          href={repo}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
        >
          <Github size={20} />
        </a>
      </header>
      {!online && (
        <div role="status" className="network-note">
          <WifiOff size={17} />
          You're offline.{" "}
          {installed
            ? "Connect to the internet to open YouTube."
            : "Installation instructions are still available."}
        </div>
      )}
      {update && (
        <div className="update-note" role="status">
          <RefreshCw size={16} />A new version is ready.
          <button
            disabled={installing}
            onClick={() => {
              approved.current = true;
              setInstalling(true);
              update.postMessage("ACTIVATE");
            }}
          >
            {installing ? "Updating…" : "Update now"}
          </button>
        </div>
      )}
      <main className={installed ? "installed-main" : "install-main"}>
        <section className="hero">
          <div className="edition">
            <span className="red-line" />
            {installed ? "READY WHEN YOU ARE" : "YOUR HOME SCREEN. YOUR VIBE."}
          </div>
          <Wordmark />
          <h1>
            {installed ? (
              <>
                Your next watch
                <br />
                starts here.
              </>
            ) : (
              <>
                A different entrance.
                <br />
                The YouTube you know.
              </>
            )}
          </h1>
          <p className="hero-copy">
            {installed
              ? "Open the real YouTube. Your videos, your subscriptions, your usual sign-in."
              : "A cinematic little shortcut to the real YouTube. Add VibeTube to your Home Screen, then make yourself at home."}
          </p>
          <div className="feature-tags">
            <span>
              <Check size={14} />
              No API key
            </span>
            <span>
              <ShieldCheck size={14} />
              Official sign-in
            </span>
            <span>
              <Smartphone size={14} />
              iPhone & Android
            </span>
          </div>
          {installed && (
            <section className="launch-panel" aria-label="Installed launcher">
              <span className="installed-badge">
                <Check size={13} />
                Installed & ready
              </span>
              <button
                className="primary launch-button"
                disabled={!online || pending}
                onClick={() => launch()}
              >
                <img src={base + "youtube.svg"} alt="" width="28" height="22" />
                {pending ? "Opening YouTube…" : "Open YouTube"}
                <ArrowUpRight size={21} />
              </button>
              <button
                className="account-button"
                disabled={!online || pending}
                onClick={() => launch(true)}
              >
                Sign in on YouTube <ExternalLink size={16} />
              </button>
              <p className="handoff">
                YouTube opens in your browser or the YouTube app. Sign in there
                with your Google Account. VibeTube does not receive your
                credentials.
              </p>
            </section>
          )}
          {!installed && (
            <a href="#installation" className="hero-scroll">
              Get the Home Screen experience <ChevronDown size={16} />
            </a>
          )}
        </section>
        {!installed && (
          <section
            className="install-card"
            id="installation"
            aria-labelledby="install-heading"
          >
            <div className="card-eyebrow">
              <span className="step-pill">01 — INSTALL FIRST</span>
              <Smartphone size={20} />
            </div>
            <h2 id="install-heading">
              Give it a place
              <br />
              on your Home Screen.
            </h2>
            <p className="card-intro">
              Choose your phone. It takes a few taps.
            </p>
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
            {inApp && (
              <div className="browser-warning">
                You're in an app's browser. Open this link in{" "}
                {device === "iphone" ? "Safari" : "Chrome"} first using the
                browser menu.
              </div>
            )}
            {device === "iphone" ? (
              <ol className="install-steps">
                <li>
                  <span className="step-number">1</span>
                  <div>
                    <strong>Open this page in Safari</strong>
                    <p>Use Safari on your iPhone or iPad.</p>
                  </div>
                  <Smartphone size={19} />
                </li>
                <li>
                  <span className="step-number">2</span>
                  <div>
                    <strong>Tap Share</strong>
                    <p>Find the square with an upward arrow.</p>
                  </div>
                  <Share size={19} />
                </li>
                <li>
                  <span className="step-number">3</span>
                  <div>
                    <strong>Add to Home Screen</strong>
                    <p>Choose Open as Web App if shown, then tap Add.</p>
                  </div>
                  <PlusSquare size={19} />
                </li>
                <li>
                  <span className="step-number">4</span>
                  <div>
                    <strong>Open the VibeTube icon</strong>
                    <p>The YouTube launcher unlocks there.</p>
                  </div>
                  <ArrowUpRight size={19} />
                </li>
              </ol>
            ) : (
              <>
                <ol className="install-steps">
                  <li>
                    <span className="step-number">1</span>
                    <div>
                      <strong>Open this page in Chrome</strong>
                      <p>Use Chrome on your Android phone.</p>
                    </div>
                    <Smartphone size={19} />
                  </li>
                  <li>
                    <span className="step-number">2</span>
                    <div>
                      <strong>Install VibeTube</strong>
                      <p>
                        Tap the install button if available, or Chrome's ⋮ menu
                        → Add to Home screen / Install app.
                      </p>
                    </div>
                    <MoreVertical size={19} />
                  </li>
                  <li>
                    <span className="step-number">3</span>
                    <div>
                      <strong>Open the VibeTube icon</strong>
                      <p>Then tap Open YouTube to start watching.</p>
                    </div>
                    <ArrowUpRight size={19} />
                  </li>
                </ol>
                {prompt && (
                  <button
                    className="primary"
                    disabled={pending}
                    onClick={() => void install()}
                  >
                    <Download size={18} />
                    {pending
                      ? "Waiting for your browser…"
                      : "Install on Android"}
                    <ArrowRight size={18} />
                  </button>
                )}
              </>
            )}
            <div className="install-explainer">
              <ShieldCheck size={16} />
              <p>
                The launcher is available only in the installed app. This
                browser page is your installation guide.
              </p>
            </div>
            <p className="installation-note">
              iPhone installation uses Safari's Share menu. A link or button
              cannot add an icon automatically.
            </p>
          </section>
        )}
      </main>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="how-it-works" aria-label="How VibeTube works">
        <div>
          <span className="feature-icon">
            <Download />
          </span>
          <h3>Install once.</h3>
          <p>
            A lightweight icon on your Home Screen. A quiet starting point for
            what comes next.
          </p>
        </div>
        <div>
          <span className="feature-icon">
            <Play />
          </span>
          <h3>Open the real thing.</h3>
          <p>
            Your videos and playback run on official YouTube, with its familiar
            controls and account features.
          </p>
        </div>
        <div>
          <span className="feature-icon">
            <ShieldCheck />
          </span>
          <h3>Your account stays yours.</h3>
          <p>
            Sign in directly with Google on YouTube. No API key, copied cookies,
            or passwords shared with VibeTube.
          </p>
        </div>
      </section>
      <footer>
        <p>
          VibeTube Mobile
          <span>
            Independent launcher. Not affiliated with YouTube, Google or
            Netflix.
          </span>
        </p>
        <div>
          <button onClick={() => setModal("about")}>How it works</button>
          <button onClick={() => setModal("privacy")}>Privacy</button>
          <a href={repo} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
      {modal && (
        <Modal
          title={
            modal === "about"
              ? "One shortcut. Official YouTube."
              : "Privacy, in plain words."
          }
          close={() => setModal(null)}
        >
          {modal === "about" ? (
            <>
              <p>
                VibeTube is a Home Screen launcher. It does not host a video
                player, mirror YouTube, or manage Google accounts.
              </p>
              <p>
                After installation, tap Open YouTube. Your phone opens the
                official mobile website or hands the link to the YouTube app.
                Navigation outside VibeTube's scope may leave the standalone
                window; this is normal.
              </p>
              <p>
                For sign-in on YouTube, tap the profile icon → Sign in, then use
                your Google Account. Your browser or the YouTube app manages
                that session.
              </p>
              <p>
                Background playback, Picture-in-Picture, downloads, availability
                and Premium features depend on YouTube, your account and your
                device. VibeTube does not change them.
              </p>
              <a
                className="text-link"
                href="https://support.google.com/youtube/answer/3008060"
                target="_blank"
                rel="noreferrer"
              >
                Official YouTube mobile help <ExternalLink size={14} />
              </a>
            </>
          ) : (
            <>
              <p>
                VibeTube has no account database, analytics, API keys, password
                fields, or access to your YouTube account.
              </p>
              <p>
                The app caches its own small installation and launcher screens
                for offline access. It does not cache video, credentials, or
                YouTube pages. GitHub Pages serves these files and may keep
                ordinary hosting logs.
              </p>
              <p>
                Google and YouTube handle your account, cookies, recommendations
                and media after you open YouTube. Their terms and privacy policy
                apply there.
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
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
