import { useCallback, useEffect, useRef, useState } from 'react';
import { Jim3ExerciseScreen, type Jim3ExerciseDef } from './Jim3ExerciseScreen';

const MAX_WORDS_GOAL = 50;

const FITNESS_GOAL_PLACEHOLDER =
  'I want to be able to shoot consistently like Steph curry. This means strong arms, with great power, and high endurance. I would also need leg power and endurance to shoot far and consistently.';

const FITNESS_GOAL_INPUT_PLACEHOLDER = 'Describe your fitness goal here.';

const PREMADE_PLAN_NAME = 'Project Steph curry';

const SEEDED_AI_ANALYSIS =
  'Your goal of shooting consistently like Steph Curry requires a high level of fitness, focusing on both strength and endurance for your arms and legs. This indicates a need for a comprehensive and intense training program that includes power and endurance exercises, which are characteristic of advanced fitness levels. The dedication to achieving such a specific and demanding skill suggests a commitment to a rigorous workout routine.';

const BUDGET_BACKEND_NOTICE =
  'Error: Due to the creator being a broke college student, no AI backend server is available. Budget is used in the actual app.';

type MockScorePayload = {
  score: number;
  is_valid: boolean;
  rationale: string;
  plan_variables: {
    D: number;
    W: number;
    R: number;
    n: number;
    r_s: number;
    r_w: number;
  };
};

type Phase = 'planForm' | 'analyzing' | 'analysis' | 'exercise';

type Props = {
  onClose: () => void;
};

function wordCount(s: string): number {
  const t = s.trim();
  if (!t) {
    return 0;
  }
  return t.split(/\s+/).length;
}

function scrollBodyToBottom(el: HTMLDivElement | null) {
  if (!el) {
    return;
  }
  requestAnimationFrame(() => {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  });
}

const defaultMock: MockScorePayload = {
  score: 88,
  is_valid: true,
  rationale: SEEDED_AI_ANALYSIS,
  plan_variables: { D: 1, W: 1, R: 0, n: 3, r_s: 1.5, r_w: 3.0 },
};

