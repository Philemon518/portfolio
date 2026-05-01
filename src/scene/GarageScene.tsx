import {
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContactShadows, PerspectiveCamera, useCursor, useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Outline, Selection, Select } from '@react-three/postprocessing';
import * as THREE from 'three';
import { defaultCamera, ItemId, portfolioItems } from '../data/portfolioItems';
import { JimBoDemoApp } from '../ui/JimBoDemoApp';
import { RoyaLinkDemoApp } from '../ui/RoyaLinkDemoApp';
import { GarageTextures, useGarageTextures } from './garageTextures';

type Triplet = [number, number, number];
type LaptopFolderId = 'JimBo' | 'Roya Link';

interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** In-finder press animation (folder icon, file row, or Back) before the view change. */
type LaptopFinderBounce =
  | { kind: 'folder'; id: LaptopFolderId; t: number }
  | { kind: 'back'; t: number }
  | { kind: 'file'; openFolder: LaptopFolderId; fileIndex: number; t: number };

/** RAF state driving `LaptopFinderBounce` for the active animation. */
type LaptopBounceRafState =
  | { startMs: number; kind: 'open'; targetFolder: LaptopFolderId }
  | { startMs: number; kind: 'back' }
  | { startMs: number; kind: 'file'; openFolder: LaptopFolderId; fileIndex: number };

const FINDER_BOUNCE_DURATION_SEC = 0.44;

function finderBounceScale(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  if (p === 0 || p === 1) {
    return 1;
  }
  const e0 = 0.34;
  const e1 = 0.68;
  const a = 0.88;
  const b = 1.05;
  if (p < e0) {
    return THREE.MathUtils.lerp(1, a, THREE.MathUtils.smootherstep(p, 0, e0));
  }
  if (p < e1) {
    return THREE.MathUtils.lerp(a, b, THREE.MathUtils.smootherstep(p, e0, e1));
  }
  return THREE.MathUtils.lerp(b, 1, THREE.MathUtils.smootherstep(p, e1, 1));
}

function withRectBounce(
  ctx: CanvasRenderingContext2D,
  rect: ScreenRect,
  scale: number,
  draw: () => void,
) {
  if (Math.abs(scale - 1) < 0.001) {
    draw();
    return;
  }
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
}

type LaptopFinderLogos = Partial<Record<LaptopFolderId, HTMLImageElement | HTMLCanvasElement>>;

/**
 * Opaque “black” background in a PNG (no alpha) is drawn on white as a dark box.
 * Turn almost-uniformly-dark pixels to white so the mark sits on a clean well.
 * Uses per-channel dark test; tune if orange edges are eaten.
 */
function whitenDarkBackgroundInPlace(source: HTMLImageElement, threshold = 32): HTMLCanvasElement {
  const w = source.naturalWidth;
  const h = source.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const c2d = c.getContext('2d', { willReadFrequently: true });
  if (!c2d) {
    return c;
  }
  c2d.drawImage(source, 0, 0);
  if (w === 0 || h === 0) {
    return c;
  }
  const id = c2d.getImageData(0, 0, w, h);
  const { data } = id;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (r < threshold && g < threshold && b < threshold) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  c2d.putImageData(id, 0, 0);
  return c;
}

function canvasImageSize(src: HTMLImageElement | HTMLCanvasElement): { w: number; h: number } {
  if (src instanceof HTMLImageElement) {
    return { w: src.naturalWidth, h: src.naturalHeight };
  }
  return { w: src.width, h: src.height };
}

/** Paints a bitmap in a box with "contain" scaling. `scaleMult` can enlarge the draw (use with ctx.clip to the well). */
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  src: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { scaleMult?: number },
) {
  const { w: sw, h: sh } = canvasImageSize(src);
  if (sw === 0 || sh === 0) {
    return;
  }
  const { scaleMult = 1 } = options ?? {};
  const s = Math.min(w / sw, h / sh) * scaleMult;
  const dw = sw * s;
  const dh = sh * s;
  ctx.drawImage(src, x + (w - dw) * 0.5, y + (h - dh) * 0.5, dw, dh);
}

interface LaptopFile {
  name: string;
  badge: string;
  /** Finder list “Kind” column (right). */
  kind: string;
  /** If set, row click opens this URL in a new tab (e.g. JimBo.web). */
  openUrl?: string;
  /** If set, row click opens the full-page in-site document reader (e.g. JimBo README). */
  openDocumentText?: string;
  /** Portfolio-only React overlay (in-laptop demos). */
  openDemoApp?: 'jimbo-demo' | 'roya-demo';
}

type LaptopTextDocument = { fileName: string; body: string };

/** Split body on blank lines; paragraphs starting with `## ` render as centered bold subheads (strip marker). */
function laptopDocumentRestBlocks(rest: string) {
  return rest
    .split(/\n\n+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((block, idx) => {
      if (block.startsWith('## ')) {
        return (
          <p key={idx} className="laptop-text-page-doc-h2">
            {block.slice(3).trim()}
          </p>
        );
      }
      return (
        <pre key={idx} className="laptop-text-page-rest">
          {block}
        </pre>
      );
    });
}

/**
 * macOS-style plain-text reader (HTML). Mounted to `document.body` via `createRoot` in `Laptop` — not a child
 * of the R3F tree, so the overlay can cover the app with padding to keep the site context visible.
 */
function LaptopTextDocumentPage({
  doc,
  folderName,
  onClose,
}: {
  doc: LaptopTextDocument;
  folderName: LaptopFolderId;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [onClose]);

  const firstNl = doc.body.indexOf('\n');
  const leadLine = (firstNl === -1 ? doc.body : doc.body.slice(0, firstNl)).trim();
  const rest = firstNl === -1 ? '' : doc.body.slice(firstNl + 1);

  return (
    <div
      className="laptop-text-page-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={doc.fileName}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <button type="button" className="back-button laptop-text-page-back-hud" onClick={() => onClose()}>
        Back
      </button>
      <div
        className="laptop-text-page-chrome"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="laptop-text-page-titlebar">
          <span className="laptop-text-page-titlebar-name">{doc.fileName}</span>
          <span className="laptop-text-page-breadcrumb">Portfolio / {folderName}</span>
        </header>
        <div className="laptop-text-page-body">
          {leadLine ? <p className="laptop-text-page-lead">{leadLine}</p> : null}
          {rest ? laptopDocumentRestBlocks(rest) : null}
        </div>
      </div>
    </div>
  );
}

interface GarageSceneProps {
  activeId: ItemId | null;
  cameraDebugEnabled: boolean;
  hoveredId: ItemId | null;
  onHoverChange: (id: ItemId | null) => void;
  onCameraPoseChange: (pose: CameraDebugPose) => void;
  onSelect: (id: ItemId) => void;
  /** When the engineering box is open, which interior model is highlighted (null = overview). */
  projectsModelFocus: 'arc' | 'fusion' | null;
  onProjectsModelSelect: (id: 'arc' | 'fusion' | null) => void;
  /** `Date.now()` deadline; while before this, all hoverable props flash outline (Hint button). */
  hintOutlineUntilMs: number | null;
}

interface CameraDebugPose {
  position: Triplet;
  target: Triplet;
  yaw: number;
  pitch: number;
}

interface InteractiveGroupProps {
  id: ItemId;
  hoveredId: ItemId | null;
  onHoverChange: (id: ItemId | null) => void;
  onSelect: (id: ItemId) => void;
  hoverEnabled?: boolean;
  hitbox?: {
    size: Triplet;
    position?: Triplet;
    rotation?: Triplet;
  };
  position?: Triplet;
  rotation?: Triplet;
  scale?: number | Triplet;
  children: ReactNode;
}

interface FittedGLTF {
  object: THREE.Object3D;
  position: Triplet;
  scale: number;
}

interface FittedGLTFOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  textureAnisotropy?: number;
}

const tempPosition = new THREE.Vector3();
const tempTarget = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempLookTarget = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
/** Scratch for engineering focus lights (camera-relative → lift-local). */
const projViewLightCam = new THREE.Vector3();
/** Tri-light rig above floating piece (world space scratch). */
const projFloatItemW = new THREE.Vector3();
const projFloatE1 = new THREE.Vector3();
const projFloatE2 = new THREE.Vector3();
const projFloatLightWorld = new THREE.Vector3();

/** World transform of the engineering `InteractiveGroup` (matches scene JSX). */
const projectsGroupEuler = new THREE.Euler(0, -0.08, 0);
const projectsGroupOrigin = new THREE.Vector3(3.15, 1.06, 7.78);

/** Box-local rest anchor for camera look-at (matches lift parent: interior Y + lift). Updated each frame in `ProjectInteriorModel`. */
const projectsPieceLiftLocalY = { arc: 0 as number, fusion: 0 as number };

const PROJECTS_PIECE_LOCAL_REST: Record<'arc' | 'fusion', THREE.Vector3> = {
  arc: new THREE.Vector3(-0.36, 0.34, 0),
  fusion: new THREE.Vector3(0.28, 0.32, 0.02),
};

function projectsPieceWorldTarget(piece: 'arc' | 'fusion', out: THREE.Vector3, liftLocalY = 0) {
  out.copy(PROJECTS_PIECE_LOCAL_REST[piece]);
  out.y += liftLocalY;
  out.applyEuler(projectsGroupEuler).add(projectsGroupOrigin);
}

/** Eye-level hero shot from the cardboard-label side (+local Z), looking into the box (avoids side flaps). */
function projectsPieceHorizontalCameraPreset(piece: 'arc' | 'fusion'): { position: Triplet; target: Triplet; fov: number } {
  const target = new THREE.Vector3();
  projectsPieceWorldTarget(piece, target, projectsPieceLiftLocalY[piece]);

  // Outward normal of the front label panel (box local +Z), in world space.
  tempDirection.set(0, 0, 1).applyEuler(projectsGroupEuler).normalize();
  tempRight.crossVectors(worldUp, tempDirection);
  if (tempRight.lengthSq() < 1e-8) {
    tempRight.set(1, 0, 0);
  } else {
    tempRight.normalize();
  }

  const dist = 2.24;
  const lateral = piece === 'arc' ? -0.34 : 0.34;
  const eye = 0.54;

  const position = target
    .clone()
    .addScaledVector(tempDirection, dist)
    .addScaledVector(tempRight, lateral)
    .addScaledVector(worldUp, eye);

  return {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
    fov: 24,
  };
}

const HOVER_OUTLINE_COLOR = 0xffffff;
const MODEL_OUTLINE_IDS: ItemId[] = ['coffee', 'crv', 'laptop'];
const LAPTOP_CANVAS_WIDTH = 1440;
const LAPTOP_CANVAS_HEIGHT = 900;
const LAPTOP_SCREEN_WIDTH = 0.272;
const LAPTOP_SCREEN_HEIGHT = 0.17;
const LAPTOP_SCREEN_CENTER_X = 0;
const LAPTOP_SCREEN_CENTER_Y = 0.121;
const LAPTOP_SCREEN_CENTER_Z = -0.1062;
const LAPTOP_HOTSPOT_Z = 0.00035;
const finderWindow = {
  x: 150,
  y: 110,
  width: 1040,
  height: 610,
  toolbarHeight: 64,
  sidebarWidth: 220,
};
/* Main “Portfolio” view: big folder tiles (outline + inner logo) — must match main-area drawing. */
const laptopFolderRects: Record<LaptopFolderId, ScreenRect> = {
  JimBo: { x: 400, y: 192, width: 300, height: 200 },
  'Roya Link': { x: 720, y: 192, width: 300, height: 200 },
};

function laptopFolderTitleFontCss(folderName: LaptopFolderId, sizePx: number, weight: number): string {
  if (folderName === 'JimBo') {
    return `${weight} ${String(sizePx)}px Fredoka, sans-serif`;
  }
  return `${weight} ${String(sizePx)}px Ubuntu, "Ubuntu", sans-serif`;
}

