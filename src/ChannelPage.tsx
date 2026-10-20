import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { catalog, lookup, type Video } from "./data";
import { useDiscovery } from "./useDiscovery";
import ChannelAvatar from "./ChannelAvatar";

export default function ChannelPage({
  videoId,
  source,
  live,
  card,
  onBack,
}: {
  videoId: string;
  source?: Video;
  live: boolean;
  card: (video: Video) => ReactNode;
  onBack: () => void;
}) {
  const [video, setVideo] = useState(source);
  useEffect(() => {
    setVideo(source);
    if (source) return;
    const c = new AbortController();
    lookup(videoId, c.signal)
      .then(setVideo)
      .catch(() => {});
    return () => c.abort();
  }, [source, videoId]);
  const feed = useDiscovery(live ? "channel" : "", videoId);
  const items = live
    ? feed.items
    : catalog.filter((v) => v.channel === video?.channel);
  return (
    <section className="v-channel-page">
      <button className="v-channel-back" onClick={onBack}>
        <ArrowLeft size={20} />
        Back
      </button>
      <header className="v-channel-heading">
        {video && <ChannelAvatar video={video} />}
        <div>
          <h1>{video?.channel || "Channel"}</h1>
          <p>
            {live ? "Channel videos" : "Channel videos in the local collection"}
          </p>
        </div>
      </header>
      {feed.loading && <p role="status">Loading channel videos…</p>}
      {feed.error && (
        <div className="v-request-error" role="alert">
          <p>{feed.error}</p>
          <button onClick={feed.retry}>Retry channel</button>
        </div>
      )}
      <div className="v-grid">{items.map(card)}</div>
      {!feed.loading && !feed.error && !items.length && (
        <p>No public videos are available here.</p>
      )}
      {feed.hasMore && (
        <button
          className="v-load-more"
          disabled={feed.loading}
          onClick={feed.more}
        >
          More channel videos
        </button>
      )}
    </section>
  );
}
