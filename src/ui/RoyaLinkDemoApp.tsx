import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYoutubeIframeApi } from '../lib/loadYoutubeIframeApi';
import {
  DEMO_VIDEO_ID,
  EXAMPLE_YOUTUBE_URL,
  LANG_OPTIONS,
  ROYA_AI_TRANSLATE_FOOTER,
  SAMPLE_VIDEO_TRANSCRIPT_LINES,
  type DemoTargetLang,
  demoTargetLangToCcLangPref,
  extractYoutubeVideoId,
  parseRoyaPauseSchedule,
  type RoyaPauseEvent,
} from './royaDemoYoutube';

type Props = {
  onClose: () => void;
};

type DemoSession = {
  videoId: string;
  lang: DemoTargetLang;
  sync: boolean;
};

type PipelinePhase = 'retrieving' | 'transcript';

function scrollBodyToBottom(el: HTMLDivElement | null) {
  if (!el) {
    return;
  }
  requestAnimationFrame(() => {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  });
}

/**
 * Portfolio Roya Link demo: translate flow, transcript preview, then YouTube (muted) + continuous
 * translated WAV. Pause schedule from rl24 only freezes the YouTube player, not the HTML audio track.
 */
export function RoyaLinkDemoApp({ onClose }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const [targetLang, setTargetLang] = useState<DemoTargetLang>('zh');
  const [session, setSession] = useState<DemoSession | null>(null);
  const [pipeline, setPipeline] = useState<PipelinePhase | null>(null);
  const [schedule, setSchedule] = useState<RoyaPauseEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [audioMissing, setAudioMissing] = useState(false);
  const [hasStartedFlow, setHasStartedFlow] = useState(false);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const flowEpochRef = useRef(0);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  const resetToInitial = useCallback(() => {
    flowEpochRef.current += 1;
    setSession(null);
    setPipeline(null);
    setSchedule([]);
    setBooting(false);
    setYtReady(false);
    setAudioMissing(false);
    setLoadError(null);
    setUrlInput('');
    setHasStartedFlow(false);
  }, []);

  const copyExampleUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE_YOUTUBE_URL);
      setLoadError(null);
    } catch {
      setLoadError('Could not copy the example URL.');
    }
  }, []);

  const pasteMainUrlFromClipboard = useCallback(async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) {
        setUrlInput(t);
        setLoadError(null);
      }
    } catch {
      setLoadError('Could not read from clipboard.');
    }
  }, []);

  const finalizeToPlayer = useCallback(async (epoch: number, id: string, lang: DemoTargetLang) => {
    if (epoch !== flowEpochRef.current) {
      return;
    }
    setBooting(true);
    try {
      await loadYoutubeIframeApi();
      if (epoch !== flowEpochRef.current) {
        return;
      }
      const base = import.meta.env.BASE_URL || '/';
      const sync = id === DEMO_VIDEO_ID;
      let sched: RoyaPauseEvent[] = [];
      if (sync) {
        const res = await fetch(`${base}roya-demo/demo-${lang}.txt`);
        if (!res.ok) {
          setLoadError('Could not load pause schedule for this language.');
          setSchedule([]);
          setPipeline(null);
          setHasStartedFlow(false);
          return;
        }
        sched = parseRoyaPauseSchedule(await res.text());
      }
      if (epoch !== flowEpochRef.current) {
        return;
      }
      setSchedule(sched);
      setPipeline(null);
      setSession({ videoId: id, lang, sync });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start playback.';
      setLoadError(msg);
      setSchedule([]);
      setPipeline(null);
      setHasStartedFlow(false);
    } finally {
      setBooting(false);
    }
  }, []);

  const runTranslate = useCallback(() => {
    setLoadError(null);
    const id = extractYoutubeVideoId(urlInput);
    if (!id) {
      setLoadError('Paste a valid YouTube link (watch, youtu.be, shorts, embed) or an 11-character video ID.');
      return;
    }

    setHasStartedFlow(true);
    flowEpochRef.current += 1;
    const epoch = flowEpochRef.current;
    const lang = targetLang;

    setSession(null);
    setYtReady(false);
    setAudioMissing(false);
    setPipeline('retrieving');

    window.setTimeout(() => {
      if (epoch !== flowEpochRef.current) {
        return;
      }
      setPipeline('transcript');
      window.setTimeout(() => {
        if (epoch !== flowEpochRef.current) {
          return;
        }
        void finalizeToPlayer(epoch, id, lang);
      }, 5000);
    }, 1200);
  }, [urlInput, targetLang, finalizeToPlayer]);

  const selectLanguage = useCallback(
    (id: DemoTargetLang) => {
      if (id === targetLang) {
        return;
      }
      resetToInitial();
      setTargetLang(id);
    },
    [targetLang, resetToInitial],
  );

  useEffect(() => {
    return () => {
      flowEpochRef.current += 1;
    };
  }, []);

  useEffect(() => {
    scrollBodyToBottom(bodyScrollRef.current);
  }, [pipeline, session, loadError, booting, hasStartedFlow]);

  useEffect(() => {
    if (!session) {
      playerRef.current?.destroy();
      playerRef.current = null;
      setYtReady(false);
      return;
    }

    let cancelled = false;

    void loadYoutubeIframeApi().then(() => {
      if (cancelled || !playerHostRef.current) {
        return;
      }
      playerRef.current?.destroy();
      playerRef.current = null;

      const sync = session.sync;

      const p = new window.YT.Player(playerHostRef.current, {
        videoId: session.videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 1,
          cc_load_policy: 1,
          cc_lang_pref: demoTargetLangToCcLangPref(session.lang),
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!cancelled) {
              setYtReady(true);
            }
          },
          onStateChange: (e) => {
            if (cancelled || !sync) {
              return;
            }
            /* PLAYING — start translated WAV in parallel (rl24: pauses are video-only). */
            if (e.data === 1) {
              const a = audioRef.current;
              if (a) {
                a.muted = false;
                a.volume = 1;
                void a.play().catch(() => {
                  setAudioMissing(true);
                });
              }
            }
          },
        },
      });
      playerRef.current = p;
    });

    return () => {
      cancelled = true;
      setYtReady(false);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !session?.sync) {
      return;
    }
    const base = import.meta.env.BASE_URL || '/';
    a.src = `${base}roya-demo/demo-${session.lang}.wav`;
    a.muted = false;
    a.volume = 1;
    a.load();
    setAudioMissing(false);

    const tryPlayIfVideoIsPlaying = () => {
      const p = playerRef.current;
      if (p && typeof p.getPlayerState === 'function' && p.getPlayerState() === 1) {
        void a.play().catch(() => {
          setAudioMissing(true);
        });
      }
    };
    const kick = window.setTimeout(tryPlayIfVideoIsPlaying, 0);

    return () => {
      window.clearTimeout(kick);
      a.pause();
      a.removeAttribute('src');
    };
  }, [session, ytReady]);

  /**
   * Video-only holds from the timing log (rl24.py): translated audio is one continuous WAV;
   * pauses apply only to the YouTube player so picture stays aligned with the dubbed timeline.
   */
  useEffect(() => {
    if (!session?.sync || !ytReady || schedule.length === 0) {
      return;
    }

    const player = playerRef.current;
    if (!player) {
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let nextIdx = 0;
    let inVideoHold = false;
    let holdTimer: number | null = null;
    let lastVideoTime = -1;

    const recomputeFromVideoTime = (t: number) => {
      nextIdx = 0;
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].pauseAtSec > t + 0.12) {
          nextIdx = i;
          break;
        }
        nextIdx = i + 1;
      }
    };

    const endVideoHold = () => {
      if (holdTimer != null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      inVideoHold = false;
      nextIdx += 1;
      try {
        player.playVideo();
      } catch {
        /* ignore */
      }
    };

    const startVideoHold = (ev: RoyaPauseEvent) => {
      inVideoHold = true;
      try {
        player.pauseVideo();
      } catch {
        /* ignore */
      }
      holdTimer = window.setTimeout(() => {
        endVideoHold();
      }, Math.max(0, ev.holdSec) * 1000);
    };

    const tick = () => {
      if (cancelled) {
        return;
      }
      if (!inVideoHold) {
        const st = player.getPlayerState();
        if (st === 1 || st === 2) {
          const t = player.getCurrentTime();
          if (lastVideoTime >= 0 && Math.abs(t - lastVideoTime) > 1.5) {
            recomputeFromVideoTime(t);
          }
          lastVideoTime = t;

          if (st === 1 && nextIdx < schedule.length) {
            const ev = schedule[nextIdx];
            if (t >= ev.pauseAtSec - 0.055) {
              startVideoHold(ev);
            }
          }
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (holdTimer != null) {
        window.clearTimeout(holdTimer);
      }
      inVideoHold = false;
    };
  }, [session, ytReady, schedule]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) {
        return;
      }
      e.preventDefault();
      onClose();
    };
    const onDemoBack = () => onClose();
    document.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('portfolio:laptop-demo-back', onDemoBack);
    return () => {
      document.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('portfolio:laptop-demo-back', onDemoBack);
    };
  }, [onClose]);

  const busyPipeline = pipeline !== null;
  const busy = busyPipeline || booting;
  const syncNote = session && !session.sync;
  const scheduleNote = session?.sync && schedule.length === 0;

  let statusLine: string | null = null;
  let statusSpinner = false;
  if (pipeline === 'retrieving') {
    statusLine = 'Retrieving transcript…';
    statusSpinner = true;
  } else if (pipeline === 'transcript') {
    statusLine = ROYA_AI_TRANSLATE_FOOTER;
    statusSpinner = true;
  } else if (booting && !session) {
    statusLine = 'Preparing video and translated audio…';
    statusSpinner = true;
  }

  return (
    <div
      className="roya-demo-overlay"
      data-laptop-demo-overlay="true"
      role="dialog"
      aria-modal="true"
      aria-label="RoyaLink_demo.exe portfolio demo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <button type="button" className="back-button roya-demo-overlay__back" onClick={() => onClose()}>
        Back
      </button>

      <div
        className="roya-demo-chrome"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="roya-demo-header">
          <span className="roya-demo-header__title">RoyaLink_demo.exe</span>
        </header>

        <div className="roya-demo-body" ref={bodyScrollRef}>
          <h2 className="roya-demo-h2">Roya Link</h2>
          <p className="roya-demo-subtitle">
            Welcome to the Roya Link Demo! Here is a simulation of what the Google extension does. Disclaimer: Due to
            the creator being a broke college student, no AI backend servers were available so only the premade video is
            functional.
          </p>

          <section className="roya-demo-section roya-demo-section--interactive" aria-label="YouTube URL and translate">
            <label className="roya-demo-field-label" htmlFor="roya-example-url-readonly">
              Example video YouTube URL
            </label>
            <div className="roya-demo-url-row">
              <div id="roya-example-url-readonly" className="roya-demo-url-box" title={EXAMPLE_YOUTUBE_URL}>
                {EXAMPLE_YOUTUBE_URL}
              </div>
              <button
                type="button"
                className="roya-demo-btn roya-demo-btn--ghost roya-demo-btn--compact"
                onClick={() => void copyExampleUrl()}
                disabled={busy}
              >
                Copy
              </button>
            </div>

            <label className="roya-demo-field-label" htmlFor="roya-yt-url">
              YouTube URL
            </label>
            <div className="roya-demo-url-row">
              <input
                id="roya-yt-url"
                className="roya-demo-input roya-demo-input--in-row"
                type="url"
                autoComplete="off"
                placeholder=""
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setLoadError(null);
                }}
                disabled={busy}
              />
              <button
                type="button"
                className="roya-demo-btn roya-demo-btn--ghost roya-demo-btn--compact"
                onClick={() => void pasteMainUrlFromClipboard()}
                disabled={busy}
              >
                Paste
              </button>
            </div>

            <div className="roya-demo-lang-row">
              <span className="roya-demo-field-label" id="roya-lang-label">
                Target language
              </span>
              <div className="roya-lang-toggles" role="radiogroup" aria-labelledby="roya-lang-label">
                {LANG_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={targetLang === o.id}
                    className={
                      targetLang === o.id ? 'roya-lang-toggle roya-lang-toggle--on' : 'roya-lang-toggle'
                    }
                    onClick={() => selectLanguage(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {loadError ? (
              <p className="roya-demo-error" role="alert">
                {loadError}
              </p>
            ) : null}

            {!hasStartedFlow ? (
              <div className="roya-demo-inline-actions roya-demo-inline-actions--center">
                <button type="button" className="roya-demo-btn roya-demo-btn--primary" onClick={() => runTranslate()} disabled={busy}>
                  Translate
                </button>
              </div>
            ) : null}

            {syncNote ? (
              <p className="roya-demo-note roya-demo-note--left" role="status">
                Timed pauses only affect the YouTube player (muted). Translated audio is a separate track for the sample
                video ({DEMO_VIDEO_ID}).
              </p>
            ) : null}
            {scheduleNote ? (
              <p className="roya-demo-note roya-demo-note--left" role="status">
                No pause schedule for this language — the video plays without timed holds.
              </p>
            ) : null}
            {audioMissing ? (
              <p className="roya-demo-note roya-demo-note--left" role="status">
                Could not load the translated WAV for this language.
              </p>
            ) : null}

            {session ? (
              <div className="roya-demo-player-shell">
                <div ref={playerHostRef} className="roya-demo-player-host" />
              </div>
            ) : pipeline === 'transcript' ? (
              <div className="roya-demo-transcript-panel" aria-live="polite">
                <p className="roya-demo-transcript-panel-heading">Transcript:</p>
                <ol className="roya-demo-transcript-list">
                  {SAMPLE_VIDEO_TRANSCRIPT_LINES.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {session?.sync ? (
              <div className="roya-demo-translated-audio-wrap">
                <label className="roya-demo-field-label" htmlFor="roya-translated-audio">
                  Translated audio
                </label>
                <audio
                  ref={audioRef}
                  id="roya-translated-audio"
                  className="roya-demo-translated-audio"
                  controls
                  preload="auto"
                  onError={() => setAudioMissing(true)}
                  onLoadedData={() => setAudioMissing(false)}
                />
              </div>
            ) : null}
          </section>
        </div>

        {statusLine ? (
          <div className="roya-demo-status-bar" aria-live="polite">
            <span className="roya-demo-status-text">{statusLine}</span>
            {statusSpinner ? <span className="roya-demo-spinner roya-demo-spinner--status" aria-hidden /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
