# Mobile viewport fix — 3.3.1

The mobile search input previously used 12px text, and the playlist input used 14px. Both now use 16px, avoiding the small-text focus behavior that can enlarge iPhone form fields.

In the installed Home Screen app, the viewport requests scale 1 with scaling disabled. Root touch actions permit horizontal and vertical panning while excluding pinch zoom. Cancelable iOS gesture events and multi-touch moves are suppressed as a fallback; single-finger scrolling, field editing and button taps remain available. Ctrl-wheel pinch gestures are also blocked within the installed app. The ordinary browser installation guide retains its normal viewport and zoom behavior.

The handlers and viewport changes are removed if the app leaves standalone mode. Keyboard opening is not handled by repeatedly resetting scale or forcing focus/blur.

Validation: the production build and formatting checks pass; twelve deterministic Chromium tests and two targeted WebKit tests pass. The viewport checks cover computed 16px field sizes, scale 1 after focusing search and playlist fields, zoom-event cancellation and uncanceled single-touch moves. These are desktop engines with mobile settings and standalone detection emulated, not physical iPhone gesture/keyboard verification. Cross-origin YouTube player controls and operating-system accessibility magnification are outside the page's gesture handlers.