/* Sidebar: reserve vertical space for Back, then the rest of the list starts below (no overlap with FAVORITES). */
const SIDEBAR_BACK_TOP = 12;
const SIDEBAR_BACK_HEIGHT = 36;
const SIDEBAR_GAP_BELOW_BACK = 18;
function sidebarContentStartBaseline(): number {
  return (
    finderWindow.y + finderWindow.toolbarHeight + SIDEBAR_BACK_TOP + SIDEBAR_BACK_HEIGHT + SIDEBAR_GAP_BELOW_BACK
  );
}

/** Back control (sidebar, in its own row — not in the top toolbar). */
const laptopSidebarBackRect: ScreenRect = (() => {
  const t = finderWindow.y + finderWindow.toolbarHeight;
  return {
    x: finderWindow.x + 8,
    y: t + SIDEBAR_BACK_TOP,
    width: finderWindow.sidebarWidth - 16,
    height: SIDEBAR_BACK_HEIGHT,
  };
})();

function laptopSidebarRowRect(baselineY: number): ScreenRect {
  return {
    x: finderWindow.x + 2,
    y: baselineY - 22,
    width: finderWindow.sidebarWidth - 4,
    height: 32,
  };
}

/** Click targets for sidebar nav (must match `drawLaptopFinderTexture` sidebarY walk; see `sidebarContentStartBaseline`). */
function getLaptopSidebarNavRects() {
  const f0 = sidebarContentStartBaseline();
  return {
    recents: laptopSidebarRowRect(f0 + 28),
    applications: laptopSidebarRowRect(f0 + 28 + 34),
    desktop: laptopSidebarRowRect(f0 + 28 + 34 * 2),
    jimbo: laptopSidebarRowRect(f0 + 28 + 34 * 3 + 12 + 28),
    roya: laptopSidebarRowRect(f0 + 28 + 34 * 3 + 12 + 28 + 34),
  };
}
const JIMBO_README_MD_TEXT = `JimBo: AI Gym Tracker App | Founder and Full-Stack Developer | Started in 2025
- Built an AI-powered fitness app focused on helping first-time gym goers overcome intimidation and start training with confidence through personalized workout planning and beginner-friendly workout guidance.
- Designed a multi-stage planning system combining Chat GPT 4o, deterministic workout logic, and curated exercise selection to generate personalized plans while maintaining structure, consistency, and exercise safety.
- Implemented gamification systems including XP, streaks, weekly ranked leagues, leaderboard promotion/demotion, and progress rewards to improve engagement and retention.
- Developed smart workout logging for reps, weight, sets, rest timing, analytics, and projections with mathematics, enabling both beginners and experienced users to track meaningful progress over time.
- Built the app using Flutter for the frontend due to its smooth animations, FastAPI for the backend on Railway, Supabase for database/auth flows, Firebase Analytics for product insights, and OpenAI Chat GPT-4o for AI-powered onboarding and workout planning, but it is scalable by replacing with better models.`;

const ROYA_LINK_README_MD_TEXT = `Roya Link | Co-Founder and CTO | Started in June 2024
- Two other friends and I saw that the world was full of people who are brilliant, but lack the opportunity to shine, so we founded an organisation to increase education. We first focused on Afghanistan, as one of the co-founders originated there.
- The organisation created an educational website where we share free resources, an AI YouTube translator to prevent resource access due to a language barrier, and incubated and guided start-ups.
- I hosted a live Math course on the website. A course that teaches elementary math to pre-calculus.
- Outcomes: Gained 2000 users that use the website, aided a student into MIT, and incubated 4 Start-ups so far.

## Roya Link | CTO | Top 30 Nationals for Hult Prize | March, 2025

- We participated in a Start-up competition called the Hult Prize and ranked in the top 30 in the US.
- We built an AI YouTube audio Translator which translates any YouTube video's audio into a different language so everyone is able to access any YouTube resource without language barriers.
- The tech stack was: HTML, CSS, and JavaScript for the frontend Google extension. Fast API, Meta's Seamless V2 AI model, and Python for the backend that ran on Railway.
- Workflow required specific timing, automated audio editing, and precise AI integration.`;

const laptopFolders: Record<LaptopFolderId, { accent: string; files: LaptopFile[] }> = {
  JimBo: {
    accent: '#76a6ff',
    files: [
      {
        name: 'README.md',
        badge: 'MD',
        kind: 'Markdown',
        openDocumentText: JIMBO_README_MD_TEXT,
      },
      {
        name: 'JimBo_demo.exe',
        badge: 'DEMO',
        kind: 'Application',
        openDemoApp: 'jimbo-demo',
      },
      { name: 'JimBo.web', badge: 'WEB', kind: 'Web address', openUrl: 'https://jimboblog.fit' },
    ],
  },
  'Roya Link': {
    accent: '#79c89d',
    files: [
      {
        name: 'README.md',
        badge: 'MD',
        kind: 'Markdown',
        openDocumentText: ROYA_LINK_README_MD_TEXT,
      },
      {
        name: 'RoyaLink_demo.exe',
        badge: 'DEMO',
        kind: 'Application',
        openDemoApp: 'roya-demo',
      },
      {
        name: 'RoyaLink.web',
        badge: 'WEB',
        kind: 'Web address',
        openUrl:
          'https://www.roya-link.org/?utm_source=ig&utm_medium=social&utm_content=link_in_bio',
      },
    ],
  },
};

function getLaptopFileRowRect(openFolder: LaptopFolderId, fileIndex: number): ScreenRect {
  const mainX = finderWindow.x + finderWindow.sidebarWidth + 42;
  const mainY = finderWindow.y + finderWindow.toolbarHeight + 40;
  const tableY = mainY + 58;
  const rowY = tableY + 66 + fileIndex * 98;
  const contentWidth = finderWindow.width - finderWindow.sidebarWidth - 74;
  return { x: mainX, y: rowY, width: contentWidth, height: 84 };
}

function vectorToTriplet(vector: THREE.Vector3): Triplet {
  return [vector.x, vector.y, vector.z];
}

function directionToYawPitch(direction: THREE.Vector3) {
  const planarMagnitude = Math.sqrt(direction.x * direction.x + direction.z * direction.z);

  return {
    yaw: Math.atan2(direction.x, direction.z),
    pitch: Math.atan2(direction.y, Math.max(planarMagnitude, 0.0001)),
  };
}

function yawPitchToDirection(yaw: number, pitch: number, out = new THREE.Vector3()) {
  const cosPitch = Math.cos(pitch);

  return out.set(Math.sin(yaw) * cosPitch, Math.sin(pitch), Math.cos(yaw) * cosPitch).normalize();
}

function createCameraDebugPose(position: THREE.Vector3, target: THREE.Vector3): CameraDebugPose {
  const direction = tempDirection.copy(target).sub(position).normalize();
  const { yaw, pitch } = directionToYawPitch(direction);

  return {
    position: vectorToTriplet(position),
    target: vectorToTriplet(target),
    yaw,
    pitch,
  };
}

function useFittedGLTF(
  url: string,
  targetSize: Triplet,
  modelRotation: Triplet = [0, 0, 0],
  options: FittedGLTFOptions = {},
) {
  const gltf = useGLTF(url);

  return useMemo<FittedGLTF>(() => {
    const {
      castShadow = false,
      receiveShadow = false,
      textureAnisotropy = 8,
    } = options;
    const root = gltf.scene.clone(true);
    root.rotation.set(...modelRotation);
    root.updateMatrixWorld(true);

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
      child.matrixAutoUpdate = false;
      child.updateMatrix();

      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach((material) => {
        if (!material) {
          return;
        }

        if ('map' in material && material.map) {
          material.map.colorSpace = THREE.SRGBColorSpace;
          material.map.anisotropy = textureAnisotropy;
          material.map.needsUpdate = true;
        }

        material.needsUpdate = true;
      });
    });

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const safeSize = new THREE.Vector3(
      Math.max(size.x, 0.001),
      Math.max(size.y, 0.001),
      Math.max(size.z, 0.001),
    );
    const scale = Math.min(
      targetSize[0] / safeSize.x,
      targetSize[1] / safeSize.y,
      targetSize[2] / safeSize.z,
    );

    return {
      object: root,
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as Triplet,
    };
  }, [
    gltf,
    modelRotation[0],
    modelRotation[1],
    modelRotation[2],
    options.castShadow,
    options.receiveShadow,
    options.textureAnisotropy,
    targetSize[0],
    targetSize[1],
    targetSize[2],
  ]);
}

function screenRectToPlane(rect: ScreenRect) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return {
    position: [
      LAPTOP_SCREEN_CENTER_X + (centerX / LAPTOP_CANVAS_WIDTH - 0.5) * LAPTOP_SCREEN_WIDTH,
      LAPTOP_SCREEN_CENTER_Y + (0.5 - centerY / LAPTOP_CANVAS_HEIGHT) * LAPTOP_SCREEN_HEIGHT,
      LAPTOP_SCREEN_CENTER_Z + LAPTOP_HOTSPOT_Z,
    ] as Triplet,
    size: [
      (rect.width / LAPTOP_CANVAS_WIDTH) * LAPTOP_SCREEN_WIDTH,
      (rect.height / LAPTOP_CANVAS_HEIGHT) * LAPTOP_SCREEN_HEIGHT,
    ] as [number, number],
  };
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.stroke();
}

function drawLaptopFinderTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  openFolder: LaptopFolderId | null,
  bounce: LaptopFinderBounce | null = null,
  folderLogos: LaptopFinderLogos | null = null,
  textDocument: LaptopTextDocument | null = null,
) {
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = 'rgba(10, 14, 24, 0.36)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = 'rgba(242, 244, 248, 0.9)';
  fillRoundedRect(ctx, finderWindow.x, finderWindow.y, finderWindow.width, finderWindow.height, 28);
  ctx.restore();

  ctx.fillStyle = 'rgba(246, 247, 250, 0.95)';
  fillRoundedRect(ctx, finderWindow.x, finderWindow.y, finderWindow.width, finderWindow.height, 28);

  /* Clip: sidebar + main use fillRect; without clip they square off the window's bottom corners. */
  const fwR = 28;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(finderWindow.x, finderWindow.y, finderWindow.width, finderWindow.height, fwR);
  ctx.clip();

  ctx.fillStyle = 'rgba(236, 239, 244, 0.92)';
  fillRoundedRect(ctx, finderWindow.x, finderWindow.y, finderWindow.width, finderWindow.toolbarHeight, 28);
  ctx.fillRect(
    finderWindow.x,
    finderWindow.y + finderWindow.toolbarHeight - 28,
    finderWindow.width,
    28,
  );

  ctx.fillStyle = '#e7ebf0';
  ctx.fillRect(
    finderWindow.x,
    finderWindow.y + finderWindow.toolbarHeight,
    finderWindow.sidebarWidth,
    finderWindow.height - finderWindow.toolbarHeight,
  );

  ctx.fillStyle = '#fbfbfd';
  ctx.fillRect(
    finderWindow.x + finderWindow.sidebarWidth,
    finderWindow.y + finderWindow.toolbarHeight,
    finderWindow.width - finderWindow.sidebarWidth,
    finderWindow.height - finderWindow.toolbarHeight,
  );

  [
    { x: finderWindow.x + 26, color: '#ff5f57' },
    { x: finderWindow.x + 50, color: '#ffbd2f' },
    { x: finderWindow.x + 74, color: '#28c840' },
  ].forEach((light) => {
    ctx.fillStyle = light.color;
    ctx.beginPath();
    ctx.arc(light.x, finderWindow.y + 24, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffff';
  fillRoundedRect(ctx, finderWindow.x + finderWindow.width - 214, finderWindow.y + 16, 174, 30, 15);
  ctx.fillStyle = '#98a1ae';
  ctx.font = '500 14px "SF Pro Display", "Segoe UI", sans-serif';
  ctx.fillText('Search', finderWindow.x + finderWindow.width - 152, finderWindow.y + 35);

  ctx.fillStyle = '#505868';
  ctx.font = '700 18px "SF Pro Display", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const toolbarTitle = textDocument?.fileName ?? openFolder ?? 'Portfolio';
  ctx.fillText(toolbarTitle, finderWindow.x + finderWindow.width / 2, finderWindow.y + 33);
  ctx.textAlign = 'left';

  const backEnabled = Boolean(openFolder) || Boolean(textDocument);
  const backBounce = bounce?.kind === 'back' ? finderBounceScale(bounce.t) : 1;
  const b = laptopSidebarBackRect;
  withRectBounce(ctx, b, backBounce, () => {
    ctx.fillStyle = backEnabled ? '#dde6f4' : '#edf0f4';
    fillRoundedRect(ctx, b.x, b.y, b.width, b.height, 10);
    ctx.strokeStyle = backEnabled ? 'rgba(68, 97, 145, 0.18)' : 'rgba(124, 132, 144, 0.12)';
    ctx.lineWidth = 1.2;
    strokeRoundedRect(ctx, b.x, b.y, b.width, b.height, 10);
    const midY = b.y + b.height * 0.5;
    ctx.strokeStyle = backEnabled ? '#426aa7' : '#99a3b1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(b.x + 16, midY);
    ctx.lineTo(b.x + 26, midY - 6);
    ctx.moveTo(b.x + 16, midY);
    ctx.lineTo(b.x + 26, midY + 6);
    ctx.stroke();
    ctx.fillStyle = backEnabled ? '#33578f' : '#97a1ae';
    ctx.font = '600 15px "SF Pro Display", "Segoe UI", sans-serif';
    ctx.fillText('Back', b.x + 40, b.y + 24);
  });

  const sidebarX = finderWindow.x + 28;
  const f0 = sidebarContentStartBaseline();
  let sidebarY = f0;

  ctx.fillStyle = '#8f97a6';
  ctx.font = '700 12px "SF Pro Display", "Segoe UI", sans-serif';
  ctx.fillText('FAVORITES', sidebarX, sidebarY);
  sidebarY += 28;

  ['Recents', 'Applications', 'Desktop'].forEach((entry) => {
    ctx.fillStyle = '#5f6877';
    ctx.font = '500 17px "SF Pro Display", "Segoe UI", sans-serif';
    ctx.fillText(entry, sidebarX + 18, sidebarY);
    sidebarY += 34;
  });

  sidebarY += 12;
  ctx.fillStyle = '#8f97a6';
  ctx.font = '700 12px "SF Pro Display", "Segoe UI", sans-serif';
  ctx.fillText('PROJECTS', sidebarX, sidebarY);
  sidebarY += 28;

  (Object.keys(laptopFolders) as LaptopFolderId[]).forEach((folderName) => {
    const isActive = folderName === openFolder;
    if (isActive) {
      ctx.fillStyle = 'rgba(118, 166, 255, 0.18)';
      fillRoundedRect(ctx, sidebarX - 12, sidebarY - 20, 184, 28, 10);
    }
    ctx.fillStyle = isActive ? '#274f8e' : '#545d6c';
    ctx.font = isActive
      ? '700 17px "SF Pro Display", "Segoe UI", sans-serif'
      : '500 17px "SF Pro Display", "Segoe UI", sans-serif';
    ctx.fillText(folderName, sidebarX + 18, sidebarY);
    sidebarY += 34;
  });

  const mainX = finderWindow.x + finderWindow.sidebarWidth + 42;
  const mainY = finderWindow.y + finderWindow.toolbarHeight + 40;

  if (!openFolder) {
    (Object.entries(laptopFolderRects) as [LaptopFolderId, ScreenRect][]).forEach(([folderName, rect]) => {
      const isBouncingThis =
        bounce?.kind === 'folder' && bounce.id === folderName ? finderBounceScale(bounce.t) : 1;
      const img = folderLogos?.[folderName];

      withRectBounce(ctx, rect, isBouncingThis, () => {
        ctx.fillStyle = '#ffffff';
        fillRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 28);
        ctx.strokeStyle = 'rgba(92, 106, 128, 0.12)';
        ctx.lineWidth = 2;
        strokeRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 28);

        const padX = 18;
        const padT = 18;
        const logoBoxH = 120;
        const iX = rect.x + padX;
        const iY = rect.y + padT;
        const iW = rect.width - padX * 2;
        const iH = logoBoxH;
        ctx.fillStyle = '#ffffff';
        fillRoundedRect(ctx, iX, iY, iW, iH, 22);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(iX, iY, iW, iH, 22);
          ctx.clip();
          if (folderName === 'JimBo') {
            /* `source-over` on white so transparent areas of the PNG read white; do not use "screen" on a white well (washes the whole mark out). */
            const ins = 10;
            drawImageContain(ctx, img, iX + ins, iY + ins, iW - ins * 2, iH - ins * 2);
          } else {
            /* Roya: scale up; clip keeps it inside the rounded well. */
            drawImageContain(ctx, img, iX, iY, iW, iH, { scaleMult: 1.52 });
          }
          ctx.restore();
        }

        ctx.fillStyle = '#1e2633';
        ctx.font = laptopFolderTitleFontCss(folderName, 24, folderName === 'JimBo' ? 600 : 500);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(folderName, rect.x + rect.width * 0.5, iY + iH + 28);
        ctx.fillStyle = '#7a8493';
        ctx.font = '500 14px "SF Pro Display", "Segoe UI", sans-serif';
        ctx.fillText(`${laptopFolders[folderName].files.length} files`, rect.x + rect.width * 0.5, iY + iH + 50);
        ctx.textAlign = 'left';
      });
    });
  } else {
    const folderData = laptopFolders[openFolder];
    const contentWidth = finderWindow.width - finderWindow.sidebarWidth - 74;

    ctx.fillStyle = '#1f2633';
    ctx.font = laptopFolderTitleFontCss(openFolder, 30, openFolder === 'JimBo' ? 600 : 500);
    ctx.fillText(openFolder, mainX, mainY);
    ctx.fillStyle = '#7d8794';
    ctx.font = '500 17px "SF Pro Display", "Segoe UI", sans-serif';
    ctx.fillText(`Portfolio / ${openFolder}`, mainX, mainY + 34);

    const tableX = mainX;
    const tableY = mainY + 58;

    ctx.fillStyle = '#eff2f7';
    fillRoundedRect(ctx, tableX, tableY, contentWidth, 52, 18);
    ctx.fillStyle = '#697180';
    ctx.font = '600 14px "SF Pro Display", "Segoe UI", sans-serif';
    ctx.fillText('Name', tableX + 28, tableY + 36);
    ctx.fillText('Kind', tableX + 610, tableY + 36);

    folderData.files.forEach((file, index) => {
      const rowY = tableY + 66 + index * 98;
      const rowRect: ScreenRect = { x: tableX, y: rowY, width: contentWidth, height: 84 };
      const isBouncingThis =
        bounce?.kind === 'file' &&
        bounce.openFolder === openFolder &&
        bounce.fileIndex === index
          ? finderBounceScale(bounce.t)
          : 1;

      withRectBounce(ctx, rowRect, isBouncingThis, () => {
        ctx.fillStyle = '#ffffff';
        fillRoundedRect(ctx, tableX, rowY, contentWidth, 84, 18);
        ctx.strokeStyle = 'rgba(103, 113, 128, 0.08)';
        ctx.lineWidth = 1;
        strokeRoundedRect(ctx, tableX, rowY, contentWidth, 84, 18);

        ctx.fillStyle =
          file.badge === 'APP'
            ? '#cfdcff'
            : file.badge === 'WEB'
              ? '#d9f0e4'
              : file.badge === 'MD'
                ? '#ebe4f2'
                : file.badge === 'DEMO'
                  ? '#d4e8ff'
                  : '#edf1f6';
        fillRoundedRect(ctx, tableX + 24, rowY + 18, 70, 48, 14);
        ctx.fillStyle =
          file.badge === 'APP'
            ? '#4d69a3'
            : file.badge === 'WEB'
              ? '#45755e'
              : file.badge === 'MD'
                ? '#6b4f8a'
                : file.badge === 'DEMO'
                  ? '#1e4bb8'
                  : '#6f7887';
        ctx.font = '700 14px "SF Pro Display", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(file.badge, tableX + 24 + 35, rowY + 46);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#1f2633';
        ctx.font = '700 24px "SF Pro Display", "Segoe UI", sans-serif';
        ctx.fillText(file.name, tableX + 118, rowY + 38);
        ctx.fillStyle = '#6f7887';
        ctx.font = '500 16px "SF Pro Display", "Segoe UI", sans-serif';
        ctx.fillText(file.kind, tableX + 610, rowY + 38);
      });
    });
  }

  ctx.restore();
}

function InteractiveGroup({
  id,
  hoveredId,
  onHoverChange,
  onSelect,
  hoverEnabled = true,
  hitbox,
  position,
  rotation,
  scale,
  children,
}: InteractiveGroupProps) {
  const { invalidate } = useThree();

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(id);
    invalidate();
  };

  const handlePointerEnter = (event: ThreeEvent<PointerEvent>) => {
    if (!hoverEnabled) {
      return;
    }
    event.stopPropagation();
    onHoverChange(id);
    invalidate();
  };

  const handlePointerLeave = () => {
    if (!hoverEnabled) {
      return;
    }
    if (hoveredId === id) {
      onHoverChange(null);
      invalidate();
    }
  };

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      {...(!hitbox
        ? {
            onClick: handleClick,
            onPointerEnter: handlePointerEnter,
            onPointerLeave: handlePointerLeave,
          }
        : {})}
    >
      {hitbox ? (
        <mesh
          position={hitbox.position}
          rotation={hitbox.rotation}
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <boxGeometry args={hitbox.size} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      <group>{children}</group>
    </group>
  );
}

