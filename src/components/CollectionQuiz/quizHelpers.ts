import { ClueHydrated, ClueProgress } from 'cruzi-models';

const DEFAULT_CORRECT_SOLVES_NEEDED = 2;

export function normalizeClueProgress(progressData?: ClueProgress) {
  return {
    correctSolves: progressData?.correctSolves ?? 0,
    correctSolvesNeeded: progressData?.correctSolvesNeeded || DEFAULT_CORRECT_SOLVES_NEEDED,
  };
}

export function applyCorrectSolveProgress(progress: {
  correctSolves: number;
  correctSolvesNeeded: number;
}) {
  const correctSolvesNeeded = progress.correctSolvesNeeded || DEFAULT_CORRECT_SOLVES_NEEDED;
  return {
    correctSolves: progress.correctSolves + 1,
    correctSolvesNeeded,
  };
}

export function applyIncorrectSolveProgress(progress: {
  correctSolves: number;
  correctSolvesNeeded: number;
}) {
  const correctSolvesNeeded = progress.correctSolvesNeeded || DEFAULT_CORRECT_SOLVES_NEEDED;
  return {
    correctSolves: progress.correctSolves,
    correctSolvesNeeded: correctSolvesNeeded + 2,
  };
}

export function getClueLanguage(clue: ClueHydrated): string {
  return clue.lang || clue.entry?.lang || 'en';
}

/**
 * Picks an example-sentence translation in a language different from the clue language.
 * Prefers the user's native language, then Spanish, then English, then any other available language.
 */
export function getTranslatedExampleSentence(
  translations: Record<string, string> | undefined,
  clueLang: string,
  userNativeLang?: string
): string {
  if (!translations) return '';

  const candidates: string[] = [];

  if (userNativeLang && userNativeLang !== clueLang) {
    candidates.push(userNativeLang);
  }

  for (const lang of ['es', 'en']) {
    if (lang !== clueLang && !candidates.includes(lang)) {
      candidates.push(lang);
    }
  }

  for (const lang of Object.keys(translations)) {
    if (lang !== clueLang && !candidates.includes(lang)) {
      candidates.push(lang);
    }
  }

  for (const lang of candidates) {
    const text = translations[lang];
    if (text) {
      return text;
    }
  }

  return '';
}

/**
 * Normalizes an answer string for comparison by converting to uppercase and removing non-alphanumeric characters
 */
export function normalizeAnswer(answer: string | undefined): string {
  if (!answer) return '';
  return answer.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Gets the expected response for a clue according to priority:
 * 1. customDisplayText if present
 * 2. Fill-in-the-blank text from brackets if present (in clueText parameter or customClue)
 * 3. Entry's displayText
 * 
 * @param clue - The clue object
 * @param clueText - Optional: The actual clue text being used (from customClue or selected example sentence).
 *                   If provided, brackets will be extracted from this text to ensure consistency.
 */
export function getExpectedResponse(clue: ClueHydrated | undefined, clueText?: string): string {
  if (!clue) return '';
  
  // Priority 1: customDisplayText
  if (clue.customDisplayText) {
    return clue.customDisplayText;
  }
  
  // Priority 2: Fill-in-the-blank text from brackets
  const bracketPattern = /\{\{([^}]+)\}\}/i;
  
  // If clueText is provided, use it (this ensures we extract from the same text selected in useClueText)
  if (clueText) {
    const bracketMatch = clueText.match(bracketPattern);
    if (bracketMatch && bracketMatch[1]) {
      return bracketMatch[1].trim();
    }
  }
  
  // Fallback: Check customClue if clueText wasn't provided
  if (clue.customClue) {
    const bracketMatch = clue.customClue.match(bracketPattern);
    if (bracketMatch && bracketMatch[1]) {
      return bracketMatch[1].trim();
    }
  }
  
  // Priority 3: Entry's displayText
  return clue.entry.displayText || '';
}

/**
 * Checks if a user's answer is correct by comparing normalized versions
 */
export function checkAnswerCorrectness(
  userInput: string,
  expectedAnswer: string,
  isCrosswordMode: boolean,
  normalizedAnswer?: string
): boolean {
  const normalizedInput = normalizeAnswer(userInput);
  const normalizedExpected = isCrosswordMode 
    ? (normalizedAnswer || '')
    : normalizeAnswer(expectedAnswer);
  
  return normalizedInput === normalizedExpected;
}

