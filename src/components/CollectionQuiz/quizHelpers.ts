import { Clue } from '../../models/Clue';
import CruziApi from '../../api/CruziApi';

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
 * 2. Fill-in-the-blank text from brackets if present
 * 3. Entry's displayText
 */
export function getExpectedResponse(clue: Clue | undefined): string {
  if (!clue) return '';
  
  // Priority 1: customDisplayText
  if (clue.customDisplayText) {
    return clue.customDisplayText;
  }
  
  // Priority 2: Fill-in-the-blank text from brackets
  if (clue.customClue) {
    const bracketPattern = /\{\{([^}]+)\}\}/i;
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

/**
 * Submits a user response to the API
 */
export async function submitAnswer(clueId: string | undefined, isCorrect: boolean): Promise<void> {
  if (!clueId) return;
  
  try {
    await CruziApi.submitUserResponse(clueId, isCorrect);
  } catch (error) {
    console.error('Error submitting user response:', error);
  }
}