function CameraRig({
  activeId,
  projectsModelFocus,
  cameraDebugEnabled,
  onCameraPoseChange,
  onViewSettledChange,
}: {
  activeId: ItemId | null;
  projectsModelFocus: 'arc' | 'fusion' | null;
  cameraDebugEnabled: boolean;
  onCameraPoseChange: (pose: CameraDebugPose) => void;
  onViewSettledChange: (settled: boolean) => void;
}) {
  const { camera, invalidate } = useThree();
  const lookAt = useRef(new THREE.Vector3(...defaultCamera.target));
  const debugPosition = useRef(new THREE.Vector3(...defaultCamera.position));
  const debugYaw = useRef(0);
  const debugPitch = useRef(0);
  const keyState = useRef<Record<string, boolean>>({});
  const lastPoseKey = useRef('');
  const lastSettledState = useRef(true);

  const publishPose = (position: THREE.Vector3, target: THREE.Vector3, force = false) => {
    const pose = createCameraDebugPose(position, target);
    const poseKey = `${pose.position.join(',')}|${pose.target.join(',')}|${pose.yaw.toFixed(4)}|${pose.pitch.toFixed(4)}`;

    if (!force && poseKey === lastPoseKey.current) {
      return;
    }

    lastPoseKey.current = poseKey;
    onCameraPoseChange(pose);
  };

  useEffect(() => {
    tempPosition.set(...defaultCamera.position);
    tempTarget.set(...defaultCamera.target);
    publishPose(tempPosition, tempTarget, true);
  }, []);

  useEffect(() => {
    lastSettledState.current = false;
    onViewSettledChange(false);
  }, [activeId, projectsModelFocus, onViewSettledChange]);

  useEffect(() => {
    if (!cameraDebugEnabled || activeId) {
      return;
    }

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const currentTarget = lookAt.current.clone();
    const direction = currentTarget.sub(perspectiveCamera.position).normalize();
    const { yaw, pitch } = directionToYawPitch(direction);

    debugPosition.current.copy(perspectiveCamera.position);
    debugYaw.current = yaw;
    debugPitch.current = pitch;

    publishPose(debugPosition.current, lookAt.current, true);
    invalidate();
  }, [activeId, camera, cameraDebugEnabled, invalidate]);

  useEffect(() => {
    if (!cameraDebugEnabled || activeId) {
      return;
    }

    const relevantKeys = new Set([
      'w',
      'a',
      's',
      'd',
      'r',
      'f',
      'arrowleft',
      'arrowright',
      'arrowup',
      'arrowdown',
      'shift',
      '0',
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (!relevantKeys.has(key)) {
        return;
      }

      event.preventDefault();

      if (key === '0') {
        debugPosition.current.set(...defaultCamera.position);
        tempTarget.set(...defaultCamera.target);
        const { yaw, pitch } = directionToYawPitch(tempTarget.sub(debugPosition.current).normalize());
        debugYaw.current = yaw;
        debugPitch.current = pitch;
        publishPose(debugPosition.current, new THREE.Vector3(...defaultCamera.target), true);
        invalidate();
        return;
      }

      keyState.current[key] = true;
      invalidate();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (!relevantKeys.has(key)) {
        return;
      }

      event.preventDefault();
      keyState.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keyState.current = {};
    };
  }, [activeId, cameraDebugEnabled, invalidate]);

  useFrame((_, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;

    if (cameraDebugEnabled && !activeId) {
      const moveSpeed = keyState.current.shift ? 9.5 : 4.4;
      const turnSpeed = keyState.current.shift ? 1.75 : 1.05;
      let changed = false;

      if (keyState.current.arrowleft) {
        debugYaw.current -= turnSpeed * delta;
        changed = true;
      }

      if (keyState.current.arrowright) {
        debugYaw.current += turnSpeed * delta;
        changed = true;
      }

      if (keyState.current.arrowup) {
        debugPitch.current = Math.min(debugPitch.current + turnSpeed * delta, 1.32);
        changed = true;
      }

      if (keyState.current.arrowdown) {
        debugPitch.current = Math.max(debugPitch.current - turnSpeed * delta, -1.32);
        changed = true;
      }

      yawPitchToDirection(debugYaw.current, debugPitch.current, tempDirection);
      tempRight.crossVectors(worldUp, tempDirection).normalize();

      if (keyState.current.w) {
        debugPosition.current.addScaledVector(tempDirection, moveSpeed * delta);
        changed = true;
      }

      if (keyState.current.s) {
        debugPosition.current.addScaledVector(tempDirection, -moveSpeed * delta);
        changed = true;
      }

      if (keyState.current.a) {
        debugPosition.current.addScaledVector(tempRight, -moveSpeed * delta);
        changed = true;
      }

      if (keyState.current.d) {
        debugPosition.current.addScaledVector(tempRight, moveSpeed * delta);
        changed = true;
      }

      if (keyState.current.r) {
        debugPosition.current.y += moveSpeed * delta;
        changed = true;
      }

      if (keyState.current.f) {
        debugPosition.current.y -= moveSpeed * delta;
        changed = true;
      }

      tempLookTarget.copy(debugPosition.current).addScaledVector(tempDirection, 10);
      lookAt.current.copy(tempLookTarget);
      perspectiveCamera.position.copy(debugPosition.current);
      perspectiveCamera.lookAt(tempLookTarget);
      perspectiveCamera.fov = defaultCamera.fov;
      perspectiveCamera.updateProjectionMatrix();

      publishPose(debugPosition.current, tempLookTarget, changed);

      if (changed) {
        invalidate();
      }

      return;
    }

    const preset =
      activeId === 'projects' && projectsModelFocus
        ? projectsPieceHorizontalCameraPreset(projectsModelFocus)
        : activeId
          ? portfolioItems[activeId].camera
          : defaultCamera;

    tempPosition.set(...preset.position);
    tempTarget.set(...preset.target);

    const projectsPieceFocused = activeId === 'projects' && projectsModelFocus;
    const blend = 1 - Math.exp(-delta * (projectsPieceFocused ? 8.2 : 3.6));

    perspectiveCamera.position.lerp(tempPosition, blend);
    lookAt.current.lerp(tempTarget, blend);
    perspectiveCamera.lookAt(lookAt.current);
    perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, preset.fov, blend);
    perspectiveCamera.updateProjectionMatrix();

    const stillMoving =
      perspectiveCamera.position.distanceToSquared(tempPosition) > 0.0006 ||
      lookAt.current.distanceToSquared(tempTarget) > 0.0006 ||
      Math.abs(perspectiveCamera.fov - preset.fov) > 0.015;
    const settled = !stillMoving;

    if (settled !== lastSettledState.current) {
      lastSettledState.current = settled;
      onViewSettledChange(settled);
    }

    if (stillMoving) {
      invalidate();
    } else if (!cameraDebugEnabled && !activeId) {
      publishPose(tempPosition, tempTarget);
    }
  });

  return null;
}

function HangingBulb({ position }: { position: Triplet }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.48, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.56, 8]} />
        <meshStandardMaterial color="#151515" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.8, 0]} castShadow>
        <sphereGeometry args={[0.07, 18, 18]} />
        <meshStandardMaterial
          color="#ffdca8"
          emissive="#ffb85c"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, -0.8, 0]} intensity={13} distance={7.5} color="#ffca86" />
    </group>
  );
}

function GarageDoor({ position }: { position: Triplet }) {
  return (
    <group position={position}>
      {[-1.52, -0.76, 0, 0.76, 1.52].map((offset) => (
        <mesh key={`garage-door-panel-${offset}`} position={[0, offset, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.8, 0.7, 0.08]} />
          <meshStandardMaterial color="#9f9489" roughness={0.92} />
        </mesh>
      ))}
      {[-1.62, 1.62].map((offset) => (
        <mesh key={`garage-door-rail-${offset}`} position={[0, 0, offset]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[4.22, 0.08, 0.12]} />
          <meshStandardMaterial color="#6f675f" roughness={0.82} />
        </mesh>
      ))}
      {[0.55, 1.65, 2.75, 3.85].map((zOffset) => (
        <mesh key={`garage-door-window-${zOffset}`} position={[0.02, 1.58, zOffset - 2.2]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.74, 0.42, 0.05]} />
          <meshStandardMaterial color="#3d4656" roughness={0.34} metalness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function GarageShell({ textures }: { textures: GarageTextures }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 22]} />
        <meshStandardMaterial map={textures.floor} color="#6a584a" roughness={1} metalness={0.08} />
      </mesh>

      <mesh position={[0, 5.7, 0]} receiveShadow>
        <boxGeometry args={[24, 0.25, 22]} />
        <meshStandardMaterial color="#7a644f" roughness={0.8} />
      </mesh>

      <mesh position={[0, 2.8, -7.1]} receiveShadow>
        <boxGeometry args={[24, 5.6, 0.25]} />
        <meshStandardMaterial color="#d7d0c5" roughness={0.95} />
      </mesh>

      <mesh position={[-9.4, 2.8, 0]} receiveShadow>
        <boxGeometry args={[0.25, 5.6, 22]} />
        <meshStandardMaterial color="#cfc9c0" roughness={0.95} />
      </mesh>

      <mesh position={[9.4, 2.8, 0]} receiveShadow>
        <boxGeometry args={[0.25, 5.6, 22]} />
        <meshStandardMaterial color="#cbc4ba" roughness={0.95} />
      </mesh>

      <mesh position={[0, 2.02, -6.972]}>
        <planeGeometry args={[24.1, 0.32]} />
        <meshStandardMaterial color="#cb9d1f" roughness={0.85} />
      </mesh>
      <mesh position={[-9.272, 2.02, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[22, 0.32]} />
        <meshStandardMaterial color="#cb9d1f" roughness={0.85} />
      </mesh>
      <mesh position={[9.272, 2.02, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[22, 0.32]} />
        <meshStandardMaterial color="#cb9d1f" roughness={0.85} />
      </mesh>

      <mesh position={[0.12, 4.78, -1.18]} castShadow receiveShadow>
        <boxGeometry args={[19.05, 0.55, 0.75]} />
        <meshStandardMaterial color="#43281c" roughness={0.82} />
      </mesh>

      <mesh position={[0.4, 4.52, -3.45]}>
        <boxGeometry args={[5.1, 0.09, 0.26]} />
        <meshStandardMaterial color="#ecf0f6" emissive="#eef7ff" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <pointLight position={[0.4, 4.42, -3.45]} intensity={8.6} distance={14} color="#f6fbff" />
      <pointLight position={[1.05, 4.58, -1.38]} intensity={11.5} distance={15} color="#fff1d9" />
      <spotLight
        position={[0.9, 4.7, -1.52]}
        angle={0.9}
        penumbra={0.85}
        intensity={17}
        distance={18}
        decay={1.55}
        color="#ffe8c7"
      />

      <HangingBulb position={[4.7, 4.75, -1.9]} />
      <HangingBulb position={[7.4, 4.7, -0.65]} />

      <mesh position={[-3.35, 0.65, -6.4]} castShadow receiveShadow>
        <boxGeometry args={[11.9, 1.3, 1.05]} />
        <meshStandardMaterial color="#1d4280" roughness={0.6} />
      </mesh>
      <mesh position={[-3.35, 1.34, -6.36]} castShadow receiveShadow>
        <boxGeometry args={[12.1, 0.08, 1.12]} />
        <meshStandardMaterial color="#231d18" roughness={0.74} />
      </mesh>
      <mesh position={[-1.05, 2.62, -6.96]}>
        <planeGeometry args={[6.2, 2.8]} />
        <meshStandardMaterial map={textures.pegboard} />
      </mesh>

      <mesh position={[7.55, 0.8, -4.9]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 1.6, 1.2]} />
        <meshStandardMaterial color="#214d8e" roughness={0.7} />
      </mesh>
      <mesh position={[7.55, 1.68, -4.9]} castShadow receiveShadow>
        <boxGeometry args={[1.64, 0.08, 1.28]} />
        <meshStandardMaterial color="#31231d" roughness={0.82} />
      </mesh>
      <mesh position={[8.65, 0.35, -5.0]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.68, 0.28]} />
        <meshStandardMaterial color="#b41e20" roughness={0.45} />
      </mesh>
      <mesh position={[8.65, 0.86, -5.0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.35, 20]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>

      <GarageDoor position={[9.05, 1.92, -3.15]} />

      <mesh position={[2.1, 1.02, 8.05]} castShadow receiveShadow>
        <boxGeometry args={[4.9, 0.08, 2.65]} />
        <meshStandardMaterial color="#f6f5f2" roughness={0.68} />
      </mesh>
      {[
        [-0.05, 0.49, 6.93],
        [-0.05, 0.49, 9.17],
        [4.25, 0.49, 6.93],
        [4.25, 0.49, 9.17],
      ].map((position, index) => (
        <mesh key={`table-leg-${index}`} position={position as Triplet} castShadow>
          <boxGeometry args={[0.09, 0.98, 0.09]} />
          <meshStandardMaterial color="#1a1a1d" roughness={0.6} metalness={0.35} />
        </mesh>
      ))}

      <mesh position={[1.4, 0.45, 9.13]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.78, 1.15]} />
        <meshStandardMaterial color="#615949" roughness={0.92} />
      </mesh>
      <mesh position={[3.4, 0.34, 9.48]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.55, 0.98]} />
        <meshStandardMaterial color="#151414" roughness={0.82} />
      </mesh>

      <mesh position={[4.15, 0.48, 10.35]} rotation={[0, 0.12, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.9, 0.38]} />
        <meshStandardMaterial color="#b1845b" roughness={0.96} />
      </mesh>
      <mesh position={[4.65, 0.26, 10.78]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.48, 0.72]} />
        <meshStandardMaterial color="#d5d5d2" roughness={0.86} />
      </mesh>
    </group>
  );
}

