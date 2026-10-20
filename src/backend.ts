import { read } from "./storage";
import type { Video } from "./data";

export const gateway = "https://vibetubemobile.ipxer.online/api.php";
export const backendEnabled = () => read("experimental-media", false);
export const liveSearchEnabled = () => read("live-search", true);
export async function backendRequest(
  action: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
) {
  const url = new URL(gateway);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = await fetch(url, {
    credentials: "omit",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
      : AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(
      typeof data.error === "string"
        ? data.error
        : "The media server could not respond.",
    );
  return data;
}
export async function resolveMedia(id: string, signal: AbortSignal) {
  if (!/^[\w-]{11}$/.test(id)) throw Error("Invalid video ID.");
  const data = await backendRequest("video", { id }, signal);
  const media = new URL(data.media, gateway);
  if (
    media.origin !== new URL(gateway).origin ||
    media.pathname !== "/api.php" ||
    media.searchParams.get("action") !== "media" ||
    !/^[a-f0-9]{48}$/.test(media.searchParams.get("token") || "")
  )
    throw Error("The server returned an invalid media ticket.");
  return { url: media.href, height: Number(data.height) || null };
}
export async function searchBackend(
  q: string,
  signal: AbortSignal,
): Promise<Video[]> {
  const data = await backendRequest("search", { q }, signal);
  if (!Array.isArray(data.items)) throw Error("Invalid search response.");
  return data.items
    .filter(
      (v: Video) =>
        /^[\w-]{11}$/.test(v.id) &&
        typeof v.title === "string" &&
        typeof v.channel === "string",
    )
    .slice(0, 8);
}
