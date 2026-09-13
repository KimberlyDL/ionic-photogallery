const DEFAULT_DELAY = 500;

// Generic press-and-hold detector: fires `onLongPress` after `delay` ms of
// holding, and lets the caller check `wasLongPress` from a subsequent click
// handler to swallow the tap that the browser fires on pointer-up.
export function useLongPress<T>(onLongPress: (item: T) => void, delay = DEFAULT_DELAY) {
  let timer: number | null = null;
  let firedFor: T | null = null;

  const start = (item: T) => {
    firedFor = null;
    timer = window.setTimeout(() => {
      firedFor = item;
      onLongPress(item);
    }, delay);
  };

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const wasLongPress = (item: T) => {
    const fired = firedFor === item;
    firedFor = null;
    return fired;
  };

  return { start, cancel, wasLongPress };
}
