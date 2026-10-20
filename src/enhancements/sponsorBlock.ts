// Adapted from sponsorBlockService.js at upstream commit 0c30f2c.
// MIT notice: public/THIRD-PARTY-LICENSES.txt. This runs only against our HTML5 player.
export interface Segment {
  category: string;
  segment: [number, number];
}
export function normalizeSegments(
  segments: unknown,
  categories: string[],
): Segment[] {
  if (!Array.isArray(segments)) return [];
  return segments
    .filter(
      (item) =>
        item &&
        categories.includes(item.category) &&
        (item.actionType === undefined || item.actionType === "skip") &&
        Array.isArray(item.segment) &&
        item.segment.length === 2 &&
        item.segment.every(Number.isFinite) &&
        item.segment[0] >= 0 &&
        item.segment[1] > item.segment[0],
    )
    .map((item) => ({
      category: item.category,
      segment: item.segment.slice() as [number, number],
    }))
    .sort((a, b) => a.segment[0] - b.segment[0]);
}
export async function sponsorSegments(
  id: string,
  signal: AbortSignal,
): Promise<Segment[]> {
  if (!/^[\w-]{11}$/.test(id)) throw Error("Invalid video ID");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(id),
  );
  const prefix = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 4);
  const url = new URL(`https://sponsorblock.inf.re/api/skipSegments/${prefix}`);
  url.searchParams.set("categories", JSON.stringify(["sponsor"]));
  const r = await fetch(url, {
    credentials: "omit",
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (r.status === 404) return [];
  if (!r.ok)
    throw Error(
      "SponsorBlock is unavailable; playback continues without skipping.",
    );
  const data = await r.json();
  if (!Array.isArray(data)) throw Error("Invalid SponsorBlock response");
  return normalizeSegments(data.find((v) => v?.videoID === id)?.segments, [
    "sponsor",
  ]).slice(0, 200);
}
