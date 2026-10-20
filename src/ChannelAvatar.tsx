import { useEffect, useRef, useState } from "react";
import type { Video } from "./data";
import { backendRequest } from "./backend";

const cache = new Map<string, Promise<string | null>>();
const queue: (() => Promise<void>)[] = [];
let active = 0;
function run() {
  while (active < 3 && queue.length) {
    active++;
    void queue.shift()!().finally(() => {
      active--;
      run();
    });
  }
}
function avatar(video: Video) {
  const params: Record<string, string> =
    video.channelId && /^UC[\w-]{22}$/.test(video.channelId)
      ? { channel: video.channelId }
      : { video: video.id };
  const key = params.channel || video.id;
  if (cache.has(key)) return cache.get(key)!;
  const result = new Promise<string | null>((resolve) => {
    queue.push(async () => {
      try {
        const data = await backendRequest("avatar", params);
        const u = new URL(data.url);
        resolve(
          u.protocol === "https:" &&
            ["yt3.googleusercontent.com", "yt3.ggpht.com"].includes(
              u.hostname,
            ) &&
            !u.username &&
            !u.password
            ? u.href
            : null,
        );
      } catch {
        resolve(null);
      }
    });
    run();
  });
  if (cache.size >= 150) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
export default function ChannelAvatar({ video }: { video: Video }) {
  const host = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    setUrl(null);
    const load = () => {
      void avatar(video).then((u) => {
        if (!disposed) setUrl(u);
      });
    };
    if (!("IntersectionObserver" in window)) {
      load();
      return () => {
        disposed = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "120px" },
    );
    if (host.current) observer.observe(host.current);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [video.id, video.channelId]);
  return (
    <span className="v-avatar" ref={host}>
      {url ? (
        <img
          src={url}
          alt={`${video.channel} channel`}
          referrerPolicy="no-referrer"
          onError={() => setUrl(null)}
        />
      ) : (
        <span aria-label={`${video.channel} channel`}>
          {video.channel.charAt(0) || "?"}
        </span>
      )}
    </span>
  );
}
