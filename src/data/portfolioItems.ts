export type ItemId =
  | 'crv'
  | 'juggernog'
  | 'stlawrence'
  | 'laptop'
  | 'projects'
  | 'coffee'
  | 'plate-ny'
  | 'plate-no'
  | 'plate-hk';

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface PortfolioItem {
  id: ItemId;
  shortLabel: string;
  name: string;
  eyebrow: string;
  location: string;
  description: string;
  details: string[];
  focusNote?: string;
  camera: CameraPreset;
}

export const defaultCamera: CameraPreset = {
  position: [-7.01, 3.6, 18.3],
  target: [-3.09, 2.25, 9.19],
  fov: 32,
};

export const portfolioItems: Record<ItemId, PortfolioItem> = {
  crv: {
    id: 'crv',
    shortLabel: '2000 CR-V',
    name: 'Self-Mechanic Project',
    eyebrow: '',
    location: '',
    description:
      'I bought a 2000 First-Generation Honda CR-V as an engineering project. I love cars and engineering, so this went hand in hand. I am reworking the suspension kit, sound system, and damage repair from the past decades and past owners. After that, if I have enough time, I plan to implement my own navigation assistant called Sylvia into the head unit.',
    details: [],
    camera: {
      position: [-5.15, 2.65, 4.35],
      target: [-1.55, 1.36, 0.2],
      fov: 28,
    },
  },
  juggernog: {
    id: 'juggernog',
    shortLabel: 'Juggernog',
    name: 'Call of Duty Zombies: Juggernog Poster',
    eyebrow: '',
    location: '',
    description:
      'Call of Duty Zombies was my favourite video game and game mode growing up. The impossible easter eggs, the challenge of staying alive, multitasking, and the complex story line of it all made it very special. Might not be portfolio related, but sure does add personality.',
    details: [],
    camera: {
      position: [-3.45, 2.95, -1.15],
      target: [-6.15, 2.55, -6.92],
      fov: 24,
    },
  },
  stlawrence: {
    id: 'stlawrence',
    shortLabel: 'St. Lawrence',
    name: 'St. Lawrence Poster',
    eyebrow: 'Personal history',
    location: 'Front right wall',
    description:
      'The St. Lawrence poster gives the garage a sense of biography. It tells visitors that this portfolio is not just a grid of projects, but a room built from places, communities, and identity.',
    details: ['Personal grounding', 'School connection', 'Memory and context'],
    camera: {
      position: [2.85, 3.08, 2.62],
      target: [8.55, 2.62, 2.15],
      fov: 33,
    },
  },
  laptop: {
    id: 'laptop',
    shortLabel: 'MacBook Air',
    name: "Phil's MacBook",
    eyebrow: '',
    location: '',
    description: 'Here is a limited access to softwares made by Phil.',
    details: [],
    camera: {
      position: [0.93, 1.84, 10.99],
      target: [0.86, 1.43, 8.32],
      fov: 19,
    },
  },
  projects: {
    id: 'projects',
    shortLabel: 'Project Box',
    name: "Phil's Engineering Projects",
    eyebrow: '',
    location: '',
    description:
      'These are some of the funniest and most interesting projects I have made.',
    details: [],
    camera: {
      position: [3.15, 4.15, 7.78],
      target: [3.15, 0.9, 7.78],
      fov: 26,
    },
  },
  coffee: {
    id: 'coffee',
    shortLabel: 'Coffee HL',
    name: 'Coffee HL NGO',
    eyebrow: '',
    location: '',
    description:
      "When the Middle Eastern war escalated, I was in high school. We mourned the dead, but to me that didn't feel enough. Me and two other classmates decided to take matters into our own hands and contribute. We started a coffee shop in our school. We called it Coffee HL. Everything was self-run. All profits made were used to increase quality or donate towards charity. It was our first attempt at creating, sustaining, and scaling a business. We started with a moka pot and scaled to our own coffee machine with milk frother. We increased our choice of drinks from 3 to 8. We later consulted with an alum from a global coffee franchise for help — a spark to the start-up life.",
    details: [],
    camera: {
      position: [-0.2, 2.7, -2.25],
      target: [-4.28, 1.46, -6.02],
      fov: 33,
    },
  },
  'plate-ny': {
    id: 'plate-ny',
    shortLabel: 'NY Plate',
    name: 'Calculus 3 Math TA, St. Lawrence',
    eyebrow: 'Teaching assistant',
    location: 'Overhead beam',
    description:
      'Calc 3 math teaching assistant at St. Lawrence: 3D models for the classroom with Bambu Lab and Blender.',
    details: ['3D printing for teaching', 'Calculus support', 'Blender + Bambu'],
    camera: {
      position: [1.85, 4.95, 2.55],
      target: [1.7, 4.72, -0.78],
      fov: 21,
    },
  },
  'plate-no': {
    id: 'plate-no',
    shortLabel: 'Norway Plate',
    name: 'Norway License Plate',
    eyebrow: '',
    location: '',
    description:
      'BCC STI gap-year internship in Moss, Norway — full story in the panels when this plate is selected.',
    details: [],
    camera: {
      position: [4.6, 4.95, 2.55],
      target: [4.35, 4.7, -0.78],
      fov: 21,
    },
  },
  'plate-hk': {
    id: 'plate-hk',
    shortLabel: 'HK Plate',
    name: 'Hong Kong License Plate',
    eyebrow: '',
    location: '',
    description:
      'Li Po Chun United World College and a HKUST quantum summer programme — details in the panels when this plate is selected.',
    details: [],
    camera: {
      position: [7.15, 4.85, 2.45],
      target: [6.7, 4.56, -0.78],
      fov: 21,
    },
  },
};

export const itemOrder: ItemId[] = [
  'crv',
  'juggernog',
  'stlawrence',
  'laptop',
  'projects',
  'coffee',
  'plate-ny',
  'plate-no',
  'plate-hk',
];