interface PosterProps {
  texture: THREE.Texture;
  width: number;
  height: number;
  highlighted?: boolean;
  frameColor?: string;
  backgroundColor?: string;
  artWidth?: number;
  artHeight?: number;
  transparent?: boolean;
}

function Poster({
  texture,
  width,
  height,
  highlighted = false,
  frameColor = '#2e2621',
  backgroundColor,
  artWidth = width,
  artHeight = height,
  transparent = false,
}: PosterProps) {
  return (
    <group>
      {highlighted ? (
        <mesh scale={[1.06, 1.06, 1.24]} renderOrder={45}>
          <boxGeometry args={[width + 0.12, height + 0.12, 0.08]} />
          <meshBasicMaterial
            color={HOVER_OUTLINE_COLOR}
            side={THREE.BackSide}
            transparent
            opacity={0.96}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.08]} />
        <meshStandardMaterial color={frameColor} roughness={0.82} />
      </mesh>
      {backgroundColor ? (
        <mesh position={[0, 0, 0.042]}>
          <planeGeometry args={[width - 0.1, height - 0.1]} />
          <meshStandardMaterial color={backgroundColor} roughness={0.92} />
        </mesh>
      ) : null}
      <mesh position={[0, 0, backgroundColor ? 0.048 : 0.05]}>
        <planeGeometry args={[artWidth, artHeight]} />
        <meshStandardMaterial
          map={texture}
          transparent={transparent}
          alphaTest={transparent ? 0.08 : 0}
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
}

function Plate({
  texture,
  width,
  height,
  highlighted = false,
}: {
  texture: THREE.Texture;
  width: number;
  height: number;
  highlighted?: boolean;
}) {
  return (
    <group>
      {highlighted ? (
        <mesh scale={[1.08, 1.08, 1.28]} renderOrder={45}>
          <boxGeometry args={[width + 0.08, height + 0.08, 0.06]} />
          <meshBasicMaterial
            color={HOVER_OUTLINE_COLOR}
            side={THREE.BackSide}
            transparent
            opacity={0.96}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.06]} />
        <meshStandardMaterial color="#2d261f" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}

function CoffeeMachine({ highlighted = false }: { highlighted?: boolean }) {
  void highlighted;
  const model = useFittedGLTF(
    '/models/coffee_machine.glb?v=real-20260501',
    [1.05, 1.22, 0.92],
    [0, Math.PI / 2, 0],
    { textureAnisotropy: 8 },
  );

  return (
    <group>
      <primitive object={model.object} position={model.position} scale={model.scale} />
    </group>
  );
}

function Laptop({
  active,
  finderVisible,
  highlighted = false,
}: {
  active: boolean;
  finderVisible: boolean;
  highlighted?: boolean;
}) {
  void highlighted;
  const model = useFittedGLTF('/models/macbook_air_m4.glb?v=real-20260501', [1.5, 0.95, 1.0], [0, 0, 0], {
    textureAnisotropy: 8,
  });
  const { invalidate } = useThree();
  const [openFolder, setOpenFolder] = useState<LaptopFolderId | null>(null);
  const [laptopTextDoc, setLaptopTextDoc] = useState<LaptopTextDocument | null>(null);
  const [openDemoApp, setOpenDemoApp] = useState<'jimbo-demo' | 'roya-demo' | null>(null);
  const openFolderRef = useRef<LaptopFolderId | null>(null);
  const bounceRafRef = useRef<LaptopBounceRafState | null>(null);
  const bounceInProgressRef = useRef(false);
  const activeRef = useRef(active);
  const finderVisibleRef = useRef(finderVisible);
  const finderLogosRef = useRef<LaptopFinderLogos>({});
  const [finderLogoEpoch, setFinderLogoEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const onAsset = () => {
      if (!cancelled) {
        setFinderLogoEpoch((n) => n + 1);
      }
    };
    const j = new Image();
    j.src = '/jimbo-logo.png';
    j.onload = () => {
      finderLogosRef.current = { ...finderLogosRef.current, JimBo: whitenDarkBackgroundInPlace(j) };
      onAsset();
    };
    const r = new Image();
    r.src = '/roya-link-logo.png';
    r.onload = () => {
      finderLogosRef.current = { ...finderLogosRef.current, 'Roya Link': r };
      onAsset();
    };
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (document.fonts?.load) {
        try {
          await document.fonts.load('600 24px Fredoka');
          await document.fonts.load('500 24px Ubuntu');
          await document.fonts.load('600 30px Fredoka');
          await document.fonts.load('500 30px Ubuntu');
        } catch {
          // Best-effort: canvas will still draw with a fallback if load fails
        }
      } else {
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      }
      if (!cancelled) {
        setFinderLogoEpoch((n) => n + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finderTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = LAPTOP_CANVAS_WIDTH;
    canvas.height = LAPTOP_CANVAS_HEIGHT;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create the laptop Finder texture.');
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    return { context, texture };
  }, []);

  useLayoutEffect(() => {
    openFolderRef.current = openFolder;
  }, [openFolder]);

  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);

  useLayoutEffect(() => {
    finderVisibleRef.current = finderVisible;
  }, [finderVisible]);

  const startFinderBounce = (kind: 'open' | 'back', targetFolder?: LaptopFolderId) => {
    if (bounceInProgressRef.current) {
      return;
    }
    if (kind === 'open' && !targetFolder) {
      return;
    }
    bounceInProgressRef.current = true;
    const startMs = performance.now();
    if (kind === 'open' && targetFolder) {
      bounceRafRef.current = { startMs, kind: 'open', targetFolder };
    } else {
      bounceRafRef.current = { startMs, kind: 'back' };
    }
    invalidate();
  };

  const startFileRowBounce = (fileFolder: LaptopFolderId, fileIndex: number) => {
    if (bounceInProgressRef.current) {
      return;
    }
    bounceInProgressRef.current = true;
    bounceRafRef.current = {
      startMs: performance.now(),
      kind: 'file',
      openFolder: fileFolder,
      fileIndex,
    };
    invalidate();
  };

  useFrame(() => {
    const b = bounceRafRef.current;
    if (!b) {
      return;
    }
    if (!activeRef.current || !finderVisibleRef.current) {
      bounceRafRef.current = null;
      bounceInProgressRef.current = false;
      return;
    }
    const durationMs = FINDER_BOUNCE_DURATION_SEC * 1000;
    const t = Math.min(1, (performance.now() - b.startMs) / durationMs);
    const bounceDraw: LaptopFinderBounce | null =
      b.kind === 'file'
        ? { kind: 'file', openFolder: b.openFolder, fileIndex: b.fileIndex, t }
        : b.kind === 'open'
          ? { kind: 'folder', id: b.targetFolder, t }
          : { kind: 'back', t };
    drawLaptopFinderTexture(
      finderTexture.context,
      LAPTOP_CANVAS_WIDTH,
      LAPTOP_CANVAS_HEIGHT,
      openFolderRef.current,
      bounceDraw,
      finderLogosRef.current,
      null,
    );
    finderTexture.texture.needsUpdate = true;
    if (t < 1) {
      invalidate();
      return;
    }
    bounceRafRef.current = null;
    bounceInProgressRef.current = false;
    if (b.kind === 'file') {
      const rowFile = laptopFolders[b.openFolder].files[b.fileIndex];
      if (rowFile.openDocumentText) {
        setLaptopTextDoc({ fileName: rowFile.name, body: rowFile.openDocumentText });
      } else if (rowFile.openUrl) {
        window.open(rowFile.openUrl, '_blank', 'noopener,noreferrer');
      } else if (rowFile.openDemoApp === 'jimbo-demo' || rowFile.openDemoApp === 'roya-demo') {
        setLaptopTextDoc(null);
        setOpenDemoApp(rowFile.openDemoApp);
      }
    } else if (b.kind === 'open') {
      setOpenFolder(b.targetFolder);
    } else {
      setOpenFolder(null);
    }
    invalidate();
  });

  useEffect(() => {
    if (openFolder === null) {
      setLaptopTextDoc(null);
    }
  }, [openFolder]);

  useEffect(() => {
    if (!active) {
      bounceRafRef.current = null;
      bounceInProgressRef.current = false;
      setLaptopTextDoc(null);
      setOpenFolder(null);
      openFolderRef.current = null;
      setOpenDemoApp(null);
    }
  }, [active]);

  useEffect(() => {
    if (!finderVisible) {
      setOpenDemoApp(null);
    }
  }, [finderVisible]);

  useLayoutEffect(() => {
    if (!finderVisible) {
      return;
    }
    if (bounceInProgressRef.current) {
      return;
    }
    drawLaptopFinderTexture(
      finderTexture.context,
      LAPTOP_CANVAS_WIDTH,
      LAPTOP_CANVAS_HEIGHT,
      openFolder,
      null,
      finderLogosRef.current,
      laptopTextDoc,
    );
    finderTexture.texture.needsUpdate = true;
    invalidate();
  }, [finderTexture, finderVisible, invalidate, openFolder, finderLogoEpoch, laptopTextDoc]);

  useEffect(() => {
    return () => {
      bounceRafRef.current = null;
      finderTexture.texture.dispose();
    };
  }, [finderTexture]);

  const closeTextDocument = useCallback(() => {
    setLaptopTextDoc(null);
    invalidate();
  }, [invalidate]);

  const textDocumentRootRef = useRef<Root | null>(null);
  const textDocumentHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!finderVisible || !laptopTextDoc || !openFolder) {
      if (textDocumentRootRef.current) {
        textDocumentRootRef.current.unmount();
        textDocumentRootRef.current = null;
      }
      if (textDocumentHostRef.current) {
        textDocumentHostRef.current.remove();
        textDocumentHostRef.current = null;
      }
      return;
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    textDocumentHostRef.current = host;
    const root = createRoot(host);
    textDocumentRootRef.current = root;
    root.render(
      <LaptopTextDocumentPage
        doc={laptopTextDoc}
        folderName={openFolder}
        onClose={closeTextDocument}
      />,
    );
    return () => {
      root.unmount();
      host.remove();
      textDocumentRootRef.current = null;
      textDocumentHostRef.current = null;
    };
  }, [closeTextDocument, finderVisible, laptopTextDoc, openFolder]);

  const demoAppRootRef = useRef<Root | null>(null);
  const demoAppHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openDemoApp !== 'jimbo-demo' && openDemoApp !== 'roya-demo') {
      if (demoAppRootRef.current) {
        demoAppRootRef.current.unmount();
        demoAppRootRef.current = null;
      }
      if (demoAppHostRef.current) {
        demoAppHostRef.current.remove();
        demoAppHostRef.current = null;
      }
      return;
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    demoAppHostRef.current = host;
    const root = createRoot(host);
    demoAppRootRef.current = root;
    if (openDemoApp === 'jimbo-demo') {
      root.render(<JimBoDemoApp onClose={() => setOpenDemoApp(null)} />);
    } else {
      root.render(<RoyaLinkDemoApp onClose={() => setOpenDemoApp(null)} />);
    }
    return () => {
      root.unmount();
      host.remove();
      demoAppRootRef.current = null;
      demoAppHostRef.current = null;
    };
  }, [openDemoApp]);

  const sidebarBackPlane = finderVisible ? screenRectToPlane(laptopSidebarBackRect) : null;
  const sidebarNavPlanes = finderVisible
    ? (() => {
        const nav = getLaptopSidebarNavRects();
        return {
          recents: screenRectToPlane(nav.recents),
          jimbo: screenRectToPlane(nav.jimbo),
          roya: screenRectToPlane(nav.roya),
        };
      })()
    : null;

  return (
    <group>
      <group position={model.position} scale={model.scale}>
        <primitive object={model.object} />
        {finderVisible ? (
          <mesh position={[LAPTOP_SCREEN_CENTER_X, LAPTOP_SCREEN_CENTER_Y, LAPTOP_SCREEN_CENTER_Z]}>
            <planeGeometry args={[LAPTOP_SCREEN_WIDTH, LAPTOP_SCREEN_HEIGHT]} />
            <meshBasicMaterial
              map={finderTexture.texture}
              toneMapped={false}
              transparent
              alphaTest={0.02}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        ) : null}
        {finderVisible && !openFolder
          ? (Object.entries(laptopFolderRects) as [LaptopFolderId, ScreenRect][]).map(([folderId, rect]) => {
              const hotspot = screenRectToPlane(rect);

              return (
                <mesh
                  key={folderId}
                  position={hotspot.position}
                  onClick={(event) => {
                    event.stopPropagation();
                    startFinderBounce('open', folderId);
                  }}
                >
                  <planeGeometry args={hotspot.size} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              );
            })
          : null}
        {sidebarBackPlane ? (
          <mesh
            position={sidebarBackPlane.position}
            onClick={(event) => {
              event.stopPropagation();
              if (laptopTextDoc) {
                setLaptopTextDoc(null);
              } else if (openFolder) {
                startFinderBounce('back');
              }
            }}
          >
            <planeGeometry args={sidebarBackPlane.size} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ) : null}
        {sidebarNavPlanes ? (
          <>
            <mesh
              position={sidebarNavPlanes.recents.position}
              onClick={(event) => {
                event.stopPropagation();
                if (openFolder) {
                  setLaptopTextDoc(null);
                  startFinderBounce('back');
                }
              }}
            >
              <planeGeometry args={sidebarNavPlanes.recents.size} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh
              position={sidebarNavPlanes.jimbo.position}
              onClick={(event) => {
                event.stopPropagation();
                if (openFolder !== 'JimBo') {
                  setLaptopTextDoc(null);
                  setOpenDemoApp(null);
                  startFinderBounce('open', 'JimBo');
                }
              }}
            >
              <planeGeometry args={sidebarNavPlanes.jimbo.size} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh
              position={sidebarNavPlanes.roya.position}
              onClick={(event) => {
                event.stopPropagation();
                if (openFolder !== 'Roya Link') {
                  setLaptopTextDoc(null);
                  setOpenDemoApp(null);
                  startFinderBounce('open', 'Roya Link');
                }
              }}
            >
              <planeGeometry args={sidebarNavPlanes.roya.size} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </>
        ) : null}
        {finderVisible && openFolder && !laptopTextDoc
          ? laptopFolders[openFolder].files.map((file, index) => {
              if (!file.openUrl && !file.openDocumentText && !file.openDemoApp) {
                return null;
              }
              const hot = screenRectToPlane(getLaptopFileRowRect(openFolder, index));
              return (
                <mesh
                  key={`laptop-file-${openFolder}-${String(index)}-${file.name}`}
                  position={hot.position}
                  renderOrder={2}
                  onClick={(event) => {
                    event.stopPropagation();
                    startFileRowBounce(openFolder, index);
                  }}
                >
                  <planeGeometry args={hot.size} />
                  <meshBasicMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    polygonOffset
                    polygonOffsetFactor={-3}
                    polygonOffsetUnits={-3}
                  />
                </mesh>
              );
            })
          : null}
      </group>
    </group>
  );
}