export function JimBoDemoApp({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('planForm');
  /** Validation, clipboard, and load issues — shown at the top of the form body. */
  const [topError, setTopError] = useState<string | null>(null);

  const [planName, setPlanName] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');

  const [mockScore, setMockScore] = useState<MockScorePayload>(defaultMock);
  const [exercisePool, setExercisePool] = useState<Jim3ExerciseDef[]>([]);
  const [activeExercise, setActiveExercise] = useState<Jim3ExerciseDef | null>(null);

  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const analyzingEpoch = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [scoreRes, exRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}jimbo-demo/mock-score.json`),
          fetch(`${import.meta.env.BASE_URL}jimbo-demo/exercises.json`),
        ]);
        if (cancelled) {
          return;
        }
        if (scoreRes.ok) {
          const j = (await scoreRes.json()) as MockScorePayload;
          setMockScore(j);
        }
        if (exRes.ok) {
          const j = (await exRes.json()) as { exercises: Jim3ExerciseDef[] };
          setExercisePool(j.exercises ?? []);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const phases: Phase[] = ['planForm', 'analyzing', 'analysis'];
    if (phases.includes(phase)) {
      scrollBodyToBottom(bodyScrollRef.current);
    }
  }, [phase, topError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) {
        return;
      }
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [onClose]);

  const copyPremadeFitnessGoal = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FITNESS_GOAL_PLACEHOLDER);
      setTopError(null);
    } catch {
      setTopError('Could not copy premade fitness goal.');
    }
  }, []);

  const pastePremadeDemo = useCallback(() => {
    setPlanName(PREMADE_PLAN_NAME);
    setFitnessGoal(FITNESS_GOAL_PLACEHOLDER);
    setTopError(null);
  }, []);

  const submitPlanForm = useCallback(() => {
    setTopError(null);
    if (!planName.trim()) {
      setTopError('Plan name is required.');
      return;
    }
    if (!fitnessGoal.trim()) {
      setTopError('Please describe your fitness goals.');
      return;
    }
    if (wordCount(fitnessGoal) > MAX_WORDS_GOAL) {
      setTopError(`Fitness goals must be at most ${String(MAX_WORDS_GOAL)} words.`);
      return;
    }
    analyzingEpoch.current += 1;
    const ep = analyzingEpoch.current;
    setPhase('analyzing');
    window.setTimeout(() => {
      if (analyzingEpoch.current !== ep) {
        return;
      }
      setMockScore((m) => ({ ...m, rationale: SEEDED_AI_ANALYSIS }));
      setPhase('analysis');
    }, 5000);
  }, [planName, fitnessGoal]);

  const goToExercise = useCallback(() => {
    setTopError(null);
    const pool = exercisePool.length ? exercisePool : [];
    const ex = pool.find((e) => e.id === 'squat') ?? pool[0] ?? null;
    if (!ex) {
      setTopError('Exercise data not loaded yet.');
      return;
    }
    setActiveExercise(ex);
    setPhase('exercise');
  }, [exercisePool]);

  const restDurationSec = Math.round((mockScore.plan_variables?.r_s ?? 1.5) * 60);
  const wcGoal = wordCount(fitnessGoal);

  return (
    <div
      className="jimbo-demo-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="JimBo_demo.exe fitness demo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <button type="button" className="back-button jimbo-demo-overlay__back" onClick={() => onClose()}>
        Back
      </button>

      <div
        className="jimbo-demo-chrome"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="jimbo-demo-header">
          <span className="jimbo-demo-header__title">JimBo_demo.exe</span>
        </header>

        <div
          className={phase === 'exercise' ? 'jimbo-demo-body jimbo-demo-body--jim3-exercise' : 'jimbo-demo-body'}
          ref={bodyScrollRef}
        >
          {topError ? (
            <p className="jimbo-demo-error" role="alert">
              {topError}
            </p>
          ) : null}

          {phase === 'planForm' || phase === 'analyzing' ? (
            <>
              <div className="jimbo-demo-stack-grow">
                <h2 className="jimbo-demo-h2">Create Your First Plan!</h2>

                <label className="jimbo-demo-label" htmlFor="jimbo-plan-name">
                  What is your Plan Name?
                </label>
                <input
                  id="jimbo-plan-name"
                  className="jimbo-demo-input jimbo-demo-input--block"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g., Push Pull Legs, Full Body, Upper Lower…"
                  value={planName}
                  onChange={(e) => {
                    setPlanName(e.target.value);
                    setTopError(null);
                  }}
                  disabled={phase === 'analyzing'}
                />

                <label className="jimbo-demo-label" htmlFor="jimbo-goal">
                  Describe your fitness goal!
                </label>
                <div className="jimbo-demo-textarea-wrap">
                  <textarea
                    id="jimbo-goal"
                    className="jimbo-demo-textarea"
                    rows={5}
                    placeholder={FITNESS_GOAL_INPUT_PLACEHOLDER}
                    value={fitnessGoal}
                    onChange={(e) => {
                      setFitnessGoal(e.target.value);
                      setTopError(null);
                    }}
                    disabled={phase === 'analyzing'}
                  />
                  <span className="jimbo-demo-wordcount">
                    {String(wcGoal)}/{String(MAX_WORDS_GOAL)}
                  </span>
                </div>
                <div className="jimbo-demo-premade-actions">
                  <button
                    type="button"
                    className="jimbo-demo-btn secondary"
                    onClick={() => void copyPremadeFitnessGoal()}
                    disabled={phase === 'analyzing'}
                  >
                    Copy Premade Fitness Goal
                  </button>
                  <button
                    type="button"
                    className="jimbo-demo-btn secondary"
                    onClick={() => pastePremadeDemo()}
                    disabled={phase === 'analyzing'}
                  >
                    Paste
                  </button>
                </div>
              </div>

              {phase === 'analyzing' ? (
                <div className="jimbo-demo-analyzing-footer jimbo-demo-footer-push">
                  <div className="jimbo-demo-status-row" aria-live="polite">
                    <span className="jimbo-demo-spinner" aria-hidden />
                    <p className="jimbo-demo-status">Analyzing your fitness goals…</p>
                  </div>
                  <p className="jimbo-demo-error jimbo-demo-error--budget" role="alert">
                    {BUDGET_BACKEND_NOTICE}
                  </p>
                </div>
              ) : (
                <div className="jimbo-demo-actions jimbo-demo-footer-push">
                  <button type="button" className="jimbo-demo-btn primary" onClick={() => void submitPlanForm()}>
                    Create Plan
                  </button>
                </div>
              )}
            </>
          ) : null}

          {phase === 'analysis' ? (
            <>
              <div className="jimbo-demo-stack-grow">
                <h2 className="jimbo-demo-h2">AI analysis</h2>
                <p className="jimbo-demo-muted">Here is the analysis for your plan.</p>
                <div className="jimbo-demo-analysis-readonly" role="article">
                  {mockScore.rationale}
                </div>
              </div>
              <div className="jimbo-demo-actions jimbo-demo-footer-push">
                <button type="button" className="jimbo-demo-btn primary" onClick={() => void goToExercise()}>
                  Continue to workout
                </button>
              </div>
            </>
          ) : null}

          {phase === 'exercise' && activeExercise ? (
            <Jim3ExerciseScreen
              exercise={activeExercise}
              restDurationSec={restDurationSec}
              onBack={() => {
                setPhase('analysis');
                setActiveExercise(null);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
