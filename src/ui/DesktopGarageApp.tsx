import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ItemId, portfolioItems } from '../data/portfolioItems';
import { preloadHandLandmarkerAssets } from '../hand/preloadHandLandmarker';
import { GarageScene } from '../scene/GarageScene';
import { useHandUiStore } from '../stores/handUiStore';
import { usePointerStore } from '../stores/pointerStore';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { DetailHud } from './DetailHud';
import { HandInstructionsModal } from './HandInstructionsModal';
import { HudCamera } from './HudCamera';
import { MousePointerSync } from './MousePointerSync';
import { clearHandPointerHover, useSyntheticHandPointer } from './syntheticHandPointer';
import { VirtualCursor } from './VirtualCursor';

export default function DesktopGarageApp() {
  const [activeId, setActiveId] = useState<ItemId | null>(null);
  const [hoveredId, setHoveredId] = useState<ItemId | null>(null);
  const handMode = useHandUiStore((s) => s.handMode);
  const setHandMode = useHandUiStore((s) => s.setHandMode);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHandInstructions, setShowHandInstructions] = useState(false);
  const [warmRender, setWarmRender] = useState(true);
  const welcomeReadyAt = useRef(Date.now() + 650);
  const welcomePointerArmed = useRef(false);

  const [projectsModelFocus, setProjectsModelFocus] = useState<'arc' | 'fusion' | null>(null);
  const [hintOutlineUntilMs, setHintOutlineUntilMs] = useState<number | null>(null);

  const activeItem = activeId ? portfolioItems[activeId] : null;

  const clearDetail = useCallback(() => {
    setActiveId(null);
    setHoveredId(null);
    setProjectsModelFocus(null);
  }, []);

  const handleHudBack = useCallback(() => {
    if (document.querySelector('[data-laptop-demo-overlay="true"]')) {
      window.dispatchEvent(new CustomEvent('portfolio:laptop-demo-back'));
      return;
    }
    if (activeId === 'projects' && projectsModelFocus) {
      setProjectsModelFocus(null);
      setHoveredId(null);
      return;
    }
    clearDetail();
  }, [activeId, projectsModelFocus, clearDetail]);

  const completeWelcome = useCallback(
    (useHand: boolean) => {
      if (Date.now() < welcomeReadyAt.current || !welcomePointerArmed.current) {
        return;
      }
      welcomePointerArmed.current = false;
      setShowWelcome(false);
      if (useHand) {
        setHandMode(true);
        setShowHandInstructions(true);
      }
    },
    [setHandMode],
  );

  const armWelcomeChoice = useCallback(() => {
    if (Date.now() >= welcomeReadyAt.current) {
      welcomePointerArmed.current = true;
    }
  }, []);

  const armFunWayChoice = useCallback(() => {
    preloadHandLandmarkerAssets();
    armWelcomeChoice();
  }, [armWelcomeChoice]);

  const boringWayOpenResume = useCallback(() => {
    const a = document.createElement('a');
    a.href = `${import.meta.env.BASE_URL}phil-resume.pdf`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    completeWelcome(false);
  }, [completeWelcome]);

  const dismissHandInstructions = useCallback(() => {
    setShowHandInstructions(false);
    setHandMode(false);
  }, [setHandMode]);

  const beginHandMode = useCallback(() => {
    setShowHandInstructions(false);
  }, []);

  const openFunWayInstructions = useCallback(() => {
    preloadHandLandmarkerAssets();
    setHandMode(true);
    setShowHandInstructions(true);
  }, [setHandMode]);

  useEffect(() => {
    if (showWelcome) {
      return undefined;
    }
    setWarmRender(true);
    const id = window.setTimeout(() => setWarmRender(false), 25000);
    return () => window.clearTimeout(id);
  }, [showWelcome]);

  useEffect(() => {
    if (hintOutlineUntilMs == null) {
      return undefined;
    }
    const delay = Math.max(0, hintOutlineUntilMs - Date.now());
    const id = window.setTimeout(() => setHintOutlineUntilMs(null), delay);
    return () => clearTimeout(id);
  }, [hintOutlineUntilMs]);

  const onSynthetic = useSyntheticHandPointer();
  useEffect(() => {
    document.body.classList.toggle('hand-mode', handMode);
    return () => document.body.classList.remove('hand-mode');
  }, [handMode]);

  useEffect(() => {
    if (!handMode) {
      clearHandPointerHover();
    }
  }, [handMode]);

  useEffect(() => {
    const s = usePointerStore.getState();
    if (handMode) {
      s.setFromClient(s.clientX, s.clientY, 'hand');
    } else {
      s.setFromClient(s.clientX, s.clientY, 'mouse');
    }
  }, [handMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        handleHudBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleHudBack]);

  useEffect(() => {
    if (!activeItem) {
      document.title = 'Garage Portfolio';
      return;
    }
    if (activeId === 'projects' && projectsModelFocus === 'arc') {
      document.title = 'Real Life Iron Man Arc Reactor | Garage Portfolio';
    } else if (activeId === 'projects' && projectsModelFocus === 'fusion') {
      document.title = 'DIY Nuclear Fusion Lamp | Garage Portfolio';
    } else {
      document.title = `${activeItem.name} | Garage Portfolio`;
    }
  }, [activeItem, activeId, projectsModelFocus]);

  const canvasDpr: [number, number] = handMode
    ? [1, 1.5]
    : activeId === 'projects' && (projectsModelFocus === 'arc' || projectsModelFocus === 'fusion')
      ? [1, 1.25]
      : [1.25, 2];

  return (
    <div className="app-shell">
      {showWelcome ? (
        <div
          className="welcome-gate"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-gate-title"
        >
          <div className="welcome-gate__backdrop" aria-hidden="true" />
          <div className="welcome-gate__card">
            <h1 id="welcome-gate-title" className="welcome-gate__title">
              Welcome to Phil&apos;s Garage!
            </h1>
            <p className="welcome-gate__body">
              This is Philemon&apos;s portfolio shown in a more fun and personal way. Hope you enjoy!
            </p>
            <div className="welcome-gate__actions">
              <button
                type="button"
                className="welcome-gate__btn clickable-hover"
                onPointerDown={armFunWayChoice}
                onClick={() => completeWelcome(true)}
              >
                Fun Way
              </button>
              <button
                type="button"
                className="welcome-gate__btn clickable-hover"
                onPointerDown={armWelcomeChoice}
                onClick={() => completeWelcome(false)}
              >
                Normal Way
              </button>
              <button
                type="button"
                className="welcome-gate__btn clickable-hover"
                onPointerDown={armWelcomeChoice}
                onClick={boringWayOpenResume}
              >
                Boring Way
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showHandInstructions && !showWelcome ? (
        <div
          className="hand-instructions-backdrop-layer"
          aria-hidden="true"
          onMouseDown={() => dismissHandInstructions()}
        />
      ) : null}

      <CanvasErrorBoundary>
        <Canvas
          shadows
          frameloop={handMode || warmRender ? 'always' : 'demand'}
          dpr={canvasDpr}
          style={{ position: 'relative', zIndex: 0 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onPointerMissed={() => {
            if (activeId === 'projects' && projectsModelFocus) {
              setProjectsModelFocus(null);
              return;
            }
            clearDetail();
          }}
        >
          <GarageScene
            activeId={activeId}
            cameraDebugEnabled={false}
            hoveredId={hoveredId}
            onHoverChange={setHoveredId}
            onCameraPoseChange={() => {}}
            onSelect={setActiveId}
            projectsModelFocus={projectsModelFocus}
            onProjectsModelSelect={setProjectsModelFocus}
            hintOutlineUntilMs={hintOutlineUntilMs}
          />
        </Canvas>
      </CanvasErrorBoundary>

      <DetailHud activeId={activeId} projectsModelFocus={projectsModelFocus} onBack={handleHudBack} />

      {!showWelcome ? (
        <div
          className={
            handMode && showHandInstructions
              ? 'hand-mode-dock hand-mode-dock--above-instructions-dim'
              : 'hand-mode-dock'
          }
        >
          {handMode ? (
            <div className="hand-mode-funway-stack">
              <HudCamera
                onSynthetic={onSynthetic}
                onFistBack={handleHudBack}
                onExitToNormalWay={() => setHandMode(false)}
              />
              <button
                type="button"
                className="hud-funway-btn clickable-hover"
                onClick={() => setHintOutlineUntilMs(Date.now() + 1000)}
                title="Show clickable objects briefly"
              >
                Hint
              </button>
            </div>
          ) : !showHandInstructions ? (
            <>
              <button
                type="button"
                className="hud-funway-btn clickable-hover"
                onClick={openFunWayInstructions}
                aria-pressed={false}
                title="Fun Way (hand & camera)"
              >
                Fun Way
              </button>
              <button
                type="button"
                className="hud-funway-btn clickable-hover"
                onClick={() => setHintOutlineUntilMs(Date.now() + 1000)}
                title="Show clickable objects briefly"
              >
                Hint
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {showHandInstructions && !showWelcome ? (
        <HandInstructionsModal onBegin={beginHandMode} onDismiss={dismissHandInstructions} />
      ) : null}
      <VirtualCursor />
      <MousePointerSync />
    </div>
  );
}
