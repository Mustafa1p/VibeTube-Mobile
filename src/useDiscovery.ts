import { useEffect, useRef, useState } from "react";
import { searchPage } from "./backend";
import type { Video } from "./data";

const cache = new Map<
  string,
  { expires: number; items: Video[]; hasMore: boolean }
>();
export function useDiscovery(query: string, channelVideo = "") {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const page = useRef(0),
    controller = useRef<AbortController | null>(null);
  async function load(
    q: string,
    n: number,
    c: AbortController,
    refresh = false,
  ) {
    setLoading(true);
    setError("");
    try {
      const key = `${channelVideo ? "channel:" + channelVideo : q}:${n}`;
      const cached = cache.get(key);
      const result =
        !refresh && cached && cached.expires > Date.now()
          ? cached
          : await searchPage(q, n, c.signal, channelVideo);
      if (c.signal.aborted) return;
      if (cache.size >= 50) cache.delete(cache.keys().next().value!);
      cache.set(key, { ...result, expires: Date.now() + 300000 });
      page.current = n;
      setItems((old) =>
        Array.from(
          new Map(
            (n === 1 ? result.items : [...old, ...result.items]).map((v) => [
              v.id,
              v,
            ]),
          ).values(),
        ),
      );
      setHasMore(result.hasMore);
    } catch (e) {
      if (!c.signal.aborted)
        setError((e as Error).message || "Videos could not load. Try again.");
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    setItems([]);
    setHasMore(false);
    setError("");
    page.current = 0;
    if (!query) {
      setLoading(false);
      return;
    }
    const c = new AbortController();
    controller.current = c;
    void load(query, 1, c, attempt > 0);
    return () => controller.current?.abort();
  }, [query, channelVideo, attempt]);
  return {
    items,
    loading,
    error,
    hasMore,
    retry: () => setAttempt((n) => n + 1),
    more: () => {
      if (loading || !hasMore || !query) return;
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      void load(query, page.current + 1, c);
    },
  };
}
