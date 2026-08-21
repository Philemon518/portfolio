export const PLATE_HK_LPC_TITLE = 'Li Po Chun United World College';

export const PLATE_HK_LPC_INTRO =
  'This was my 2 year UWC boarding high school in Hong Kong with 94 nationalities, but also where I met some of the most passionate people about positive change ever.';

export const PLATE_HK_LPC_META = [
  'Duration: August, 2022 - May, 2024',
  'Diploma: International Baccalaureate Diploma Programme',
  'Coursework: Physics HL, Chemistry HL, Economics HL, Mathematics Analysis and Approach SL, English Language and Literature SL, and French Ab Initio SL',
  'Honours: UWC Scholarship',
  'GPA: 3.300/4.000',
] as const;

export const PLATE_HK_HKUST_TITLE = 'Hong Kong University of Science and Technology';

export const PLATE_HK_HKUST_INTRO =
  'A closed list summer program for high school students to have a hands on course on qubits, quantum computing, and the physics behind it all.';

export const PLATE_HK_HKUST_META = [
  'Program Duration: July, 2023 - August, 2023',
  'Certification: Quantum Technology Summer Programme.',
] as const;

export function PlateHkDetailPanel() {
  return (
    <div className="hk-plate-hud-anchors" aria-label="Hong Kong plate — education">
      <aside className="hk-plate-panel hk-plate-panel--lpc" data-scroll-root>
        <h2 className="hk-plate-title">{PLATE_HK_LPC_TITLE}</h2>
        <p className="hk-plate-body">{PLATE_HK_LPC_INTRO}</p>
        <ul className="hk-plate-meta">
          {PLATE_HK_LPC_META.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>

      <aside className="hk-plate-panel hk-plate-panel--hkust">
        <h2 className="hk-plate-title">{PLATE_HK_HKUST_TITLE}</h2>
        <p className="hk-plate-body">{PLATE_HK_HKUST_INTRO}</p>
        <ul className="hk-plate-meta hk-plate-meta--compact">
          {PLATE_HK_HKUST_META.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
