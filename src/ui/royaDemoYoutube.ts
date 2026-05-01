export type DemoTargetLang = 'zh' | 'de' | 'fr';

export const DEMO_VIDEO_ID = 'iMPWx1v7ioM';

export const EXAMPLE_YOUTUBE_URL = `https://www.youtube.com/watch?v=${DEMO_VIDEO_ID}`;

export const LANG_OPTIONS: { id: DemoTargetLang; label: string }[] = [
  { id: 'zh', label: 'Chinese' },
  { id: 'de', label: 'German' },
  { id: 'fr', label: 'French' },
];

/** Sample transcript lines shown during the translate step (numbered, not truncated). */
export const SAMPLE_VIDEO_TRANSCRIPT_LINES: readonly string[] = [
  "This is my school. You are here because I've given you an opportunity.",
  'Why is it your school? But why am I always in the wrong?',
  'Why do I have to listen to you when you have zero to say?',
  "Because I'm young?",
];

export const ROYA_AI_TRANSLATE_FOOTER = 'Using AI to translate audio and edit timing.';

/** YouTube IFrame `cc_lang_pref` (ISO 639-1) — pair with `cc_load_policy: 1`. */
export function demoTargetLangToCcLangPref(lang: DemoTargetLang): string {
  switch (lang) {
    case 'zh':
      return 'zh';
    case 'de':
      return 'de';
    case 'fr':
      return 'fr';
    default:
      return 'en';
  }
}

const ID_RE = /^[\w-]{11}$/;

/** Accepts watch URLs, youtu.be, shorts, embed, or a bare 11-character id. */
export function extractYoutubeVideoId(raw: string): string | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }
  if (ID_RE.test(s)) {
    return s;
  }
  try {
    const u = new URL(s, 'https://www.youtube.com');
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] ?? '';
      return ID_RE.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch' || u.pathname.startsWith('/watch')) {
        const v = u.searchParams.get('v');
        return v && ID_RE.test(v) ? v : null;
      }
      const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/);
      if (shorts) {
        return shorts[1];
      }
      const embed = u.pathname.match(/^\/embed\/([\w-]{11})/);
      if (embed) {
        return embed[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export type RoyaPauseEvent = { pauseAtSec: number; holdSec: number };

const PAUSE_LINE_RE = /Pause at (\d+\.?\d*)s for (\d+\.?\d*)s/i;
const DETAILED_TIMING_RE =
  /Original Timing: \[(\d+\.?\d*)s - (\d+\.?\d*)s\]\s*\nAdjusted Timing: \[(\d+\.?\d*)s - (\d+\.?\d*)s\]/g;

function roundTiming(n: number): number {
  return Math.round(n * 100) / 100;
}

function addPauseEvent(out: RoyaPauseEvent[], pauseAtSec: number, holdSec: number) {
  const pause = roundTiming(pauseAtSec);
  const hold = roundTiming(holdSec);
  if (hold <= 0.01) {
    return;
  }
  const existing = out.find((ev) => Math.abs(ev.pauseAtSec - pause) < 0.01);
  if (existing) {
    existing.holdSec = roundTiming(existing.holdSec + hold);
    return;
  }
  out.push({ pauseAtSec: pause, holdSec: hold });
}

function parseDetailedTimingSchedule(text: string): RoyaPauseEvent[] {
  const rows = [...text.matchAll(DETAILED_TIMING_RE)].map((m) => ({
    originalStart: Number(m[1]),
    adjustedStart: Number(m[3]),
  }));

  if (rows.length === 0) {
    return [];
  }

  const out: RoyaPauseEvent[] = [];

  let cumulativeVideoPauseTime = 0;
  for (const row of rows) {
    const pauseDuration = Math.max(0, row.adjustedStart - row.originalStart - cumulativeVideoPauseTime);
    if (pauseDuration > 0.05) {
      addPauseEvent(out, row.originalStart, pauseDuration);
      cumulativeVideoPauseTime += pauseDuration;
    }
  }

  out.sort((a, b) => a.pauseAtSec - b.pauseAtSec);
  return out;
}

/** Parses either compact `Pause at ...` files or detailed timing logs from the RoyaLink pipeline. */
export function parseRoyaPauseSchedule(text: string): RoyaPauseEvent[] {
  const out: RoyaPauseEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(PAUSE_LINE_RE);
    if (!m) {
      continue;
    }
    addPauseEvent(out, Number(m[1]), Number(m[2]));
  }
  if (out.length > 0) {
    out.sort((a, b) => a.pauseAtSec - b.pauseAtSec);
    return out;
  }
  return parseDetailedTimingSchedule(text);
}
