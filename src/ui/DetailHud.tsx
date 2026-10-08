import { ItemId, portfolioItems } from '../data/portfolioItems';
import { ArcReactorDetailPanel } from './ArcReactorDetailPanel';
import { CoffeeHlDetailPanel } from './CoffeeHlDetailPanel';
import { FusionLampDetailPanel } from './FusionLampDetailPanel';
import { JuggernogDetailPanel } from './JuggernogDetailPanel';
import { PlateHkDetailPanel } from './PlateHkDetailPanel';
import { PlateNoDetailPanel } from './PlateNoDetailPanel';
import { PlateNyDetailPanel } from './PlateNyDetailPanel';
import { StLawrenceDetailPanel } from './StLawrenceDetailPanel';

export type ProjectsModelFocus = 'arc' | 'fusion' | null;

export function DetailHud({
  activeId,
  projectsModelFocus,
  onBack,
}: {
  activeId: ItemId | null;
  projectsModelFocus: ProjectsModelFocus;
  onBack: () => void;
}) {
  const activeItem = activeId ? portfolioItems[activeId] : null;

  if (!activeItem) {
    return <div className="hud" />;
  }

  return (
    <div className="hud">
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>

      {activeId === 'stlawrence' ? (
        <StLawrenceDetailPanel />
      ) : activeId === 'coffee' ? (
        <CoffeeHlDetailPanel />
      ) : activeId === 'juggernog' ? (
        <JuggernogDetailPanel />
      ) : activeId === 'plate-hk' ? (
        <PlateHkDetailPanel />
      ) : activeId === 'plate-ny' ? (
        <PlateNyDetailPanel />
      ) : activeId === 'plate-no' ? (
        <PlateNoDetailPanel />
      ) : activeId === 'projects' && projectsModelFocus === 'arc' ? (
        <ArcReactorDetailPanel />
      ) : activeId === 'projects' && projectsModelFocus === 'fusion' ? (
        <FusionLampDetailPanel />
      ) : (
        <aside className="detail-card" data-scroll-root>
          {activeItem.eyebrow.trim() || activeItem.location.trim() ? (
            <div className="detail-meta">
              {activeItem.eyebrow.trim() ? <span>{activeItem.eyebrow}</span> : null}
              {activeItem.location.trim() ? <span>{activeItem.location}</span> : null}
            </div>
          ) : null}
          <h2>{activeItem.name}</h2>
          <p className="detail-description">{activeItem.description}</p>
          {activeItem.details.length > 0 ? (
            <div className="detail-pills">
              {activeItem.details.map((detail) => (
                <span key={detail} className="detail-pill">
                  {detail}
                </span>
              ))}
            </div>
          ) : null}
          {activeItem.focusNote ? <p className="focus-note">{activeItem.focusNote}</p> : null}
        </aside>
      )}
    </div>
  );
}
