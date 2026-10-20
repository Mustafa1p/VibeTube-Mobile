import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

export default function UpdatePrompt({
  applying,
  error,
  onApply,
  onLater,
}: {
  applying: boolean;
  error: string;
  onApply: () => void;
  onLater: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => before?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="update-dialog"
      aria-labelledby="update-title"
      aria-describedby="update-description"
      aria-busy={applying}
      onCancel={(event) => {
        event.preventDefault();
        if (!applying) onLater();
      }}
    >
      <div className="update-symbol" aria-hidden="true">
        <RefreshCw size={28} className={applying ? "update-spinning" : ""} />
      </div>
      <h2 id="update-title">
        {applying ? "Updating VibeTube…" : "A playback update is ready"}
      </h2>
      <p id="update-description">
        {applying
          ? "Applying the update. The app will reopen automatically."
          : "Get the latest improvements. Updating stops playback and reloads the app. Your saved music and videos stay on this device."}
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="update-actions">
        <button
          className="primary"
          autoFocus
          disabled={applying}
          onClick={onApply}
        >
          {applying ? "Updating…" : "Update now"}
        </button>
        <button className="update-later" disabled={applying} onClick={onLater}>
          Later
        </button>
      </div>
    </dialog>
  );
}
