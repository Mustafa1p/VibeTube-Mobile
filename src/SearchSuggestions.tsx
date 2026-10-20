import { useEffect, useState } from "react";
import { suggestBackend } from "./backend";
import { read } from "./storage";

export default function SearchSuggestions({
  value,
  enabled,
  onSelect,
  onDismiss,
}: {
  value: string;
  enabled: boolean;
  onSelect: (s: string) => void;
  onDismiss: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]),
    [status, setStatus] = useState("");
  useEffect(() => {
    setSuggestions([]);
    setStatus("");
    if (!enabled) return;
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions(
        read<string[]>("search-history", [])
          .filter((s) => typeof s === "string")
          .slice(0, 6),
      );
      return;
    }
    const c = new AbortController();
    const timer = setTimeout(() => {
      setStatus("Finding suggestions…");
      suggestBackend(q.slice(0, 100), c.signal)
        .then((s) => {
          if (!c.signal.aborted) {
            setSuggestions(s);
            setStatus("");
          }
        })
        .catch(() => {
          if (!c.signal.aborted)
            setStatus("Suggestions unavailable. Press Search to find videos.");
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [value, enabled]);
  if (!enabled) return null;
  return (
    <div
      id="search-suggestions"
      className="v-suggestions"
      aria-label="Search suggestions"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onDismiss();
          return;
        }
        if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
        const buttons = Array.from(e.currentTarget.querySelectorAll("button"));
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
          buttons.length;
        buttons[next]?.focus();
        e.preventDefault();
      }}
    >
      {!!suggestions.length && (
        <ul>
          {suggestions.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => onSelect(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
