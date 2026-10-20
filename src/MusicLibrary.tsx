import { useState } from "react";
import {
  Music2,
  Play,
  Pause,
  MoreHorizontal,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { thumb, type Video } from "./data";

export interface MusicTrack {
  video: Video;
  title: string;
  artist: string;
}
interface Props {
  tracks: MusicTrack[];
  activeId?: string;
  playing: boolean;
  onPlay: (track: MusicTrack) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, title: string, artist: string) => boolean;
  onBrowse: () => void;
  onStep: (offset: number) => void;
}
export default function MusicLibrary({
  tracks,
  activeId,
  playing,
  onPlay,
  onRemove,
  onEdit,
  onBrowse,
  onStep,
}: Props) {
  const [menu, setMenu] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState(""),
    [artist, setArtist] = useState("");
  const index = tracks.findIndex((t) => t.video.id === activeId);
  return (
    <section className="music-library" aria-label="Your music library">
      <header className="music-hero">
        <div className="music-cover">
          <Music2 size={42} />
        </div>
        <div>
          <span>YOUR COLLECTION</span>
          <h1>My music</h1>
          <p>
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"} · Saved
            on this device
          </p>
        </div>
      </header>
      {tracks.length ? (
        <>
          <div className="music-toolbar">
            <button
              className="music-play-all"
              onClick={() => onPlay(tracks[0])}
            >
              {index === 0 && playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
              {index === 0 && playing ? "Pause" : "Play all"}
            </button>
            <button className="music-discover" onClick={onBrowse}>
              Find music
            </button>
          </div>
          <p className="music-note">
            Standard YouTube playback. Artist names default to the channel; edit
            details to correct them.
          </p>
          {index >= 0 && (
            <div className="music-now">
              <div>
                <span>{playing ? "NOW PLAYING" : "SELECTED TRACK"}</span>
                <p>{tracks[index].title}</p>
              </div>
              <button
                aria-label="Previous track"
                disabled={index === 0}
                onClick={() => onStep(-1)}
              >
                <SkipBack size={20} />
              </button>
              <button
                aria-label="Next track"
                disabled={index === tracks.length - 1}
                onClick={() => onStep(1)}
              >
                <SkipForward size={20} />
              </button>
            </div>
          )}
          <ol className="music-track-list">
            {tracks.map((track) => {
              const id = track.video.id,
                selected = id === activeId;
              return (
                <li
                  key={id}
                  aria-current={selected ? "true" : undefined}
                  className={selected ? "music-track selected" : "music-track"}
                >
                  <span className="music-art">
                    <Music2 size={24} />
                    <img
                      src={thumb(track.video)}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </span>
                  <div className="music-track-copy">
                    <h2>{track.title}</h2>
                    <p>{track.artist}</p>
                  </div>
                  <button
                    className="music-track-play"
                    aria-label={`${selected && playing ? "Pause" : "Play"} ${track.title}`}
                    onClick={() => onPlay(track)}
                  >
                    {selected && playing ? (
                      <Pause size={21} fill="currentColor" />
                    ) : (
                      <Play size={21} fill="currentColor" />
                    )}
                  </button>
                  <div
                    className="music-options"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget))
                        setMenu(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setMenu(null);
                    }}
                  >
                    <button
                      aria-label={`Options for ${track.title}`}
                      aria-expanded={menu === id}
                      onClick={() => setMenu(menu === id ? null : id)}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {menu === id && (
                      <div className="music-menu">
                        <button
                          onClick={() => {
                            setEditing(id);
                            setTitle(track.title);
                            setArtist(track.artist);
                            setMenu(null);
                          }}
                        >
                          Edit song details
                        </button>
                        <button
                          onClick={() => {
                            setMenu(null);
                            onRemove(id);
                          }}
                        >
                          Remove from music
                        </button>
                      </div>
                    )}
                  </div>
                  {editing === id && (
                    <form
                      className="music-edit"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (onEdit(id, title.trim(), artist.trim()))
                          setEditing(null);
                      }}
                    >
                      <label>
                        Song title
                        <input
                          autoFocus
                          aria-label="Song title"
                          value={title}
                          maxLength={300}
                          required
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </label>
                      <label>
                        Artist
                        <input
                          aria-label="Artist"
                          value={artist}
                          maxLength={150}
                          required
                          onChange={(e) => setArtist(e.target.value)}
                        />
                      </label>
                      <div>
                        <button type="submit">Save details</button>
                        <button type="button" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div className="music-empty">
          <Music2 size={38} />
          <h2>Your next favorite belongs here.</h2>
          <p>
            Find a music video and tap Add to music. Your collection will be
            waiting here next time.
          </p>
          <button className="music-play-all" onClick={onBrowse}>
            Find music
          </button>
        </div>
      )}
    </section>
  );
}
