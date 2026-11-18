import { useEffect, useState } from "react";

// Long enough to read a message (WCAG 2.2.1); paused while hovered or focused
const ALERT_DURATION = 6000;

// `dismiss` must be stable (useCallback), otherwise every re-render restarts the timer
export function useAutoDismiss(text: string | null, dismiss: () => void) {
  const [paused, setPaused] = useState(false);

  // A new text restarts the timer
  useEffect(() => {
    if (!text || paused) return;
    const timer = setTimeout(dismiss, ALERT_DURATION);
    return () => clearTimeout(timer);
  }, [text, paused, dismiss]);

  // The alert unmounts without firing mouseleave/blur: start the next one unpaused
  const [previousText, setPreviousText] = useState(text);
  if (previousText !== text) {
    setPreviousText(text);
    if (!text) setPaused(false);
  }

  return {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };
}
