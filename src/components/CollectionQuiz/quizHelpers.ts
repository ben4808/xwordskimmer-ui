import { Clue } from '../../models/Clue';

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
export function getExpectedResponse(clue: Clue | undefined, clueText?: string): string {
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
  return clue.entry?.displayText || '';
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