function ArcReactor() {
  const model = useFittedGLTF('/models/arc_reactor.glb?v=real-20260501', [0.72, 0.28, 0.72], [-Math.PI / 2, 0, 0], {
    castShadow: true,
    textureAnisotropy: 8,
  });

  return (
    <group>
      <group rotation={[0, Math.PI + Math.PI / 2, 0]}>
        <group rotation={[0, 0, Math.PI + Math.PI / 2]}>
          <primitive object={model.object} position={model.position} scale={model.scale} />
        </group>
      </group>
      <pointLight position={[0, 0.22, 0]} intensity={1.1} distance={2.4} color="#79d6ff" />
    </group>
  );
}

function FusionLamp() {
  const model = useFittedGLTF('/models/generator.glb?v=real-20260501', [0.42, 0.36, 0.42], [0, 0.24, 0], {
    castShadow: true,
    textureAnisotropy: 8,
  });

  return (
    <group>
      <primitive object={model.object} position={model.position} scale={model.scale} />
      <pointLight position={[0, 0.18, 0]} intensity={0.85} distance={2.1} color="#ffb96e" />
    </group>
  );
}

function ProjectInteriorModel({
  active,
  focused,
  hintFlash = false,
  hitSpherePos,
  hitSphereR,
  piecePivot,
  onPick,
  onProjectPieceHover,
  pieceId,
  children,
}: {
  active: boolean;
  focused: boolean;
  hintFlash?: boolean;
  hitSpherePos: Triplet;
  hitSphereR: number;
  /** Local origin of the prop mesh in the box. */
  piecePivot: Triplet;
  onPick: () => void;
  onProjectPieceHover: (id: 'arc' | 'fusion' | null) => void;
  pieceId: 'arc' | 'fusion';
  children: ReactNode;
}) {
  const { gl, invalidate, camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const liftRef = useRef<THREE.Group>(null);
  const liftY = useRef(0);
  const spinWhenFocused = pieceId === 'fusion';
  const spinRef = useRef<THREE.Group>(null);
  const spinAngle = useRef(0);
  const focusSpot0Ref = useRef<THREE.SpotLight>(null);
  const focusSpot1Ref = useRef<THREE.SpotLight>(null);
  const focusSpot2Ref = useRef<THREE.SpotLight>(null);
  const focusSpotTargetRef = useRef<THREE.Object3D>(null);

  useLayoutEffect(() => {
    const tgt = focusSpotTargetRef.current;
    if (!focused || !tgt) {
      return;
    }
    for (const ref of [focusSpot0Ref, focusSpot1Ref, focusSpot2Ref]) {
      const spot = ref.current;
      if (spot) {
        spot.target = tgt;
      }
    }
    tgt.updateMatrixWorld();
  }, [focused]);

  useFrame((_, delta) => {
    const lift = liftRef.current;
    if (!lift || !active) {
      return;
    }
    const liftTarget = focused ? 0.92 : 0;
    liftY.current = THREE.MathUtils.lerp(liftY.current, liftTarget, 1 - Math.exp(-delta * 5.2));
    lift.position.y = liftY.current;
    projectsPieceLiftLocalY[pieceId] = liftY.current;

    const floatBlend = focused ? THREE.MathUtils.smoothstep(liftY.current, 0.12, 0.72) : 0;
    const liftMoving = Math.abs(liftY.current - liftTarget) > 0.004;
    const lightRamping = focused && floatBlend > 0.02 && floatBlend < 0.998;
    if (liftMoving || lightRamping) {
      invalidate();
    }

    if (spinWhenFocused) {
      const spin = spinRef.current;
      if (spin) {
        if (focused) {
          spinAngle.current += delta * 0.42;
        } else {
          spinAngle.current = THREE.MathUtils.lerp(spinAngle.current, 0, 1 - Math.exp(-delta * 5.5));
        }
        spin.rotation.y = spinAngle.current;
        if (focused || Math.abs(spinAngle.current) > 0.004) {
          invalidate();
        }
      }
    }

    if (focused && floatBlend > 0.02 && focusSpotTargetRef.current) {
      focusSpotTargetRef.current.getWorldPosition(projFloatItemW);
      camera.getWorldPosition(projViewLightCam);

      projFloatE1.subVectors(projViewLightCam, projFloatItemW);
      projFloatE1.y = 0;
      if (projFloatE1.lengthSq() < 1e-6) {
        projFloatE1.set(0, 0, 1);
      } else {
        projFloatE1.normalize();
      }
      projFloatE2.crossVectors(worldUp, projFloatE1).normalize();

      const height = 0.58 + 0.22 * floatBlend;
      const radius = 0.42;

      const spots = [focusSpot0Ref.current, focusSpot1Ref.current, focusSpot2Ref.current];
      const baseIntensities = [26, 22, 24];
      const colors = ['#fff4e8', '#eef6ff', '#fffef5'];

      for (let k = 0; k < 3; k++) {
        const spot = spots[k];
        if (!spot) {
          continue;
        }
        const ang = (k / 3) * Math.PI * 2;
        projFloatLightWorld
          .copy(projFloatItemW)
          .addScaledVector(worldUp, height)
          .addScaledVector(projFloatE1, Math.cos(ang) * radius)
          .addScaledVector(projFloatE2, Math.sin(ang) * radius);

        lift.worldToLocal(spot.position.copy(projFloatLightWorld));
        spot.intensity = baseIntensities[k] * floatBlend;
        spot.color.set(colors[k]);
      }

      focusSpotTargetRef.current.updateMatrixWorld();
    } else if (focused) {
      for (const ref of [focusSpot0Ref, focusSpot1Ref, focusSpot2Ref]) {
        const spot = ref.current;
        if (spot) {
          spot.intensity = 0;
          spot.position.set(0, 0.01, 0);
        }
      }
    }
  });

  useEffect(() => {
    if (!active) {
      liftY.current = 0;
      spinAngle.current = 0;
      projectsPieceLiftLocalY[pieceId] = 0;
    }
  }, [active, pieceId]);

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = 'auto';
    };
  }, [gl]);

  useEffect(() => {
    if (!active) {
      onProjectPieceHover(null);
      setHovered(false);
      gl.domElement.style.cursor = 'auto';
    }
  }, [active, gl, onProjectPieceHover]);

  const setPointer = useCallback(
    (v: boolean) => {
      gl.domElement.style.cursor = v && active ? 'pointer' : 'auto';
    },
    [active, gl],
  );

  if (!active) {
    return <group position={piecePivot}>{children}</group>;
  }

  const outlineEnabled = hovered || focused || hintFlash;

  return (
    <group ref={liftRef}>
      <mesh
        position={hitSpherePos}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onProjectPieceHover(pieceId);
          setPointer(true);
          invalidate();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onProjectPieceHover(null);
          setPointer(false);
          invalidate();
        }}
      >
        <sphereGeometry args={[hitSphereR, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {focused ? (
        <>
          <spotLight
            ref={focusSpot0Ref}
            position={[0, 0, 0]}
            angle={0.52}
            penumbra={0.82}
            intensity={0}
            distance={9}
            decay={1.85}
            color="#fff4e8"
            castShadow={false}
          />
          <spotLight
            ref={focusSpot1Ref}
            position={[0, 0, 0]}
            angle={0.5}
            penumbra={0.85}
            intensity={0}
            distance={9}
            decay={1.85}
            color="#eef6ff"
            castShadow={false}
          />
          <spotLight
            ref={focusSpot2Ref}
            position={[0, 0, 0]}
            angle={0.52}
            penumbra={0.82}
            intensity={0}
            distance={9}
            decay={1.85}
            color="#fffef5"
            castShadow={false}
          />
        </>
      ) : null}
      <group position={piecePivot}>
        {focused ? <object3D ref={focusSpotTargetRef} position={[0, 0.14, 0]} /> : null}
        {spinWhenFocused ? (
          <group ref={spinRef}>
            <Select enabled={outlineEnabled}>{children}</Select>
          </group>
        ) : (
          <Select enabled={outlineEnabled}>{children}</Select>
        )}
      </group>
    </group>
  );
}

