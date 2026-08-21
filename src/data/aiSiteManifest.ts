import { portfolioItems } from './portfolioItems';
import {
  ARC_REACTOR_MAIN_BODY,
  ARC_REACTOR_MAIN_TITLE,
  ARC_REACTOR_SIDE_PARAS,
  ARC_REACTOR_SIDE_TITLE,
} from '../ui/ArcReactorDetailPanel';
import { COFFEE_STATS_LINES } from '../ui/CoffeeHlDetailPanel';
import {
  FUSION_LAMP_MAIN_BODY,
  FUSION_LAMP_MAIN_TITLE,
  FUSION_LAMP_SIDE_PARAS,
  FUSION_LAMP_SIDE_TITLE,
} from '../ui/FusionLampDetailPanel';
import { WHOAMI_BODY, WHOAMI_TITLE } from '../ui/JuggernogDetailPanel';
import {
  PLATE_HK_HKUST_INTRO,
  PLATE_HK_HKUST_META,
  PLATE_HK_HKUST_TITLE,
  PLATE_HK_LPC_INTRO,
  PLATE_HK_LPC_META,
  PLATE_HK_LPC_TITLE,
} from '../ui/PlateHkDetailPanel';
import {
  PLATE_NO_ATTRS_LINES,
  PLATE_NO_MAIN_BODY,
  PLATE_NO_MAIN_TITLE,
  PLATE_NO_WHAT_DID,
} from '../ui/PlateNoDetailPanel';
import {
  PLATE_NY_ATTRS_LINES,
  PLATE_NY_MAIN_BODY,
  PLATE_NY_WHAT_DID,
} from '../ui/PlateNyDetailPanel';
import {
  SLU_INTRO_BODY,
  SLU_INTRO_TITLE,
  SLU_RESUME_DEGREE_TITLE,
  SLU_RESUME_LINES,
} from '../ui/StLawrenceDetailPanel';
import { JIMBO_README_MD_TEXT, ROYA_LINK_README_MD_TEXT } from './laptopReadmeTexts';

export interface AiManifestItem {
  id: string;
  sceneLabel: string;
  title: string;
  eyebrow?: string;
  location?: string;
  description: string;
  details?: string[];
  sections?: Record<string, string | readonly string[]>;
}

export interface AiSiteManifest {
  siteOverview: {
    purpose: string;
    interactionModel: string;
    author: string;
    contact: {
      email: string;
      phone: string;
      linkedin: string;
      github: string;
      website: string;
    };
    resumePdf: string;
    howToReadThisFile: string;
  };
  items: AiManifestItem[];
}

