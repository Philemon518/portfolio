import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { ItemId, portfolioItems } from '../data/portfolioItems';
import { GarageScene } from '../scene/GarageScene';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { DetailHud, type ProjectsModelFocus } from './DetailHud';

export default function MobileGarageStage({
  activeId,
  onBackToList,
}: {
  activeId: ItemId;
  onBackToList: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<ItemId | null>(null);
  const [projectsModelFocus, setProjectsModelFocus] = useState<ProjectsModelFocus>(null);

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
    onBackToList();
  }, [activeId, onBackToList, projectsModelFocus]);

  useEffect(() => {
    if (activeId === 'projects' && projectsModelFocus === 'arc') {
      document.title = 'Real Life Iron Man Arc Reactor | Garage Portfolio';
    } else if (activeId === 'projects' && projectsModelFocus === 'fusion') {
      document.title = 'DIY Nuclear Fusion Lamp | Garage Portfolio';
    } else {
      document.title = `${portfolioItems[activeId].name} | Garage Portfolio`;
    }
  }, [activeId, projectsModelFocus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        handleHudBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHudBack]);

  return (
    <div className="app-shell">
      <CanvasErrorBoundary>
        <Canvas
          shadows
          frameloop="always"
          dpr={[1, 1.25]}
          style={{ position: 'relative', zIndex: 0 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
          onPointerMissed={() => {
            if (activeId === 'projects' && projectsModelFocus) {
              setProjectsModelFocus(null);
              return;
            }
            onBackToList();
          }}
        >
          <GarageScene
            soloId={activeId}
            activeId={activeId}
            cameraDebugEnabled={false}
            hoveredId={hoveredId}
            onHoverChange={setHoveredId}
            onCameraPoseChange={() => {}}
            onSelect={() => {}}
            projectsModelFocus={projectsModelFocus}
            onProjectsModelSelect={setProjectsModelFocus}
            hintOutlineUntilMs={null}
          />
        </Canvas>
      </CanvasErrorBoundary>
      <DetailHud activeId={activeId} projectsModelFocus={projectsModelFocus} onBack={handleHudBack} />
    </div>
  );
}
