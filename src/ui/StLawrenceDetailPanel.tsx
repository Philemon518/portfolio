/** Campus aerial: `public/posters/slu-campus-polaroid.png` */
const CAMPUS_POLAROID_SRC = '/posters/slu-campus-polaroid.png';

const RESUME_DEGREE_TITLE = 'Bachelor of Science in Physics and Computer Science';

const RESUME_LINES = [
  'St. Lawrence University, Canton, NY',
  'Graduation date: May 2029',
  'Relevant coursework: University Physics, Modern Physics, Calculus 1, 2, 3, CS Intro courses',
  "Honours: UWC Scholarship, Partaking 3-2 Engineering Program at the University",
] as const;

/** Top row: campus polaroid + resume share one top (bachelor line); intro bottom-left. */
export function StLawrenceDetailPanel() {
  return (
    <div className="slu-hud-anchors" aria-label="St. Lawrence details">
      <div className="slu-top-row">
        <div className="slu-polaroid-wrap">
          <figure className="slu-polaroid">
            <img src={CAMPUS_POLAROID_SRC} alt="St. Lawrence University campus" />
            <figcaption className="slu-polaroid-caption">Canton, NY</figcaption>
          </figure>
        </div>

        <div className="slu-panel slu-panel--resume" data-scroll-root>
          <div className="slu-resume-heading">
            <img className="slu-resume-logo" src="/posters/st-lawrence.png" alt="" />
            <span className="slu-resume-degree">{RESUME_DEGREE_TITLE}</span>
          </div>
          <ul className="slu-resume-list">
            {RESUME_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="slu-panel slu-panel--intro">
        <h2 className="slu-brand-title">St. Lawrence University</h2>
        <p className="slu-intro-body">
          This is where I am currently studying to get my Bachelors Degree.
        </p>
      </div>
    </div>
  );
}
