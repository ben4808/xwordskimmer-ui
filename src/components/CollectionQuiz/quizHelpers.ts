import { ClueHydrated, ClueProgress, LanguageNames } from 'cruzi-models';

const LanguageNamesEs: Record<string, string> = {
  en: 'inglés',
  es: 'español',
  fr: 'francés',
  de: 'alemán',
  it: 'italiano',
  pt: 'portugués',
};

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

/** Language code of the example-sentence translation shown alongside the clue. */
export function getTranslatedExampleSentenceLanguage(
  translations: Record<string, string> | undefined,
  clueLang: string,
  userNativeLang?: string
): string | null {
  if (!translations) return null;

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
    if (translations[lang]) {
      return lang;
    }
  }

  return null;
}

/** Removes {{fill-in-blank}} markers, leaving the inner text. */
export function stripFillInBlankBrackets(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, '$1');
}

export function buildExampleSentenceExplainPrompt(
  sentence: string,
  sentenceLang: string,
  promptLang: string
): string {
  if (promptLang === 'es') {
    const sentenceLangName = LanguageNamesEs[sentenceLang] || sentenceLang;
    const targetLangName = LanguageNamesEs[promptLang] || promptLang;
    return `Para la siguiente oración en ${sentenceLangName}, desglósala frase por frase, dando una explicación de cada frase y una traducción al ${targetLangName}.\n\n${sentence}`;
  }

  const sentenceLangName = LanguageNames[sentenceLang] || sentenceLang;
  const targetLangName = LanguageNames[promptLang] || promptLang;
  return `For the following sentence in ${sentenceLangName}, break it down phrase by phrase, giving an explanation of each phrase and a translation into ${targetLangName}.\n\n${sentence}`;
}

export function buildClueExplainPrompt(clueText: string, answer: string): string {
  return `Explain why ${answer} might be given as an answer to the clue ${clueText}.`;
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

function getComparableChars(text: string): string {
  const matches = text.match(/(\p{L}|\p{N}|')/gu);
  return matches ? matches.join('').toLowerCase() : '';
}

/** Index of the first comparable character that is missing or incorrect. */
export function getFirstHintComparableIndex(
  userInput: string,
  expectedResponse: string
): number | null {
  const normalizedInput = getComparableChars(userInput);
  const normalizedExpected = getComparableChars(expectedResponse);

  for (let i = 0; i < normalizedExpected.length; i++) {
    if (i >= normalizedInput.length || normalizedInput[i] !== normalizedExpected[i]) {
      return i;
    }
  }
  return null;
}

/** Builds user input with comparable characters 0..comparableIndex revealed from the expected answer. */
export function buildHintedUserInput(
  expectedResponse: string,
  comparableIndex: number
): string {
  const matches = expectedResponse.match(/(\p{L}|\p{N}|')/gu);
  if (!matches || comparableIndex < 0) return '';
  return matches.slice(0, comparableIndex + 1).join('');
}

/** True when the answer differs by exactly one letter (substitution, insertion, or deletion). */
export function isOffByOneLetter(userInput: string, expectedAnswer: string): boolean {
  const a = getComparableChars(userInput);
  const b = getComparableChars(expectedAnswer);

  if (a === b || Math.abs(a.length - b.length) > 1) {
    return false;
  }

  if (a.length === b.length) {
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        mismatches++;
        if (mismatches > 1) {
          return false;
        }
      }
    }
    return mismatches === 1;
  }

  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) {
        return false;
      }
      j++;
    }
  }

  return edits + (longer.length - j) <= 1;
}

