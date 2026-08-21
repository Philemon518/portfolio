/** Reference build — opens at 12:47, muted; captions via embed params. */
const FUSION_LAMP_VIDEO_EMBED =
  'https://www.youtube-nocookie.com/embed/VTBZ0VwIgs8?start=767&mute=1&autoplay=1&cc_load_policy=1&playsinline=1&rel=0&modestbranding=1';

export const FUSION_LAMP_MAIN_TITLE = 'DIY Nuclear Fusion Lamp';

export const FUSION_LAMP_MAIN_BODY =
  'I built a Nuclear Fusion Lamp during my gap year since I just learnt quantum mechanics and nuclear fusion in high school and thought it was really cool.';

export const FUSION_LAMP_SIDE_TITLE = 'What is it?';

export const FUSION_LAMP_SIDE_PARAS = [
  'This object is a Tokamak Nuclear Fusion Reactor. It is not actually the fusion lamp. One of my last topics in High School physics and chemistry was quantum mechanics and Nuclear reactions. This lead to me learning the real world inspiration of the Iron Man Arc Reactor: Nuclear Fusion. I thought it was so cool and believed it is the solution to so many problems on earth.',
  'In my gap year, I wanted to have a hands on experience since I liked it so much, so I searched up miniature Nuclear fusion plants that might be doable. Luckily, it is nuclear fission that would get me arrested, but Fusion was all good. I watched a YouTube video on this guy build a nuclear fusion lamp with simple logic, so I did the same.',
  "The Reactor was an inertial electrostatic confinement that used capacitors to convert power to high voltages. In Tokomaks, gas is accelerated extremely fast with magnets to conduct fusion. I don't have a billion dollar budget, so I used capacitors. The high voltage accelerates the particles to collide with eachother in the middle of the confinement to conduct fusion, which gives off light, hence a fusion lamp. This also required a vaccum to prevent atoms from getting in the way of the accelerated particle's trajectory to the middle. However, it only worked for a few seconds, so there's that. Maybe future research?",
] as const;

export function FusionLampDetailPanel() {
  return (
    <div className="arc-hud-anchors arc-hud-anchors--media-below-back" aria-label="DIY nuclear fusion lamp project details">
      <div className="arc-reactor-media-col">
        <div className="arc-youtube-shell">
          <iframe
            className="arc-youtube-iframe"
            src={FUSION_LAMP_VIDEO_EMBED}
            title="Nuclear fusion lamp build — reference video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>

      <aside className="arc-reactor-main-panel arc-glass-panel" data-scroll-root>
        <h2 className="arc-main-title">{FUSION_LAMP_MAIN_TITLE}</h2>
        <p className="arc-main-body">{FUSION_LAMP_MAIN_BODY}</p>
      </aside>

      <aside
        className="arc-reactor-side-panel arc-reactor-side-panel--fusion arc-glass-panel"
        data-scroll-root
      >
        <h2 className="arc-side-panel-title">{FUSION_LAMP_SIDE_TITLE}</h2>
        <div className="arc-side-panel-body">
          {FUSION_LAMP_SIDE_PARAS.map((p, i) => (
            <p key={i} className="arc-side-para">
              {p}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}
