/** Matches App.css stacked mobile layout breakpoint */
export const MOBILE_STACKED_LAYOUT_QUERY = '(max-width: 900px)';

export function getControlsScrollerElement(): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  if (window.matchMedia(MOBILE_STACKED_LAYOUT_QUERY).matches) {
    return (
      document.querySelector<HTMLElement>('.mobile-controls-scroll') ??
      document.querySelector<HTMLElement>('.controls-panel')
    );
  }
  return document.querySelector<HTMLElement>('.controls-panel');
}
