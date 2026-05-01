import { portfolioItems } from '../data/portfolioItems';

const WHOAMI_TITLE = 'Who am I?';

const WHOAMI_BODY = `My name is Philemon Weiming Mulunda. My father is Zambian, and my mom is from Shanghai, but I was born and raised in Hong Kong. I had to learn multiple languages just to communicate with my family and I guess that didn't stop. I now speak English and Cantonese fluently, Mandarin and Norwegian at an advanced level, and amateur French and German. Being complex from birth made me like complex things. Physics, math, chemistry, computer algorithms, genetic mutations, anything that was hard. The itch to learn more and do more is just who I am.

That all led to me being a double major in physics and computer science at university and a UWC scholar who builds technology with intention. I focus on difficult problems, especially those where engineering, sustainability, and quality of life intersect. At the core, I'm motivated by the belief that innovation should increase human capability, and not just efficiency.

I build to expand access, to reduce unnecessary friction, and to make complex systems more usable and empowering. Whether working in software or hardware, I approach problems from first principles and engineer solutions across disciplines when that's what the problem demands.`;

const juggernog = portfolioItems.juggernog;

/** Poster story (left) + Who am I? (right). */
export function JuggernogDetailPanel() {
  return (
    <div className="jug-hud-anchors" aria-label="Juggernog poster details">
      <aside className="jug-poster-panel" data-scroll-root>
        <h2 className="jug-poster-title">{juggernog.name}</h2>
        <p className="jug-poster-body">{juggernog.description}</p>
      </aside>
      <aside className="jug-whoami-panel">
        <h2 className="jug-whoami-title">{WHOAMI_TITLE}</h2>
        <p className="jug-whoami-body">{WHOAMI_BODY}</p>
      </aside>
    </div>
  );
}
