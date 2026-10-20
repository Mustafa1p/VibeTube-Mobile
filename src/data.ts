import videos from "./catalog.json";
export interface Video {
  id: string;
  title: string;
  channel: string;
  category: string;
  description?: string;
  provider?: "direct";
  thumbnail?: string;
}
export const catalog: Video[] = videos;
export const thumb = (v: Video) =>
  v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
export function videoId(value: string) {
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
        u.hostname,
      )
    )
      return null;
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ||
          u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export async function lookup(id: string, signal: AbortSignal): Promise<Video> {
  const known = catalog.find((v) => v.id === id);
  if (known) return known;
  if (!/^[\w-]{11}$/.test(id))
    throw Error("Use a valid YouTube video link or video ID.");
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}&format=json`,
      { signal },
    );
    if (!response.ok) throw Error("Metadata unavailable");
    const d = await response.json();
    return {
      id,
      title: String(d.title),
      channel: String(d.author_name),
      category: "Videos",
    };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return {
      id,
      title: "YouTube video · " + id,
      channel: "YouTube",
      category: "Videos",
      description:
        "Metadata could not be retrieved. The embedded player will report whether this video can play.",
    };
  }
}
