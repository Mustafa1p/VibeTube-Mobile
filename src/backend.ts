import { read } from "./storage";
import type { Video } from "./data";

export const gateway = "https://vibetubemobile.ipxer.online/api.php";
export const liveSearchEnabled = () => read("live-search", true);
export async function backendRequest(
  action: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
) {
  const url = new URL(gateway);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 45000);
  try {
    const response = await fetch(url, {
      credentials: "omit",
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(
        typeof data.error === "string"
          ? data.error
          : "The media server could not respond.",
      );
    return data;
  } catch (e) {
    if (signal?.aborted) throw e;
    if (controller.signal.aborted)
      throw Error("The server took too long to respond. Retry your search.");
    if (e instanceof TypeError)
      throw Error(
        "Could not connect to search. Check your connection and retry.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
export async function searchBackend(
  q: string,
  signal: AbortSignal,
): Promise<Video[]> {
  return (await searchPage(q, 1, signal)).items;
}
export async function searchPage(
  q: string,
  page: number,
  signal: AbortSignal,
  channelVideo = "",
): Promise<{ items: Video[]; hasMore: boolean }> {
  const data = await backendRequest(
    channelVideo ? "channel" : "search",
    channelVideo
      ? { video: channelVideo, page: String(page) }
      : { q, page: String(page) },
    signal,
  );
  if (!Array.isArray(data.items)) throw Error("Invalid search response.");
  const items = data.items
    .filter(
      (v: Video) =>
        /^[\w-]{11}$/.test(v.id) &&
        typeof v.title === "string" &&
        typeof v.channel === "string",
    )
    .slice(0, 20);
  return { items, hasMore: data.hasMore === true };
}
export async function suggestBackend(
  q: string,
  signal: AbortSignal,
): Promise<string[]> {
  const data = await backendRequest(
    "suggest",
    { q, lang: navigator.language || "en" },
    signal,
  );
  if (!Array.isArray(data.suggestions))
    throw Error("Suggestions are unavailable.");
  return data.suggestions
    .filter((s: unknown) => typeof s === "string")
    .slice(0, 8);
}
