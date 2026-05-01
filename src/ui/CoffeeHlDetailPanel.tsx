import { portfolioItems } from '../data/portfolioItems';

const ICRC_SRC = '/coffee-hl/icrc-logo.png';
const ALUM_POLAROID_SRC = '/coffee-hl/alum-meeting.png';
const MENU_HOT_SRC = '/coffee-hl/menu-hot.png';
const MENU_COLD_SRC = '/coffee-hl/menu-cold.png';

const STATS_LINES = [
  'Coffee HL duration: December 2023 – May 2024 (6 months)',
  'Money donated to charity: $500 USD',
  'Skills built and used: business planning, customer feedback, product experimentation, finance tracking, marketing, barista skills, and graphic design.',
] as const;

const coffee = portfolioItems.coffee;

/** ICRC (inset right of back btn); polaroid at original left, below ICRC. Right: Attributes + menus. Story bottom-left. */
export function CoffeeHlDetailPanel() {
  return (
    <div className="coffee-hud-anchors" aria-label="Coffee HL NGO details">
      <div className="coffee-icrc-block">
        <figure className="coffee-icrc-frame">
          <img src={ICRC_SRC} alt="International Committee of the Red Cross logo" />
        </figure>
      </div>
      <div className="coffee-polaroid-block">
        <div className="coffee-polaroid-wrap">
          <figure className="coffee-polaroid">
            <img src={ALUM_POLAROID_SRC} alt="Coffee HL team meeting an alum" />
            <figcaption className="coffee-polaroid-caption">Scheduled Business meeting with Alum!</figcaption>
          </figure>
        </div>
      </div>

      <div className="coffee-right-col" data-scroll-root>
        <div className="coffee-panel coffee-panel--stats">
          <h3 className="coffee-attributes-heading">Attributes:</h3>
          <ul className="coffee-stats-list">
            {STATS_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="coffee-menu-dock">
          <figure className="coffee-menu-frame">
            <img src={MENU_HOT_SRC} alt="Coffee HL hot drinks menu" />
          </figure>
          <figure className="coffee-menu-frame coffee-menu-frame--tilt">
            <img src={MENU_COLD_SRC} alt="Coffee HL cold drinks menu" />
          </figure>
        </div>
      </div>

      <div className="coffee-panel coffee-panel--intro">
        <h2 className="coffee-brand-title">{coffee.name}</h2>
        <p className="coffee-intro-body">{coffee.description}</p>
      </div>
    </div>
  );
}
