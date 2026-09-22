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

export function classifyDesirability(qualityBucket: string | null | undefined): Desirability {
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
