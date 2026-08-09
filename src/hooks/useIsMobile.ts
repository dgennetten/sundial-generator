import { useEffect, useState } from 'react';

/**
 * Reactive "is the viewport at most `maxWidth` px wide?" check.
 *
 * Replaces scattered `window.innerWidth <= N` reads, which were computed once at
 * render and never updated — so layouts could be wrong after a resize or device
 * rotation. This listens to `matchMedia` and re-renders on change.
 *
 * The breakpoint stays per-component (call sites pass their own value) so this is
 * purely a reactivity/centralization fix, not a behavior change.
 */
export function useIsMobile(maxWidth = 768): boolean {
  const query = `(max-width: ${maxWidth}px)`;

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange(); // sync in case the query changed between renders
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}

export default useIsMobile;
