export const PLATE_NO_MAIN_TITLE = 'BCC STI Internship';

export const PLATE_NO_MAIN_BODY =
  'I had a year-long internship for my gap year after graduation, as I wanted to get some hands-on work experience but also travel a little bit. The company is an organisation that creates monthly events for more than 10,000 people per event. I was in charge of handling the storage of elements needed for the event, like decorations, props, mini infrastructures, and so on.';

const ATTRS_TITLE = 'Attributes:';

export const PLATE_NO_ATTRS_LINES: readonly string[] = [
  'Location: Moss, Norway',
  'Duration: July, 2024 - August, 2025',
  'What I did:',
];

export const PLATE_NO_WHAT_DID: readonly string[] = [
  'Managed a team of employees on storage managing, event rigging, and tear downs.',
  'Implemented AI storage sorting system to help retrieve items quicker.',
];

export function PlateNoDetailPanel() {
  return (
    <div className="no-plate-hud-anchors" aria-label="Norway plate — BCC STI internship">
      <aside className="no-plate-panel no-plate-panel--main" data-scroll-root>
        <h2 className="no-plate-title">{PLATE_NO_MAIN_TITLE}</h2>
        <p className="no-plate-body">{PLATE_NO_MAIN_BODY}</p>
      </aside>

      <aside className="no-plate-panel no-plate-panel--attrs">
        <h3 className="no-plate-attrs-heading">{ATTRS_TITLE}</h3>
        <p className="no-plate-body no-plate-body--attrs-intro">
          {PLATE_NO_ATTRS_LINES[0]}
          <br />
          {PLATE_NO_ATTRS_LINES[1]}
        </p>
        <p className="no-plate-what-label">{PLATE_NO_ATTRS_LINES[2]}</p>
        <ul className="no-plate-what-list">
          {PLATE_NO_WHAT_DID.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