function ProjectBox({
  textures,
  active,
  highlighted = false,
  projectsModelFocus,
  hintFlash = false,
  onProjectsModelSelect,
  onProjectPieceHover,
}: {
  textures: GarageTextures;
  active: boolean;
  highlighted?: boolean;
  projectsModelFocus: 'arc' | 'fusion' | null;
  hintFlash?: boolean;
  onProjectsModelSelect: (id: 'arc' | 'fusion' | null) => void;
  onProjectPieceHover: (id: 'arc' | 'fusion' | null) => void;
}) {
  const { invalidate } = useThree();
  const frontFlap = useRef<THREE.Group | null>(null);
  const backFlap = useRef<THREE.Group | null>(null);
  const leftFlap = useRef<THREE.Group | null>(null);
  const rightFlap = useRef<THREE.Group | null>(null);
  const openness = useRef(0.04);

  useFrame((_, delta) => {
    const targetOpenness = active ? 1 : 0.04;
    openness.current = THREE.MathUtils.lerp(openness.current, targetOpenness, 1 - Math.exp(-delta * 5));

    const lidAngle = openness.current * 1.18;

    if (frontFlap.current) {
      frontFlap.current.rotation.x = -lidAngle;
    }

    if (backFlap.current) {
      backFlap.current.rotation.x = lidAngle;
    }

    if (leftFlap.current) {
      leftFlap.current.rotation.z = lidAngle;
    }

    if (rightFlap.current) {
      rightFlap.current.rotation.z = -lidAngle;
    }

    if (Math.abs(openness.current - targetOpenness) > 0.002) {
      invalidate();
    }
  });

  return (
    <group>
      {highlighted ? (
        <mesh position={[0, 0.56, 0]} scale={[1.08, 1.08, 1.08]} renderOrder={45}>
          <boxGeometry args={[1.58, 1.1, 1.12]} />
          <meshBasicMaterial
            color={HOVER_OUTLINE_COLOR}
            side={THREE.BackSide}
            transparent
            opacity={0.96}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.58, 0.06, 1.12]} />
        <meshStandardMaterial color="#9f7247" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.53, 0.56]} castShadow receiveShadow>
        <boxGeometry args={[1.58, 1.02, 0.06]} />
        <meshStandardMaterial color="#b78955" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.53, -0.56]} castShadow receiveShadow>
        <boxGeometry args={[1.58, 1.02, 0.06]} />
        <meshStandardMaterial color="#b18252" roughness={0.96} />
      </mesh>
      <mesh position={[0.79, 0.53, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 1.02, 1.12]} />
        <meshStandardMaterial color="#b18456" roughness={0.96} />
      </mesh>
      <mesh position={[-0.79, 0.53, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 1.02, 1.12]} />
        <meshStandardMaterial color="#b18456" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.53, 0.592]}>
        <planeGeometry args={[1.46, 0.86]} />
        <meshStandardMaterial map={textures.cardboardFront} />
      </mesh>

      <group ref={frontFlap} position={[0, 1.06, 0.56]}>
        <mesh position={[0, 0, -0.27]} castShadow receiveShadow>
          <boxGeometry args={[1.54, 0.04, 0.54]} />
          <meshStandardMaterial color="#ba8d58" roughness={0.98} />
        </mesh>
      </group>
      <group ref={backFlap} position={[0, 1.06, -0.56]}>
        <mesh position={[0, 0, 0.27]} castShadow receiveShadow>
          <boxGeometry args={[1.54, 0.04, 0.54]} />
          <meshStandardMaterial color="#b58856" roughness={0.98} />
        </mesh>
      </group>
      <group ref={leftFlap} position={[-0.79, 1.06, 0]}>
        <mesh position={[0.27, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.54, 0.04, 1.1]} />
          <meshStandardMaterial color="#b98b59" roughness={0.98} />
        </mesh>
      </group>
      <group ref={rightFlap} position={[0.79, 1.06, 0]}>
        <mesh position={[-0.27, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.54, 0.04, 1.1]} />
          <meshStandardMaterial color="#b98b59" roughness={0.98} />
        </mesh>
      </group>
      <ProjectInteriorModel
        active={active}
        focused={projectsModelFocus === 'arc'}
        hintFlash={hintFlash}
        hitSpherePos={[-0.36, 0.36, 0]}
        hitSphereR={0.34}
        piecePivot={[-0.36, 0.28, 0]}
        pieceId="arc"
        onProjectPieceHover={onProjectPieceHover}
        onPick={() => onProjectsModelSelect('arc')}
      >
        <ArcReactor />
      </ProjectInteriorModel>
      <ProjectInteriorModel
        active={active}
        focused={projectsModelFocus === 'fusion'}
        hintFlash={hintFlash}
        hitSpherePos={[0.28, 0.34, 0.02]}
        hitSphereR={0.3}
        piecePivot={[0.28, 0.24, 0.02]}
        pieceId="fusion"
        onProjectPieceHover={onProjectPieceHover}
        onPick={() => onProjectsModelSelect('fusion')}
      >
        <FusionLamp />
      </ProjectInteriorModel>
    </group>
  );
}

const hslTmp = { h: 0, s: 0, l: 0 };

/** True for typical body paints from yellow-green through teal (export was green; car IRL is black). */
function isBodyGreenPaint(color: THREE.Color): boolean {
  color.getHSL(hslTmp);
  const { h, s, l } = hslTmp;
  if (s < 0.07 || l < 0.03 || l > 0.97) return false;
  // Three.js HSL hue 0..1 : green band (lime → forest → teal)
  if (h < 0.16 || h > 0.53) return false;
  const { r, g, b } = color;
  return g >= r - 0.1 && g >= b - 0.1;
}

/** GLB uses a near-black baseColorFactor with green hue; lighting makes it read as green paint. */
function isDarkGreenBodyAlbedo(color: THREE.Color): boolean {
  color.getHSL(hslTmp);
  const { h, s, l } = hslTmp;
  const { r, g, b } = color;
  if (l > 0.14 || s < 0.2) return false;
  if (h < 0.22 || h > 0.52) return false;
  return g >= r - 0.02 && g >= b - 0.02;
}

/** Main sheet metal in honda_cr-v.glb: material name `body`, mesh …body_body… */
function isCrvMainBodySheetMesh(mesh: THREE.Mesh): boolean {
  const n = mesh.name.toLowerCase().replace(/\./g, '');
  return n.includes('body_body');
}

function isCrvMainBodySheetMaterial(mat: THREE.Material): boolean {
  return mat.name.trim().toLowerCase() === 'body';
}

/** `car.body_plate_0` — embossed plate (separate mesh from interior `dark`). */
function isCrvLicensePlateMesh(mesh: THREE.Mesh): boolean {
  const n = mesh.name.toLowerCase().replace(/\./g, '');
  return n.includes('body_plate');
}

function shouldRecolorCrvPaint(mesh: THREE.Mesh, mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshPhysicalMaterial)) {
    return false;
  }
  if (isCrvLicensePlateMesh(mesh) || mat.name.trim().toLowerCase() === 'plate') return false;
  if (mat.transparent && mat.opacity < 0.92) return false;
  if (mat.emissive && mat.emissive.r + mat.emissive.g + mat.emissive.b > 0.35) return false;
  if (isCrvMainBodySheetMesh(mesh) || isCrvMainBodySheetMaterial(mat)) return true;
  return isBodyGreenPaint(mat.color) || isDarkGreenBodyAlbedo(mat.color);
}

function recolorCrvBodyToBlack(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;

    const paint = (mat: THREE.Material, slot: number | null) => {
      if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshPhysicalMaterial)) return;
      if (!shouldRecolorCrvPaint(child, mat)) return;
      const clone = mat.clone();
      clone.color.setHex(0x060608);
      clone.emissive.setScalar(0);
      if (clone.map) {
        clone.color.multiplyScalar(0.22);
      }
      clone.metalness = Math.min(0.88, clone.metalness + 0.1);
      clone.roughness = Math.min(0.96, clone.roughness + 0.05);
      if (slot !== null && Array.isArray(child.material)) {
        (child.material as THREE.Material[])[slot] = clone;
      } else {
        child.material = clone;
      }
    };

    if (Array.isArray(child.material)) {
      (child.material as THREE.Material[]).forEach((mat, i) => paint(mat, i));
    } else {
      paint(child.material as THREE.Material, null);
    }
  });
}

/** Interior trim + seats share glTF material `dark` with tires; only retint the body_dark mesh. */
function isCrvInteriorDarkMesh(mesh: THREE.Mesh): boolean {
  const n = mesh.name.toLowerCase().replace(/\./g, '');
  return n.includes('body_dark') && !n.includes('wheel') && !n.includes('body_plate');
}

function isCrvSharedDarkMaterial(mat: THREE.Material): boolean {
  return mat.name.trim().toLowerCase() === 'dark';
}

function recolorCrvInteriorDarkToGrey(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material || !isCrvInteriorDarkMesh(child)) return;

    const grey = (mat: THREE.Material, slot: number | null) => {
      if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshPhysicalMaterial)) return;
      if (!isCrvSharedDarkMaterial(mat)) return;
      const clone = mat.clone();
      clone.color.setHex(0x6d7178);
      clone.emissive.setScalar(0);
      clone.metalness = Math.min(0.35, clone.metalness + 0.05);
      clone.roughness = Math.min(0.96, clone.roughness + 0.12);
      if (slot !== null && Array.isArray(child.material)) {
        (child.material as THREE.Material[])[slot] = clone;
      } else {
        child.material = clone;
      }
    };

    if (Array.isArray(child.material)) {
      (child.material as THREE.Material[]).forEach((mat, i) => grey(mat, i));
    } else {
      grey(child.material as THREE.Material, null);
    }
  });
}

function restoreCrvLicensePlateBlack(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material || !isCrvLicensePlateMesh(child)) return;

    const fix = (mat: THREE.Material, slot: number | null) => {
      if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshPhysicalMaterial)) return;
      const clone = mat.clone();
      clone.color.setHex(0x050506);
      clone.emissive.setScalar(0);
      clone.metalness = 0;
      clone.roughness = 0.94;
      if (slot !== null && Array.isArray(child.material)) {
        (child.material as THREE.Material[])[slot] = clone;
      } else {
        child.material = clone;
      }
    };

    if (Array.isArray(child.material)) {
      (child.material as THREE.Material[]).forEach((mat, i) => fix(mat, i));
    } else {
      fix(child.material as THREE.Material, null);
    }
  });
}

const plateLetterScratch = {
  v: new THREE.Vector3(),
  off: new THREE.Vector3(),
  inPlane: new THREE.Vector3(),
  nAcc: new THREE.Vector3(),
  scale: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
};

