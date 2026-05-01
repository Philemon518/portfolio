/**
 * Loads https://www.youtube.com/iframe_api once and resolves when `YT.Player` exists.
 */
export function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API is browser-only'));
  }
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let watchdog: number | null = null;
    const clearWatchdog = () => {
      if (watchdog != null) {
        window.clearTimeout(watchdog);
        watchdog = null;
      }
    };
    const resolveOnce = () => {
      if (settled || !window.YT?.Player) {
        return;
      }
      settled = true;
      clearWatchdog();
      resolve();
    };
    const rejectOnce = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearWatchdog();
      reject(err);
    };

    watchdog = window.setTimeout(() => {
      rejectOnce(new Error('YouTube IFrame API ready timeout'));
    }, 20000);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } finally {
        resolveOnce();
      }
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) {
      clearWatchdog();
      const start = performance.now();
      const poll = () => {
        resolveOnce();
        if (settled) {
          return;
        }
        if (performance.now() - start > 20000) {
          rejectOnce(new Error('YouTube IFrame API load timeout'));
          return;
        }
        window.setTimeout(poll, 32);
      };
      poll();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = () => {
      rejectOnce(new Error('Failed to load YouTube IFrame API script'));
    };
    document.head.appendChild(tag);
  });
}
