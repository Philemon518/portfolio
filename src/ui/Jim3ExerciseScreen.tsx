import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const JIMBO_APP_STORE_URL = 'https://apps.apple.com/us/app/jimbo-ai-gym-tracker/id6760950960';

const COLORS = {
  white: '#ffffff',
  orangePrimary: '#f97316',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray800: '#1f2937',
  green500: '#22c55e',
  green600: '#16a34a',
  green50: '#f0fdf4',
  green300: '#86efac',
  green700: '#15803d',
  red500: '#ef4444',
} as const;

const MUSCLE_GROUP_S: Record<string, number> = {
  'lower arms': 1200,
  forearms: 1200,
  'upper arms': 2500,
  core: 1800,
  chest: 4000,
  'upper back': 5000,
  'lower back': 4500,
  'upper legs': 8000,
  'lower legs': 5500,
};

const MAX_TOTAL_SETS = 10;
const REPS_ITEM = 32;
const WHEEL_VIEW = 72;
const WHEEL_PAD = (WHEEL_VIEW - REPS_ITEM) / 2;
const WEIGHT_STEP = 5;
const WEIGHT_MAX = 500;
const WEIGHT_ITEM_W = 10;
const RULER_LABEL_EVERY = 50;

function publicAssetUrl(relativePath: string): string {
  const path = relativePath.replace(/^\/+/, '');
  let base = import.meta.env.BASE_URL || '/';
  if (!base.endsWith('/')) {
    base += '/';
  }
  return `${base}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

function titleCaseMuscle(s: string): string {
  const t = s.trim();
  if (!t) {
    return '';
  }
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatTimeMs(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const centis = Math.floor((millis % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function getSValue(targetMuscle: string): number {
  const k = targetMuscle.toLowerCase().trim();
  return MUSCLE_GROUP_S[k] ?? 1800;
}

function calculateV(reps: number, weight: number, s: number): number {
  if (s <= 0) {
    return 0;
  }
  return (reps * weight) / s;
}

function calculateI(reps: number): number {
  if (reps <= 0) {
    return 0;
  }
  return 30 / (30 + reps);
}

function calculateSetXP(v: number, i: number): number {
  const base = 280 * (Math.log(1 + v) + 0.35 * Math.pow(v, 1.15));
  return base * (1 + Math.pow(i, 1.4));
}

function minAllowedTotalSets(completed: boolean[], currentSet: number, totalSets: number): number {
  const nDone = completed.filter(Boolean).length;
  const onValid = currentSet >= 1 && currentSet <= totalSets;
  const currentIncomplete = onValid && !completed[currentSet - 1];
  return Math.max(1, nDone + (currentIncomplete ? 1 : 0));
}

export type Jim3ExerciseDef = {
  id: string;
  name: string;
  target_muscle: string;
  sets: number;
  /** Local asset under `public/` (e.g. `jimbo-demo/foo.jpg`). */
  gifPath?: string;
  /**
   * JimBo Supabase storage key: `exercise-gifs/{gifExerciseId}.gif`.
   * Real app uses short library IDs (e.g. `KenZJQV`), not the route `id` or `variationKey`.
   */
  gifExerciseId?: string;
};

type Props = {
  exercise: Jim3ExerciseDef;
  restDurationSec: number;
  onBack: () => void;
};

export function Jim3ExerciseScreen({ exercise, restDurationSec, onBack }: Props) {
  const restMs = Math.max(1, restDurationSec) * 1000;

  const [totalSets, setTotalSets] = useState(() => Math.min(MAX_TOTAL_SETS, Math.max(1, exercise.sets)));
  const [weights, setWeights] = useState<number[]>(() => Array.from({ length: exercise.sets }, () => 50));
  const [repsList, setRepsList] = useState<number[]>(() => Array.from({ length: exercise.sets }, () => 10));
  const [completedSets, setCompletedSets] = useState<boolean[]>(() =>
    Array.from({ length: exercise.sets }, () => false),
  );

  const [currentSet, setCurrentSet] = useState(1);
  const [displayXP, setDisplayXP] = useState(0);

  const [isFavorite, setIsFavorite] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [remainingMs, setRemainingMs] = useState(restMs);
  const [timerFlashing, setTimerFlashing] = useState(false);
  const [flashTick, setFlashTick] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFinalStar, setShowFinalStar] = useState(false);
  const [rewardPhase, setRewardPhase] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);

  const restStartRef = useRef<number | null>(null);
  const restTargetMsRef = useRef(restMs);
  const rafRef = useRef<number | null>(null);
  const flashIntervalRef = useRef<number | null>(null);

  const repsScrollRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const rulerWrapRef = useRef<HTMLDivElement | null>(null);
  const [rulerPadPx, setRulerPadPx] = useState(140);
  const repsScrollLockRef = useRef(false);

  const setIdx = currentSet - 1;
  const sValue = useMemo(() => getSValue(exercise.target_muscle), [exercise.target_muscle]);

  useEffect(() => {
    const n = Math.min(MAX_TOTAL_SETS, Math.max(1, exercise.sets));
    setTotalSets(n);
    setWeights(Array.from({ length: n }, () => 50));
    setRepsList(Array.from({ length: n }, () => 10));
    setCompletedSets(Array.from({ length: n }, () => false));
    setCurrentSet(1);
    setDisplayXP(0);
    setIsResting(false);
    setRemainingMs(restMs);
    setTimerFlashing(false);
    setFlashTick(0);
    setIsNavigating(false);
    setShowFinalStar(false);
    setRewardPhase(false);
    setGifFailed(false);
  }, [exercise.id, exercise.sets, restMs]);

  useEffect(() => {
    setWeights((w) => {
      const prev = w.length;
      if (totalSets > prev) {
        const add = totalSets - prev;
        return [...w, ...Array.from({ length: add }, () => w[w.length - 1] ?? 50)];
      }
      if (totalSets < prev) {
        return w.slice(0, totalSets);
      }
      return w;
    });
    setRepsList((r) => {
      const prev = r.length;
      if (totalSets > prev) {
        const add = totalSets - prev;
        return [...r, ...Array.from({ length: add }, () => r[r.length - 1] ?? 10)];
      }
      if (totalSets < prev) {
        return r.slice(0, totalSets);
      }
      return r;
    });
    setCompletedSets((c) => {
      const prev = c.length;
      if (totalSets > prev) {
        return [...c, ...Array.from({ length: totalSets - prev }, () => false)];
      }
      if (totalSets < prev) {
        return c.slice(0, totalSets);
      }
      return c;
    });
  }, [totalSets]);

  const scrollRepsTo = useCallback((reps: number) => {
    const el = repsScrollRef.current;
    if (!el) {
      return;
    }
    const r = Math.max(1, Math.min(30, reps));
    el.scrollTop = (r - 1) * REPS_ITEM;
  }, []);

  const scrollRulerToWeight = useCallback(
    (w: number) => {
      const el = rulerRef.current;
      if (!el) {
        return;
      }
      const snapped = Math.round(w / WEIGHT_STEP) * WEIGHT_STEP;
      const clamped = Math.max(0, Math.min(WEIGHT_MAX, snapped));
      const k = clamped / WEIGHT_STEP;
      const tickCenterX = rulerPadPx + k * WEIGHT_ITEM_W + WEIGHT_ITEM_W / 2;
      const scrollTarget = tickCenterX - el.clientWidth / 2;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = Math.max(0, Math.min(maxScroll, scrollTarget));
    },
    [rulerPadPx],
  );

  useLayoutEffect(() => {
    repsScrollLockRef.current = true;
    scrollRepsTo(repsList[setIdx] ?? 10);
    requestAnimationFrame(() => {
      repsScrollLockRef.current = false;
    });
  }, [setIdx, repsList, scrollRepsTo]);

  useLayoutEffect(() => {
    const wrap = rulerWrapRef.current;
    if (!wrap) {
      return;
    }
    const measure = () => {
      setRulerPadPx(Math.max(48, wrap.clientWidth / 2 - WEIGHT_ITEM_W / 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    scrollRulerToWeight(weights[setIdx] ?? 50);
  }, [setIdx, weights, scrollRulerToWeight, rulerPadPx]);

  const endRest = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (flashIntervalRef.current != null) {
      window.clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    restStartRef.current = null;
    setIsResting(false);
    setRemainingMs(restMs);
    setTimerFlashing(false);
    setFlashTick(0);
  }, [restMs]);

  const startFlashing = useCallback(() => {
    setTimerFlashing(true);
    if (flashIntervalRef.current != null) {
      window.clearInterval(flashIntervalRef.current);
    }
    flashIntervalRef.current = window.setInterval(() => {
      setFlashTick((t) => t + 1);
    }, 100);
  }, []);

  const startRestTimer = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    restStartRef.current = performance.now();
    restTargetMsRef.current = restMs;
    setIsResting(true);
    setRemainingMs(restMs);
    setTimerFlashing(false);

    const tick = () => {
      const start = restStartRef.current;
      if (start == null) {
        return;
      }
      const elapsed = performance.now() - start;
      const left = restTargetMsRef.current - elapsed;
      if (left <= 0) {
        setRemainingMs(0);
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        startFlashing();
        return;
      }
      setRemainingMs(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [restMs, startFlashing]);

  const skipRest = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (flashIntervalRef.current != null) {
      window.clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    restStartRef.current = null;
    setIsResting(false);
    setRemainingMs(restMs);
    setTimerFlashing(false);
    setFlashTick(0);
  }, [restMs]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (flashIntervalRef.current != null) {
        window.clearInterval(flashIntervalRef.current);
      }
    };
  }, []);

  const onRepsScroll = useCallback(() => {
    if (repsScrollLockRef.current || completedSets[setIdx]) {
      return;
    }
    const el = repsScrollRef.current;
    if (!el) {
      return;
    }
    const pos = el.scrollTop + WHEEL_VIEW / 2 - WHEEL_PAD;
    const k = Math.floor(pos / REPS_ITEM) + 1;
    const picked = Math.max(1, Math.min(30, k));
    setRepsList((prev) => {
      const next = [...prev];
      if (next[setIdx] !== picked) {
        next[setIdx] = picked;
      }
      return next;
    });
  }, [completedSets, setIdx]);

  const onRulerScroll = useCallback(() => {
    if (completedSets[setIdx]) {
      return;
    }
    const el = rulerRef.current;
    if (!el) {
      return;
    }
    const center = el.scrollLeft + el.clientWidth / 2;
    const idx = Math.round((center - rulerPadPx - WEIGHT_ITEM_W / 2) / WEIGHT_ITEM_W);
    const w = Math.max(0, Math.min(WEIGHT_MAX, idx * WEIGHT_STEP));
    setWeights((prev) => {
      const next = [...prev];
      if (next[setIdx] !== w) {
        next[setIdx] = w;
      }
      return next;
    });
  }, [completedSets, setIdx, rulerPadPx]);

  const onRulerScrollEnd = useCallback(() => {
    const el = rulerRef.current;
    if (!el) {
      return;
    }
    const center = el.scrollLeft + el.clientWidth / 2;
    const k = Math.round((center - rulerPadPx - WEIGHT_ITEM_W / 2) / WEIGHT_ITEM_W);
    const maxK = WEIGHT_MAX / WEIGHT_STEP;
    const clampedK = Math.max(0, Math.min(maxK, k));
    const tickCenterX = rulerPadPx + clampedK * WEIGHT_ITEM_W + WEIGHT_ITEM_W / 2;
    const scrollTarget = tickCenterX - el.clientWidth / 2;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({ left: Math.max(0, Math.min(maxScroll, scrollTarget)), behavior: 'smooth' });
  }, [rulerPadPx]);

  const addSet = useCallback(() => {
    const busy = isResting || isNavigating;
    if (busy || totalSets >= MAX_TOTAL_SETS) {
      return;
    }
    setTotalSets((t) => t + 1);
  }, [isResting, isNavigating, totalSets]);

  const removeSet = useCallback(() => {
    const busy = isResting || isNavigating;
    const minS = minAllowedTotalSets(completedSets, currentSet, totalSets);
    if (busy || totalSets <= minS || completedSets[totalSets - 1]) {
      return;
    }
    setTotalSets((t) => {
      const nt = t - 1;
      setCurrentSet((c) => Math.min(c, nt));
      return nt;
    });
  }, [completedSets, currentSet, isResting, isNavigating, totalSets]);

  const completeCurrentSet = useCallback(() => {
    if (isNavigating) {
      return;
    }
    if (isResting && !timerFlashing) {
      return;
    }
    if (currentSet > totalSets) {
      return;
    }

    if (timerFlashing) {
      skipRest();
      return;
    }

    const idx = currentSet - 1;
    const completingFinal = currentSet >= totalSets;

    const w = weights[idx] ?? 50;
    const r = repsList[idx] ?? 10;
    const v = calculateV(r, w, sValue);
    const i = calculateI(r);
    const xp = calculateSetXP(v, i);

    setDisplayXP((prev) => Math.round(prev + xp));
    setCompletedSets((prev) => {
      const c = [...prev];
      c[idx] = true;
      return c;
    });

    if (!completingFinal) {
      endRest();
      const carried = weights[idx] ?? 50;
      setCurrentSet((c) => c + 1);
      setWeights((prev) => {
        const next = [...prev];
        if (next[idx + 1] != null) {
          next[idx + 1] = carried;
        }
        return next;
      });
      startRestTimer();
      return;
    }

    endRest();
    setIsNavigating(true);
    setShowFinalStar(true);
    window.setTimeout(() => {
      setShowFinalStar(false);
      setIsNavigating(false);
      setRewardPhase(true);
    }, 680);
  }, [
    currentSet,
    endRest,
    isNavigating,
    isResting,
    repsList,
    skipRest,
    sValue,
    startRestTimer,
    timerFlashing,
    totalSets,
    weights,
  ]);

  const handleClaim = useCallback(() => {
    window.open(JIMBO_APP_STORE_URL, '_blank', 'noopener,noreferrer');
  }, []);

  void flashTick;
  const isFlashWhite = timerFlashing && Math.floor(Date.now() / 500) % 2 === 0;
  const flashColor = isFlashWhite ? COLORS.white : COLORS.orangePrimary;
  const timerBg = timerFlashing
    ? isFlashWhite
      ? COLORS.orangePrimary
      : COLORS.white
    : isResting
      ? COLORS.orangePrimary
      : COLORS.white;
  const timerIconColor = timerFlashing ? flashColor : isResting ? COLORS.white : COLORS.gray500;
  const timerTextColor = timerFlashing ? flashColor : isResting ? COLORS.white : COLORS.gray700;

  const busy = isResting || isNavigating || rewardPhase;
  const minS = minAllowedTotalSets(completedSets, currentSet, totalSets);
  const canRemove = totalSets > minS && !completedSets[totalSets - 1] && !busy;
  const canAdd = totalSets < MAX_TOTAL_SETS && !busy;

  const ctaDisabled = isNavigating || (isResting && !timerFlashing);
  const ctaBg = timerFlashing
    ? COLORS.green600
    : isNavigating || (isResting && !timerFlashing)
      ? COLORS.gray300
      : COLORS.orangePrimary;

  let ctaLabel = `Complete Set ${String(currentSet)}`;
  if (timerFlashing) {
    ctaLabel = 'Start Next Set';
  } else if (isResting) {
    ctaLabel = 'Resting...';
  } else if (currentSet === totalSets && !completedSets[totalSets - 1]) {
    ctaLabel = 'Complete Workout';
  }

  const isCompleted = completedSets[setIdx] ?? false;
  const isCurrent = setIdx === currentSet - 1 && !isCompleted;
  const muscleLabel = titleCaseMuscle(exercise.target_muscle);

  const gifUrl = useMemo(() => {
    const p = exercise.gifPath?.trim();
    if (p) {
      return publicAssetUrl(p.replace(/^\/+/, ''));
    }
    const exId = (exercise.gifExerciseId ?? exercise.id).trim();
    return `https://pqihxyuukqvwyvvyfpnx.supabase.co/storage/v1/object/public/exercise-gifs/${exId}.gif`;
  }, [exercise.gifPath, exercise.gifExerciseId, exercise.id]);

  useEffect(() => {
    setGifFailed(false);
  }, [gifUrl]);

  return (
    <div className="jim3-exercise">
      {showFinalStar ? (
        <div className="jim3-exercise__star-overlay" aria-hidden>
          <span className="jim3-exercise__star-icon">★</span>
        </div>
      ) : null}

      <header className="jim3-exercise__header">
        <button type="button" className="jim3-exercise__icon-btn" onClick={onBack} aria-label="Back">
          <span className="jim3-exercise__back-icon" aria-hidden>
            ←
          </span>
        </button>
        <h1 className="jim3-exercise__title">{exercise.name}</h1>
        <button
          type="button"
          className="jim3-exercise__icon-btn"
          onClick={() => setIsFavorite((f) => !f)}
          aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <span className={isFavorite ? 'jim3-exercise__heart jim3-exercise__heart--on' : 'jim3-exercise__heart'} aria-hidden>
            {isFavorite ? '♥' : '♡'}
          </span>
        </button>
      </header>

      {rewardPhase ? (
        <div className="jim3-exercise__reward">
          <h2 className="jim3-exercise__reward-title">Reward:</h2>
          <button type="button" className="jim3-exercise__cta jim3-exercise__cta--claim" onClick={handleClaim}>
            Claim
          </button>
        </div>
      ) : (
        <>
      <div className="jim3-exercise__stats">
        <div className="jim3-exercise__stat-cell">
          <span className="jim3-exercise__stat-inner">
            <span className="jim3-exercise__stat-star" aria-hidden>
              ★
            </span>
            <span className="jim3-exercise__stat-xp">{String(displayXP)}</span>
          </span>
        </div>
        <div className="jim3-exercise__stat-rule" />
        <div className="jim3-exercise__stat-cell">
          <span className="jim3-exercise__stat-inner">
            <span className="jim3-exercise__stat-dumbbell" aria-hidden>
              <svg className="jim3-exercise__stat-dumbbell-svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 5.57 2 7.71 3.43 9.14 2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22 14.86 20.57 16.29 22 18.43 19.86 19.86 18.43 22 16.29 20.57 14.86z" />
              </svg>
            </span>
            <span className="jim3-exercise__stat-sets">
              {String(currentSet)}/{String(totalSets)}
            </span>
          </span>
        </div>
        <div className="jim3-exercise__stat-rule" />
        <div className="jim3-exercise__stat-cell jim3-exercise__stat-cell--controls">
          <div className="jim3-exercise__set-btns">
            <button type="button" className="jim3-exercise__sq-btn" disabled={!canRemove} onClick={removeSet}>
              −
            </button>
            <button type="button" className="jim3-exercise__sq-btn" disabled={!canAdd} onClick={addSet}>
              +
            </button>
          </div>
        </div>
      </div>

      <div
        className="jim3-exercise__timer-row"
        style={{ backgroundColor: timerBg, transition: 'background-color 0.15s ease' }}
      >
        <span className="jim3-exercise__timer-icon" style={{ color: timerIconColor }} aria-hidden>
          ⏱
        </span>
        <div className="jim3-exercise__timer-center">
          <span
            className="jim3-exercise__timer-digits"
            style={{ color: timerTextColor, transition: 'color 0.12s ease' }}
          >
            {formatTimeMs(remainingMs)}
          </span>
        </div>
        {isResting && !timerFlashing ? (
          <button type="button" className="jim3-exercise__skip" onClick={skipRest}>
            SKIP
          </button>
        ) : (
          <span className="jim3-exercise__skip-spacer" aria-hidden />
        )}
      </div>

      <div className="jim3-exercise__main">
        <div
          className="jim3-exercise__set-card"
          style={{
            background: isCompleted ? COLORS.green50 : COLORS.white,
            borderColor: isCompleted ? COLORS.green300 : isCurrent ? COLORS.orangePrimary : COLORS.gray200,
            borderWidth: isCurrent ? 2 : 1,
          }}
        >
          <div className="jim3-exercise__gif-wrap">
            {!gifFailed ? (
              <img
                key={gifUrl}
                className="jim3-exercise__gif"
                src={gifUrl}
                alt=""
                decoding="async"
                onError={() => setGifFailed(true)}
              />
            ) : null}
            {gifFailed ? (
              <div className="jim3-exercise__gif-ph jim3-exercise__gif-ph--shown" aria-hidden>
                <span className="jim3-exercise__gif-ph-icon">🏋</span>
              </div>
            ) : null}
          </div>

          {muscleLabel ? (
            <p className="jim3-exercise__targets">
              <span className="jim3-exercise__targets-label">Targets: </span>
              <span className="jim3-exercise__targets-value">{muscleLabel}</span>
            </p>
          ) : null}

          <div className="jim3-exercise__inputs">
            <div className="jim3-exercise__reps-col">
              <div className="jim3-exercise__input-label">Reps</div>
              {isCompleted ? (
                <div className="jim3-exercise__reps-done" style={{ color: COLORS.green700 }}>
                  {String(repsList[setIdx])}
                </div>
              ) : (
                <div className="jim3-exercise__reps-wheel-outer">
                  <div
                    ref={repsScrollRef}
                    className="jim3-exercise__reps-wheel"
                    onScroll={onRepsScroll}
                    role="listbox"
                    aria-label="Reps"
                  >
                    <div style={{ height: WHEEL_PAD }} aria-hidden />
                    {Array.from({ length: 30 }, (_, i) => {
                      const n = i + 1;
                      const sel = repsList[setIdx] ?? 10;
                      const adj = Math.abs(n - sel);
                      let fs = 11;
                      let fw = 400;
                      let col: string = COLORS.gray300;
                      if (adj === 0) {
                        fs = 22;
                        fw = 700;
                        col = COLORS.orangePrimary;
                      } else if (adj === 1) {
                        fs = 15;
                        col = COLORS.gray500;
                      }
                      return (
                        <div key={n} className="jim3-exercise__reps-item" style={{ fontSize: fs, fontWeight: fw, color: col }}>
                          {String(n)}
                        </div>
                      );
                    })}
                    <div style={{ height: WHEEL_PAD }} aria-hidden />
                  </div>
                </div>
              )}
            </div>

            <div className="jim3-exercise__weight-col">
              <div className="jim3-exercise__weight-row">
                <span className="jim3-exercise__weight-num" style={{ color: isCompleted ? COLORS.green700 : COLORS.orangePrimary }}>
                  {String(Math.round(weights[setIdx] ?? 50))}
                </span>
                <span className="jim3-exercise__weight-unit">lbs</span>
              </div>
              {!isCompleted ? (
                <div className="jim3-exercise__ruler-wrap" ref={rulerWrapRef}>
                  <div
                    ref={rulerRef}
                    className="jim3-exercise__ruler"
                    onScroll={onRulerScroll}
                    onTouchEnd={onRulerScrollEnd}
                    onMouseUp={onRulerScrollEnd}
                  >
                    <div className="jim3-exercise__ruler-spacer" style={{ width: rulerPadPx, flexShrink: 0 }} aria-hidden />
                    {Array.from({ length: WEIGHT_MAX / WEIGHT_STEP + 1 }, (_, idx) => {
                      const wv = idx * WEIGHT_STEP;
                      const isLabel = wv % RULER_LABEL_EVERY === 0;
                      return (
                        <div key={wv} className="jim3-exercise__ruler-tick-wrap" style={{ width: WEIGHT_ITEM_W }}>
                          <div
                            className={isLabel ? 'jim3-exercise__ruler-tick jim3-exercise__ruler-tick--major' : 'jim3-exercise__ruler-tick'}
                            style={{ background: isLabel ? COLORS.gray700 : COLORS.gray400 }}
                          />
                        </div>
                      );
                    })}
                    <div className="jim3-exercise__ruler-spacer" style={{ width: rulerPadPx, flexShrink: 0 }} aria-hidden />
                  </div>
                  <div className="jim3-exercise__ruler-cursor" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="jim3-exercise__pills">
          {Array.from({ length: totalSets }, (_, index) => {
            const done = completedSets[index];
            const cur = index === setIdx;
            return (
              <div
                key={index}
                className="jim3-exercise__pill"
                style={{
                  width: cur ? 28 : 12,
                  background: done ? COLORS.green500 : cur ? COLORS.orangePrimary : COLORS.gray300,
                }}
              >
                {cur ? <span className="jim3-exercise__pill-num">{String(index + 1)}</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="jim3-exercise__footer">
        <button
          type="button"
          className="jim3-exercise__cta"
          style={{
            backgroundColor: ctaBg,
          }}
          disabled={ctaDisabled && !timerFlashing}
          onClick={completeCurrentSet}
        >
          {ctaLabel}
        </button>
      </div>
        </>
      )}
    </div>
  );
}
