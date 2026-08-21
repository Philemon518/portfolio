import { useState } from 'react';

/** Alex Lab build video — opens at 5:14, muted; captions requested via embed params. */
const ARC_REACTOR_VIDEO_EMBED =
  'https://www.youtube-nocookie.com/embed/FDVrM929s70?start=314&mute=1&autoplay=1&cc_load_policy=1&playsinline=1&rel=0&modestbranding=1';

/** Drop your PNGs into `public/engineering/` with these names (or change paths here). */
const POLAROID_HHO_SRC = '/engineering/arc-hho-generator.jpg';
/** RC nitro / helicopter engine (PNG in `public/engineering/`; re-encode HEIC to PNG/JPEG for web). */
const POLAROID_ENGINE_SRC = '/engineering/helicopter-engine.png';

export const ARC_REACTOR_MAIN_TITLE = 'Real Life Iron Man Arc Reactor';

export const ARC_REACTOR_MAIN_BODY =
  'Ever since the 6th grade, I\'ve always asked "If H2O has both fuel and oxydiser, why don\'t we use water as a fuel?" This lead to this rabit whole and the creation of this project.';

export const ARC_REACTOR_SIDE_TITLE = 'What is it?';

export const ARC_REACTOR_SIDE_PARAS = [
  'After learning that was is H2O, I quickly saw that water could be a inexpensive fuel source, so I start researching on my iPad as a 12 year old. This lead to me learning electrolysis, ionic bonds, and electromagnetism as a 6th grader.',
  'I also stumbled upon a channel called Alex Lab where he turned water electrolysis into the main reactor that powers Iron Man. He used it to provide fuel for the arm repulsors, a pressuriser to have pump artificial muscles for assisted strength. It felt Eureka! He also uploaded detailed documentation on his research and treated the project with respect and high quality.',
  'In high school, I used his research as reference and made a small helicopter engine run on a Hydrogen and Oxygen generator that uses water, Sodium hydroxide, and electricity. This technology is a work in progress, but I hope to one day manufacter these generators to have it replace natural gas as water is more abundant and has zero carbon emissions when combusted.',
  'Currently, I am working on a design that can uses my 12V socket at the back of my CR-V. when I go car camping, I can have a generator that turns water to hydrogen and oxygen to fuel a stove to cook in the wilderness. Not requireing natural gas replenishment or wasting metal canisters.',
] as const;

/** Same structure as `CoffeeHlDetailPanel` polaroid: `coffee-polaroid-wrap` → `figure.coffee-polaroid` → image + `coffee-polaroid-caption`. */
function ArcPolaroidCoffee({ src, caption }: { src: string; caption: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="coffee-polaroid-wrap">
      <figure className="coffee-polaroid">
        {!failed ? (
          <img
            src={src}
            alt=""
            decoding="async"
            style={{ display: loaded ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : null}
        {!loaded || failed ? <div className="arc-coffee-polaroid-placeholder" aria-hidden /> : null}
        <figcaption className="coffee-polaroid-caption">{caption}</figcaption>
      </figure>
    </div>
  );
}

export function ArcReactorDetailPanel() {
  return (
    <div className="arc-hud-anchors arc-hud-anchors--media-below-back" aria-label="Arc reactor project details">
      <div className="arc-reactor-media-col">
        <div className="arc-youtube-shell">
          <iframe
            className="arc-youtube-iframe"
            src={ARC_REACTOR_VIDEO_EMBED}
            title="Alex Lab — water electrolysis Iron Man reactor (reference)"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>

      <div className="arc-polaroid-row">
        <ArcPolaroidCoffee src={POLAROID_HHO_SRC} caption="My 48 plate HHO Generator" />
        <ArcPolaroidCoffee src={POLAROID_ENGINE_SRC} caption="My small Helicopter Combustion Engine" />
      </div>

      <aside className="arc-reactor-side-panel arc-glass-panel" data-scroll-root>
        <h2 className="arc-side-panel-title">{ARC_REACTOR_SIDE_TITLE}</h2>
        <div className="arc-side-panel-body">
          {ARC_REACTOR_SIDE_PARAS.map((p, i) => (
            <p key={i} className="arc-side-para">
              {p}
            </p>
          ))}
        </div>
      </aside>

      <aside className="arc-reactor-main-panel arc-glass-panel" data-scroll-root>
        <h2 className="arc-main-title">{ARC_REACTOR_MAIN_TITLE}</h2>
        <p className="arc-main-body">{ARC_REACTOR_MAIN_BODY}</p>
      </aside>
    </div>
  );
}
