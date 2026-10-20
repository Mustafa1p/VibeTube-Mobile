import { useEffect } from "react";

const lockedViewport =
  "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

export function useAppViewport(installed: boolean) {
  useEffect(() => {
    if (!installed) return;
    const root = document.documentElement;
    const viewport = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    const previous = viewport?.content;
    root.dataset.appViewport = "locked";
    if (viewport) viewport.content = lockedViewport;

    const gesture = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    const touch = (event: TouchEvent) => {
      if (event.touches.length > 1) gesture(event);
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) gesture(event);
    };
    const options = { capture: true, passive: false };
    document.addEventListener("gesturestart", gesture, options);
    document.addEventListener("gesturechange", gesture, options);
    document.addEventListener("touchmove", touch, options);
    document.addEventListener("wheel", wheel, options);
    return () => {
      delete root.dataset.appViewport;
      if (viewport && previous !== undefined) viewport.content = previous;
      document.removeEventListener("gesturestart", gesture, true);
      document.removeEventListener("gesturechange", gesture, true);
      document.removeEventListener("touchmove", touch, true);
      document.removeEventListener("wheel", wheel, true);
    };
  }, [installed]);
}
