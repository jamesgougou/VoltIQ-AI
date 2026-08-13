/** Debounce delay for Paste Text → parent synchronization (ms). */
export const PASTE_TEXT_SYNC_DEBOUNCE_MS = 200;

export function shouldFlushPasteTextImmediately(
  nextText: string,
  reason: "clear" | "debounce",
): boolean {
  if (reason === "clear") {
    return true;
  }
  return nextText.length === 0;
}

/**
 * Pure helper for tests: given typed local value and sync cadence,
 * parent value lags until debounce settles unless flushed.
 */
export function resolveParentPasteText(options: {
  localText: string;
  parentText: string;
  debounceElapsedMs: number;
  debounceMs?: number;
  flushed?: boolean;
}): string {
  const debounceMs = options.debounceMs ?? PASTE_TEXT_SYNC_DEBOUNCE_MS;
  if (options.flushed || options.debounceElapsedMs >= debounceMs) {
    return options.localText;
  }
  return options.parentText;
}
