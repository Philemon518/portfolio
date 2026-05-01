const LPC_TITLE = 'Li Po Chun United World College';

const LPC_INTRO =
  'This was my 2 year UWC boarding high school in Hong Kong with 94 nationalities, but also where I met some of the most passionate people about positive change ever.';

const LPC_META = [
  'Duration: August, 2022 - May, 2024',
  'Diploma: International Baccalaureate Diploma Programme',
  'Coursework: Physics HL, Chemistry HL, Economics HL, Mathematics Analysis and Approach SL, English Language and Literature SL, and French Ab Initio SL',
  'Honours: UWC Scholarship',
  'GPA: 3.300/4.000',
] as const;

const HKUST_TITLE = 'Hong Kong University of Science and Technology';

const HKUST_INTRO =
  'A closed list summer program for high school students to have a hands on course on qubits, quantum computing, and the physics behind it all.';

const HKUST_META = [
  'Program Duration: July, 2023 - August, 2023',
  'Certification: Quantum Technology Summer Programme.',
] as const;

export function PlateHkDetailPanel() {
  return (
    <div className="hk-plate-hud-anchors" aria-label="Hong Kong plate — education">
      <aside className="hk-plate-panel hk-plate-panel--lpc" data-scroll-root>
        <h2 className="hk-plate-title">{LPC_TITLE}</h2>
        <p className="hk-plate-body">{LPC_INTRO}</p>
        <ul className="hk-plate-meta">
          {LPC_META.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>

      <aside className="hk-plate-panel hk-plate-panel--hkust">
        <h2 className="hk-plate-title">{HKUST_TITLE}</h2>
        <p className="hk-plate-body">{HKUST_INTRO}</p>
        <ul className="hk-plate-meta hk-plate-meta--compact">
          {HKUST_META.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
