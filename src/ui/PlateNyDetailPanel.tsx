const MAIN_BODY =
  "In my spring semester of freshman year I worked as my math teacher's assistant to help build 3D models, so that the class could see mathematical functions in real life. We used Bambu Lab printers and Blender for the process.";

const ATTRS_TITLE = 'Attributes:';

const ATTRS_LINES: readonly [string, string, string] = [
  'Location: Canton, New York',
  'Duration: February, 2026 – Present',
  'What I did:',
];

const WHAT_DID: readonly string[] = [
  'Designed and printed 3D models for Calculus 3 Math classes.',
  'Handled 3D printers, 3D printing software, and 3D modelling software.',
];

export function PlateNyDetailPanel() {
  return (
    <div className="no-plate-hud-anchors" aria-label="New York license plate — Calc 3 teaching assistant">
      <aside className="no-plate-panel no-plate-panel--main" data-scroll-root>
        <h2 className="no-plate-title">
          Calculus 3 Math Teacher Assistant
          <br />
          at St. Lawrence University
        </h2>
        <p className="no-plate-body">{MAIN_BODY}</p>
      </aside>

      <aside className="no-plate-panel no-plate-panel--attrs">
        <h3 className="no-plate-attrs-heading">{ATTRS_TITLE}</h3>
        <p className="no-plate-body no-plate-body--attrs-intro">
          {ATTRS_LINES[0]}
          <br />
          {ATTRS_LINES[1]}
        </p>
        <p className="no-plate-what-label">{ATTRS_LINES[2]}</p>
        <ul className="no-plate-what-list">
          {WHAT_DID.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
