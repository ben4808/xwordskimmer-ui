export type GettableNess =
  | 'Very Gettable'
  | 'Likely Gettable'
  | 'Maybe Gettable'
  | 'Not Gettable'
  | 'Not a Thing';

export type Desirability = 'Prefer' | 'Normal' | 'Avoid';

const NOT_A_THING_UNITY = new Set(['Non-unit', 'Nonsense']);
const VERY_GETTABLE_UNITY = new Set(['Concept', 'Formula']);
const LIKELY_GETTABLE_UNITY = new Set(['Concept', 'Collocation', 'Formula', 'Partial']);

const VERY_GETTABLE_FAMILIARITY = new Set(['Ubiquitous', 'Active']);
const LIKELY_GETTABLE_FAMILIARITY = new Set(['Literal', 'Common Name', 'Inferred']);
const MAYBE_GETTABLE_FAMILIARITY = new Set(['General Knowledge', 'Niche', 'Literal']);
const NOT_GETTABLE_FAMILIARITY = new Set(['Obscure', 'Barely Exists']);

const PREFER_QUALITY = new Set(['Idiomatic', 'Interesting', 'Appealing', 'Positive', 'Trendy']);
const NORMAL_QUALITY = new Set(['Normal', 'Sensitive']);
const AVOID_QUALITY = new Set(['Non-unit', 'Uncommon Inflection', 'Clunky']);

export const MISSING_RATING_COLOR = '#b57edc';

export function isRatingUnset(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

export function classifyGettableNess(
  unityBucket: string | null | undefined,
  familiarityBucket: string | null | undefined,
): GettableNess {
  if (isRatingUnset(unityBucket) || isRatingUnset(familiarityBucket)) {
    return 'Maybe Gettable';
  }

  const unity = unityBucket as string;
  const familiarity = familiarityBucket as string;

  if (NOT_A_THING_UNITY.has(unity)) {
    return 'Not a Thing';
  }
  if (VERY_GETTABLE_UNITY.has(unity) && VERY_GETTABLE_FAMILIARITY.has(familiarity)) {
    return 'Very Gettable';
  }
  if (LIKELY_GETTABLE_UNITY.has(unity) && LIKELY_GETTABLE_FAMILIARITY.has(familiarity)) {
    return 'Likely Gettable';
  }
  if (MAYBE_GETTABLE_FAMILIARITY.has(familiarity)) {
    return 'Maybe Gettable';
  }
  if (NOT_GETTABLE_FAMILIARITY.has(familiarity)) {
    return 'Not Gettable';
  }
  return 'Maybe Gettable';
}

const AVOID_SENSE_TAGS = new Set(['vulgar']);
const AVOID_ENTRY_TAGS = new Set(['breakfast_test']);
const SENSE_DISPLAY_FLAGS = ['sensitive', 'vulgar'] as const;
const ENTRY_DISPLAY_FLAGS = ['breakfast_test', 'crosswordese'] as const;
const DISPLAY_FLAG_ORDER = [
  'Sensitive',
  'Vulgar',
  'Breakfast Test',
  'Crosswordese',
];

function formatFlagLabel(tag: string): string {
  if (tag === 'breakfast_test') return 'Breakfast Test';
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function hasTag(
  tags: Record<string, string> | null | undefined,
  tag: string
): boolean {
  if (!tags) return false;
  return Object.keys(tags).some((key) => key.toLowerCase() === tag);
}

export function hasAvoidDesirabilityFlags(
  senseTags?: Record<string, string> | null,
  entryTags?: Record<string, string> | null,
): boolean {
  return (
    Object.keys(senseTags ?? {}).some((tag) =>
      AVOID_SENSE_TAGS.has(tag.toLowerCase())
    ) ||
    Object.keys(entryTags ?? {}).some((tag) =>
      AVOID_ENTRY_TAGS.has(tag.toLowerCase())
    )
  );
}

export function getDisplayFlagLabels(
  senseTags?: Record<string, string> | null,
  entryTags?: Record<string, string> | null,
): string[] {
  const labels = new Set<string>();
  for (const tag of SENSE_DISPLAY_FLAGS) {
    if (hasTag(senseTags, tag)) labels.add(formatFlagLabel(tag));
  }
  for (const tag of ENTRY_DISPLAY_FLAGS) {
    if (hasTag(entryTags, tag)) labels.add(formatFlagLabel(tag));
  }
  return DISPLAY_FLAG_ORDER.filter((label) => labels.has(label));
}

export function hasDisplayWarningFlags(
  senseTags?: Record<string, string> | null,
  entryTags?: Record<string, string> | null,
): boolean {
  return getDisplayFlagLabels(senseTags, entryTags).length > 0;
}

function getTagValue(
  tags: Record<string, string> | null | undefined,
  tag: string
): string | undefined {
  if (!tags) return undefined;
  const match = Object.entries(tags).find(([key]) => key.toLowerCase() === tag);
  return match?.[1];
}

/** NYT crossword appearance count from entry_tags.tag = 'nyt'. */
export function getNytAppearanceCount(
  entryTags?: Record<string, string> | null
): number | null {
  const raw = getTagValue(entryTags, 'nyt');
  if (raw == null || raw.trim() === '') return null;
  const count = Number(raw);
  return Number.isFinite(count) ? count : null;
}

/**
 * NYT puzzles: missing nyt tag, or 0/1 appearances.
 * Other publications: only missing nyt tag (a count of 1 is not a debut there).
 */
export function isLikelyNytDebut(
  entryTags?: Record<string, string> | null,
  publicationId?: string | null
): boolean {
  const count = getNytAppearanceCount(entryTags);
  const isNytPuzzle = (publicationId ?? '').toUpperCase() === 'NYT';
  if (isNytPuzzle) {
    return count == null || count === 0 || count === 1;
  }
  return count == null;
}

export function classifyDesirability(
  qualityBucket: string | null | undefined,
  senseTags?: Record<string, string> | null,
  entryTags?: Record<string, string> | null,
): Desirability {
  if (hasAvoidDesirabilityFlags(senseTags, entryTags)) {
    return 'Avoid';
  }
  if (isRatingUnset(qualityBucket)) {
    return 'Normal';
  }

  const quality = qualityBucket as string;
  if (PREFER_QUALITY.has(quality)) {
    return 'Prefer';
  }
  if (NORMAL_QUALITY.has(quality)) {
    return 'Normal';
  }
  if (AVOID_QUALITY.has(quality)) {
    return 'Avoid';
  }
  return 'Normal';
}

export function getGettableNessColor(level: GettableNess): string {
  switch (level) {
    case 'Not a Thing':
      return '#000000';
    case 'Very Gettable':
      return '#2563eb';
    case 'Likely Gettable':
      return '#7dd3fc';
    case 'Maybe Gettable':
      return '#f0c850';
    case 'Not Gettable':
      return '#f59e0b';
  }
}

export function getGettableNessTextColor(level: GettableNess): string {
  if (level === 'Not a Thing') return '#ffffff';
  return getGettableNessColor(level);
}

export function getDesirabilityColor(level: Desirability): string {
  switch (level) {
    case 'Prefer':
      return '#4db87a';
    case 'Normal':
      return '#9ca3af';
    case 'Avoid':
      return '#e87070';
  }
}