export const AI_SITE_MANIFEST: AiSiteManifest = {
  siteOverview: {
    purpose:
      'This is philemonmulunda.com — an interactive 3D garage portfolio for Philemon Weiming Mulunda. The visual site is a React + Three.js scene where each object represents a project, experience, or personal story. Humans explore by hovering and clicking 3D objects; this manifest exposes the same content as plain text for AI agents that cannot reliably parse WebGL.',
    interactionModel:
      'On load, choose Fun Way (explore the 3D garage with mouse or optional MediaPipe hand control) or Boring Way (open the resume PDF). Hover an object to outline it; click to focus the camera and open a detail panel. Press Esc or click empty space to return. The MacBook opens nested laptop folders (JimBo, Roya Link) with README files and live demos.',
    author: 'Philemon Weiming Mulunda',
    contact: {
      email: 'pwmulu25@stlawu.edu',
      phone: '+1 315-261-9338',
      linkedin: 'https://linkedin.com/in/philemonmulunda',
      github: 'https://github.com/Philemon518',
      website: 'https://philemonmulunda.com',
    },
    resumePdf: '/phil-resume.pdf',
    howToReadThisFile:
      'Machine-readable copy of all portfolio content. Also injected into the built HTML as #portfolio-ai-manifest and logged to the browser console as [portfolio-ai-manifest].',
  },
  items: [
    {
      id: portfolioItems.crv.id,
      sceneLabel: portfolioItems.crv.shortLabel,
      title: portfolioItems.crv.name,
      description: portfolioItems.crv.description,
    },
    {
      id: portfolioItems.juggernog.id,
      sceneLabel: portfolioItems.juggernog.shortLabel,
      title: portfolioItems.juggernog.name,
      description: portfolioItems.juggernog.description,
      sections: {
        [WHOAMI_TITLE]: WHOAMI_BODY,
      },
    },
    {
      id: portfolioItems.stlawrence.id,
      sceneLabel: portfolioItems.stlawrence.shortLabel,
      title: portfolioItems.stlawrence.name,
      eyebrow: portfolioItems.stlawrence.eyebrow,
      location: portfolioItems.stlawrence.location,
      description: portfolioItems.stlawrence.description,
      details: [...portfolioItems.stlawrence.details],
      sections: {
        [SLU_INTRO_TITLE]: SLU_INTRO_BODY,
        degree: SLU_RESUME_DEGREE_TITLE,
        resumeLines: SLU_RESUME_LINES,
      },
    },
    {
      id: portfolioItems.laptop.id,
      sceneLabel: portfolioItems.laptop.shortLabel,
      title: portfolioItems.laptop.name,
      description: portfolioItems.laptop.description,
      sections: {
        JimBo_README: JIMBO_README_MD_TEXT,
        RoyaLink_README: ROYA_LINK_README_MD_TEXT,
      },
    },
    {
      id: portfolioItems.projects.id,
      sceneLabel: portfolioItems.projects.shortLabel,
      title: portfolioItems.projects.name,
      description: portfolioItems.projects.description,
      sections: {
        [ARC_REACTOR_MAIN_TITLE]: [ARC_REACTOR_MAIN_BODY, ARC_REACTOR_SIDE_TITLE, ...ARC_REACTOR_SIDE_PARAS],
        [FUSION_LAMP_MAIN_TITLE]: [FUSION_LAMP_MAIN_BODY, FUSION_LAMP_SIDE_TITLE, ...FUSION_LAMP_SIDE_PARAS],
      },
    },
    {
      id: portfolioItems.coffee.id,
      sceneLabel: portfolioItems.coffee.shortLabel,
      title: portfolioItems.coffee.name,
      description: portfolioItems.coffee.description,
      sections: {
        attributes: COFFEE_STATS_LINES,
      },
    },
    {
      id: portfolioItems['plate-ny'].id,
      sceneLabel: portfolioItems['plate-ny'].shortLabel,
      title: portfolioItems['plate-ny'].name,
      eyebrow: portfolioItems['plate-ny'].eyebrow,
      location: portfolioItems['plate-ny'].location,
      description: portfolioItems['plate-ny'].description,
      details: [...portfolioItems['plate-ny'].details],
      sections: {
        body: PLATE_NY_MAIN_BODY,
        attributes: PLATE_NY_ATTRS_LINES,
        whatIDid: PLATE_NY_WHAT_DID,
      },
    },
    {
      id: portfolioItems['plate-no'].id,
      sceneLabel: portfolioItems['plate-no'].shortLabel,
      title: portfolioItems['plate-no'].name,
      description: portfolioItems['plate-no'].description,
      sections: {
        title: PLATE_NO_MAIN_TITLE,
        body: PLATE_NO_MAIN_BODY,
        attributes: PLATE_NO_ATTRS_LINES,
        whatIDid: PLATE_NO_WHAT_DID,
      },
    },
    {
      id: portfolioItems['plate-hk'].id,
      sceneLabel: portfolioItems['plate-hk'].shortLabel,
      title: portfolioItems['plate-hk'].name,
      description: portfolioItems['plate-hk'].description,
      sections: {
        [PLATE_HK_LPC_TITLE]: [PLATE_HK_LPC_INTRO, ...PLATE_HK_LPC_META],
        [PLATE_HK_HKUST_TITLE]: [PLATE_HK_HKUST_INTRO, ...PLATE_HK_HKUST_META],
      },
    },
  ],
};
