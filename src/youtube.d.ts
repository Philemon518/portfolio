/** Minimal typings for YouTube IFrame API (loaded at runtime). */
export {};

declare global {
  namespace YT {
    interface PlayerOptions {
      height?: string | number;
      width?: string | number;
      videoId: string;
      playerVars?: Record<string, string | number | undefined>;
      events?: {
        onReady?: (e: { target: Player }) => void;
        onStateChange?: (e: { data: number; target: Player }) => void;
        onError?: (e: { data: number; target: Player }) => void;
      };
    }

    class Player {
      constructor(el: HTMLElement, options: PlayerOptions);
      destroy(): void;
      getPlayerState(): number;
      getCurrentTime(): number;
      pauseVideo(): void;
      playVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      mute(): void;
      unMute(): void;
      setVolume(vol: number): void;
    }
  }

  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: YT.PlayerOptions) => YT.Player;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
