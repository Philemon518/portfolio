import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AI_SITE_MANIFEST } from '../data/aiSiteManifest';
import { ItemId, itemOrder, portfolioItems } from '../data/portfolioItems';

const MobileGarageStage = lazy(() => import('./MobileGarageStage'));

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function MobilePortfolio() {
  const [activeId, setActiveId] = useState<ItemId | null>(null);
  const contact = AI_SITE_MANIFEST.siteOverview.contact;
  const author = AI_SITE_MANIFEST.siteOverview.author;

  const backToList = useCallback(() => {
    setActiveId(null);
  }, []);

  useEffect(() => {
    if (!activeId) {
      document.title = 'Garage Portfolio';
      return;
    }
    document.title = `${portfolioItems[activeId].name} | Garage Portfolio`;
  }, [activeId]);

  if (activeId) {
    return (
      <Suspense
        fallback={
          <div className="mobile-stage-fallback" role="status">
            Loading project…
          </div>
        }
      >
        <MobileGarageStage activeId={activeId} onBackToList={backToList} />
      </Suspense>
    );
  }

  return (
    <div className="mobile-home">
      <header className="mobile-home__header">
        <h1 className="mobile-home__name">{author}</h1>
        <div className="mobile-home__contact">
          <a className="mobile-home__contact-link clickable-hover" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
          <a className="mobile-home__contact-link clickable-hover" href={phoneHref(contact.phone)}>
            {contact.phone}
          </a>
        </div>
        <div className="mobile-home__social">
          <a
            className="mobile-home__btn clickable-hover"
            href={contact.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            className="mobile-home__btn clickable-hover"
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </header>

      <section className="mobile-home__projects" aria-label="Garage projects">
        {itemOrder.map((id) => (
          <button
            key={id}
            type="button"
            className="mobile-home__btn mobile-home__btn--project clickable-hover"
            onClick={() => setActiveId(id)}
          >
            {portfolioItems[id].name}
          </button>
        ))}
      </section>
    </div>
  );
}