/** Embossed characters sit on `body_dark` (grey); flat plate is `body_plate`. Tint those verts black via vertexColors. */
function blackenCrvPlateLettersOnBodyDark(root: THREE.Object3D) {
  let plate: THREE.Mesh | undefined;
  let bodyDark: THREE.Mesh | undefined;
  root.updateMatrixWorld(true);
  root.traverse((c) => {
    if (!(c instanceof THREE.Mesh)) return;
    if (isCrvLicensePlateMesh(c)) plate = c;
    if (isCrvInteriorDarkMesh(c)) bodyDark = c;
  });
  if (!plate || !bodyDark) return;

  const posAttr = plate.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!posAttr) return;

  const localBox = new THREE.Box3().setFromBufferAttribute(posAttr);
  const localSphere = new THREE.Sphere();
  localBox.getBoundingSphere(localSphere);
  const centerW = localSphere.center.clone().applyMatrix4(plate.matrixWorld);
  plate.matrixWorld.decompose(plateLetterScratch.v, plateLetterScratch.quat, plateLetterScratch.scale);
  const maxScale = Math.max(
    Math.abs(plateLetterScratch.scale.x),
    Math.abs(plateLetterScratch.scale.y),
    Math.abs(plateLetterScratch.scale.z),
  );
  const worldRadius = localSphere.radius * maxScale * 1.12;
  const dims = new THREE.Vector3();
  localBox.getSize(dims);
  const sorted = [dims.x, dims.y, dims.z].sort((a, b) => a - b);
  const slab = sorted[0] * maxScale * 6 + Math.max(sorted[1], sorted[2]) * maxScale * 0.03;

  plateLetterScratch.nAcc.set(0, 0, 0);
  const nAttr = plate.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (nAttr && nAttr.count > 0) {
    const step = Math.max(1, Math.floor(nAttr.count / 400));
    for (let i = 0; i < nAttr.count; i += step) {
      plateLetterScratch.v.fromBufferAttribute(nAttr, i).transformDirection(plate.matrixWorld);
      plateLetterScratch.nAcc.add(plateLetterScratch.v);
    }
  }
  if (plateLetterScratch.nAcc.lengthSq() < 1e-8) plateLetterScratch.nAcc.set(0, 0, 1);
  else plateLetterScratch.nAcc.normalize();
  const plateN = plateLetterScratch.nAcc;

  const geom = bodyDark.geometry as THREE.BufferGeometry;
  const bodyPos = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!bodyPos) return;

  geom.deleteAttribute('color');
  const colors = new Float32Array(bodyPos.count * 3);
  const { v, off, inPlane } = plateLetterScratch;

  for (let i = 0; i < bodyPos.count; i++) {
    v.fromBufferAttribute(bodyPos, i).applyMatrix4(bodyDark.matrixWorld);
    const distFromCenter = v.distanceTo(centerW);
    off.copy(v).sub(centerW);
    const along = off.dot(plateN);
    inPlane.copy(off).addScaledVector(plateN, -along);
    const inSlab = Math.abs(along) <= slab;
    const inDisc = inPlane.length() <= worldRadius * 1.05;
    const nearPlate = distFromCenter <= worldRadius * 1.08 && inSlab && inDisc;

    const o = i * 3;
    if (nearPlate) {
      colors[o] = 0.02;
      colors[o + 1] = 0.02;
      colors[o + 2] = 0.02;
    } else {
      colors[o] = 1;
      colors[o + 1] = 1;
      colors[o + 2] = 1;
    }
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mats = Array.isArray(bodyDark.material) ? bodyDark.material : [bodyDark.material];
  mats.forEach((m) => {
    if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
      m.vertexColors = true;
    }
  });
}

function CRV({ highlighted = false }: { highlighted?: boolean }) {
  void highlighted;
  const model = useFittedGLTF('/models/honda_cr-v.glb?v=real-20260501', [8.4, 3.1, 3.95], [0, Math.PI / 2, 0], {
    castShadow: true,
    textureAnisotropy: 8,
  });

  useLayoutEffect(() => {
    recolorCrvBodyToBlack(model.object);
    recolorCrvInteriorDarkToGrey(model.object);
    restoreCrvLicensePlateBlack(model.object);
    blackenCrvPlateLettersOnBodyDark(model.object);
  }, [model.object]);

  return (
    <group>
      <primitive object={model.object} position={model.position} scale={model.scale} />
    </group>
  );
}

useGLTF.preload('/models/coffee_machine.glb?v=real-20260501');
useGLTF.preload('/models/macbook_air_m4.glb?v=real-20260501');
useGLTF.preload('/models/honda_cr-v.glb?v=real-20260501');
useGLTF.preload('/models/arc_reactor.glb?v=real-20260501');
useGLTF.preload('/models/generator.glb?v=real-20260501');

export function GarageScene({
  activeId,
  cameraDebugEnabled,
  hoveredId,
  onHoverChange,
  onCameraPoseChange,
  onSelect,
  projectsModelFocus,
  onProjectsModelSelect,
  hintOutlineUntilMs,
}: GarageSceneProps) {
  const { gl, invalidate } = useThree();
  const textures = useGarageTextures();
  const [viewSettled, setViewSettled] = useState(false);
  const [projectsPieceHover, setProjectsPieceHover] = useState<'arc' | 'fusion' | null>(null);
  const posterTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const juggernog = loader.load('/posters/juggernog.jpg');
    const stLawrence = loader.load('/posters/st-lawrence.png');

    [juggernog, stLawrence].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    });

    return { juggernog, stLawrence };
  }, []);
  const interactionLocked = cameraDebugEnabled;
  const canHoverItem = (id: ItemId) => !interactionLocked && activeId !== id;
  const carHoverSuppressed = activeId === 'laptop';
  const hintFlashActive = hintOutlineUntilMs !== null && Date.now() < hintOutlineUntilMs;
  const canOutlineItem = (id: ItemId) => {
    if (carHoverSuppressed && id === 'crv') {
      return false;
    }
    if (hintFlashActive && canHoverItem(id)) {
      return true;
    }
    return hoveredId === id && canHoverItem(id);
  };
  const projectsInteriorOutlineActive =
    activeId === 'projects' &&
    (projectsModelFocus !== null || projectsPieceHover !== null || hintFlashActive);
  const modelOutlineActive =
    hintFlashActive ||
    (hoveredId !== null && MODEL_OUTLINE_IDS.includes(hoveredId) && canOutlineItem(hoveredId)) ||
    projectsInteriorOutlineActive;

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.45;
    invalidate();

    return () => {
      gl.toneMappingExposure = 1;
    };
  }, [gl, invalidate]);

  useEffect(() => {
    if (hintOutlineUntilMs == null) {
      return undefined;
    }
    let rafId = 0;
    const tick = () => {
      invalidate();
      if (Date.now() < hintOutlineUntilMs) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hintOutlineUntilMs, invalidate]);

  useEffect(() => {
    setViewSettled(false);
  }, [activeId, projectsModelFocus]);

  useEffect(() => {
    if (activeId !== 'projects') {
      setProjectsPieceHover(null);
    }
  }, [activeId]);

  useEffect(() => {
    if ((interactionLocked || hoveredId === activeId) && hoveredId !== null) {
      onHoverChange(null);
    }
  }, [activeId, hoveredId, interactionLocked, onHoverChange]);

  useEffect(() => {
    if (activeId === 'laptop' && hoveredId === 'crv') {
      onHoverChange(null);
    }
  }, [activeId, hoveredId, onHoverChange]);

  useEffect(() => {
    return () => {
      posterTextures.juggernog.dispose();
      posterTextures.stLawrence.dispose();
    };
  }, [posterTextures]);

  useCursor(Boolean(hoveredId) && !interactionLocked && hoveredId !== activeId);

  return (
    <>
      <PerspectiveCamera makeDefault position={defaultCamera.position} fov={defaultCamera.fov} near={0.1} far={60} />
      <CameraRig
        activeId={activeId}
        projectsModelFocus={projectsModelFocus}
        cameraDebugEnabled={cameraDebugEnabled}
        onCameraPoseChange={onCameraPoseChange}
        onViewSettledChange={setViewSettled}
      />

      <color attach="background" args={['#120d0a']} />
      <fog attach="fog" args={['#120d0a', 18, 33]} />

      <ambientLight intensity={0.82} color="#f6e9d8" />
      <hemisphereLight intensity={0.68} color="#d6e4ff" groundColor="#31231c" />
      <directionalLight
        position={[7.5, 8.5, 5.5]}
        intensity={1.32}
        color="#ffe1bb"
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.00008}
      />
      <spotLight
        position={[5.8, 4.9, 1.5]}
        angle={0.54}
        penumbra={0.58}
        intensity={24}
        distance={18}
        decay={1.9}
        color="#ffcf94"
      />
      <spotLight
        position={[-5.8, 4.0, 1.4]}
        angle={0.52}
        penumbra={0.72}
        intensity={18}
        distance={10}
        decay={1.8}
        color="#ffbc72"
      />

      <GarageShell textures={textures} />

      <Selection>
        <Suspense fallback={null}>
          <InteractiveGroup
            id="juggernog"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('juggernog')}
            position={[-6.15, 2.55, -6.88]}
          >
            <Poster
              texture={posterTextures.juggernog}
              width={1.58}
              height={2.1}
              highlighted={canOutlineItem('juggernog')}
              frameColor="#564037"
            />
          </InteractiveGroup>

          <InteractiveGroup
          id="stlawrence"
          hoveredId={hoveredId}
          onHoverChange={onHoverChange}
          onSelect={onSelect}
          hoverEnabled={canHoverItem('stlawrence')}
          position={[8.55, 2.62, 2.15]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          <Poster
            texture={posterTextures.stLawrence}
            width={1.62}
            height={2.08}
            highlighted={canOutlineItem('stlawrence')}
            frameColor="#121315"
            backgroundColor="#ffffff"
            artWidth={1.34}
            artHeight={1.34}
            transparent
          />
        </InteractiveGroup>

          <InteractiveGroup
            id="coffee"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('coffee')}
            position={[-4.28, 1.38, -6.02]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <Select enabled={canOutlineItem('coffee')}>
              <CoffeeMachine highlighted={canOutlineItem('coffee')} />
            </Select>
          </InteractiveGroup>

          <InteractiveGroup
            id="crv"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('crv') && !carHoverSuppressed}
            hitbox={{ size: [7.4, 3.2, 4.3], position: [0, 1.6, 0] }}
            position={[1.35, 0, -0.15]}
            rotation={[0, Math.PI + 0.18, 0]}
          >
            <Select enabled={canOutlineItem('crv')}>
              <CRV highlighted={canOutlineItem('crv')} />
            </Select>
          </InteractiveGroup>

          <InteractiveGroup
            id="laptop"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('laptop')}
            position={[0.86, 1.06, 8.32]}
            rotation={[0, 0.04, 0]}
          >
            <Select enabled={canOutlineItem('laptop')}>
              <Laptop
                active={activeId === 'laptop'}
                finderVisible={activeId === 'laptop' && viewSettled}
                highlighted={canOutlineItem('laptop')}
              />
            </Select>
          </InteractiveGroup>

          <InteractiveGroup
            id="projects"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('projects')}
            position={[3.15, 1.06, 7.78]}
            rotation={[0, -0.08, 0]}
          >
            <ProjectBox
              textures={textures}
              active={activeId === 'projects'}
              highlighted={canOutlineItem('projects')}
              projectsModelFocus={projectsModelFocus}
              hintFlash={hintFlashActive && activeId === 'projects'}
              onProjectsModelSelect={onProjectsModelSelect}
              onProjectPieceHover={setProjectsPieceHover}
            />
          </InteractiveGroup>

          <InteractiveGroup
            id="plate-ny"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('plate-ny')}
            position={[1.7, 4.72, -0.78]}
          >
            <Plate
              texture={textures.newYorkPlate}
              width={1.18}
              height={0.55}
              highlighted={canOutlineItem('plate-ny')}
            />
          </InteractiveGroup>

          <InteractiveGroup
            id="plate-no"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('plate-no')}
            position={[4.35, 4.68, -0.78]}
          >
            <Plate
              texture={textures.norwayPlate}
              width={1.92}
              height={0.56}
              highlighted={canOutlineItem('plate-no')}
            />
          </InteractiveGroup>

          <InteractiveGroup
            id="plate-hk"
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            hoverEnabled={canHoverItem('plate-hk')}
            position={[6.7, 4.56, -0.78]}
          >
            <Plate
              texture={textures.hongKongPlate}
              width={1.28}
              height={0.54}
              highlighted={canOutlineItem('plate-hk')}
            />
          </InteractiveGroup>
        </Suspense>

        <EffectComposer autoClear={false} multisampling={8}>
          <Outline
            visibleEdgeColor={HOVER_OUTLINE_COLOR}
            hiddenEdgeColor={HOVER_OUTLINE_COLOR}
            edgeStrength={modelOutlineActive ? 34 : 0}
            pulseSpeed={0}
            height={1080}
            blur={false}
            xRay
          />
        </EffectComposer>
      </Selection>

      <ContactShadows
        position={[2.8, 0.02, 1.0]}
        opacity={0.56}
        scale={20}
        blur={1.9}
        far={13}
        resolution={768}
        frames={1}
      />
    </>
  );
}
