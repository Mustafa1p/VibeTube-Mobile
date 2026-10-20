import { useEffect, useState } from "react";
export interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
export function isStandalone() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
export function usePlatform() {
  const [installed, setInstalled] = useState(isStandalone),
    [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [online, setOnline] = useState(navigator.onLine),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const media = matchMedia("(display-mode: standalone)");
    const mode = () => setInstalled(isStandalone());
    const net = () => setOnline(navigator.onLine);
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setPrompt(null);
      setNotice("Installed. Open VibeTube from your Home Screen to continue.");
      mode();
    };
    media.addEventListener("change", mode);
    window.addEventListener("pageshow", mode);
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      media.removeEventListener("change", mode);
      window.removeEventListener("pageshow", mode);
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);
  return { installed, prompt, setPrompt, online, notice, setNotice };
}
