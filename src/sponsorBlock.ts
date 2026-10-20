import { useEffect, useState } from "react";
import { read, write } from "./storage";

export interface SponsorSegment {
  start: number;
  end: number;
  duration: number;
}
const eventName = "vibetube-sponsor-preference";
export function useSponsorPreference() {
  const [enabled, setEnabled] = useState(() => read("sponsor-skip", false));
  useEffect(() => {
    const update = () => setEnabled(read("sponsor-skip", false));
    window.addEventListener(eventName, update);
    return () => window.removeEventListener(eventName, update);
  }, []);
  return {
    enabled,
    change: (value: boolean) => {
      if (!write("sponsor-skip", value)) return false;
      window.dispatchEvent(new Event(eventName));
      return true;
    },
  };
}

export function validateSegments(
  data: unknown,
  videoId: string,
): SponsorSegment[] {
  if (!Array.isArray(data)) throw Error("Invalid SponsorBlock response");
  const match = data.find((v) => v?.videoID === videoId);
  if (!match) return [];
  if (!Array.isArray(match.segments))
    throw Error("Invalid SponsorBlock segments");
  return match.segments
    .slice(0, 200)
    .flatMap((s: any) => {
      const [start, end] = Array.isArray(s?.segment) ? s.segment : [];
      const duration = s?.videoDuration;
      return s?.category === "sponsor" &&
        s?.actionType === "skip" &&
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end > start + 0.1 &&
        Number.isFinite(duration) &&
        duration > 0 &&
        end <= duration + 1
        ? [{ start, end, duration }]
        : [];
    })
    .sort((a: SponsorSegment, b: SponsorSegment) => a.start - b.start);
}

const cache = new Map<
  string,
  { expires: number; segments: SponsorSegment[] }
>();
export async function sponsorSegments(videoId: string, signal: AbortSignal) {
  if (!/^[\w-]{11}$/.test(videoId)) throw Error("Invalid video");
  const cached = cache.get(videoId);
  if (cached && cached.expires > Date.now()) return cached.segments;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(videoId),
  );
  const prefix = Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 4);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  const timer = window.setTimeout(cancel, 8000);
  try {
    const url = new URL("https://sponsor.ajay.app/api/skipSegments/" + prefix);
    url.searchParams.set("categories", JSON.stringify(["sponsor"]));
    url.searchParams.set("actionTypes", JSON.stringify(["skip"]));
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (response.status !== 404 && !response.ok)
      throw Error("SponsorBlock unavailable");
    const segments =
      response.status === 404
        ? []
        : validateSegments(await response.json(), videoId);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(videoId, { segments, expires: Date.now() + 600000 });
    return segments;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}

export function segmentAt(
  segments: SponsorSegment[],
  time: number,
  duration: number,
) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0)
    return;
  const eligible = segments.filter(
    (s) => Math.abs(s.duration - duration) <= 2 && s.end <= duration,
  );
  const first = eligible.find((s) => time >= s.start && time < s.end - 0.1);
  if (!first) return;
  let end = first.end;
  for (const s of eligible) if (s.start <= end && s.end > end) end = s.end;
  return { start: first.start, end };
}
