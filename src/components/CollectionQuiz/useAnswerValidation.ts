import { useEffect } from 'react';
import { Clue } from '../../models/Clue';
import { InputBoxState } from '../../models/InputBoxState';
import { verifyInputBox } from '../../lib/utils';
import { checkAnswerCorrectness, submitAnswer, getExpectedResponse, normalizeAnswer } from './quizHelpers';

interface UseAnswerValidationParams {
  currentClue: Clue | undefined;
  userInput: string;
  isCrosswordClue: boolean;
  normalizedAnswer: string;
  isSolved: boolean;
  isRevealed: boolean;
  setInputBoxState: (state: InputBoxState) => void;
  setIsSolved: (solved: boolean) => void;
  setUserInput: (input: string) => void;
  getExpectedResponse: () => string;
  onCorrect: () => void;
  onIncorrect: () => void;
}

/**
 * Custom hook for managing answer validation and submission
 */
export function useAnswerValidation({
  currentClue,
  userInput,
  isCrosswordClue,
  normalizedAnswer,
  isSolved,
  isRevealed,
  setInputBoxState,
  setIsSolved,
  setUserInput,
  getExpectedResponse,
  onCorrect,
  onIncorrect,
}: UseAnswerValidationParams) {
  // Validate non-crossword input on change
  useEffect(() => {
    // Early return if already solved/revealed - this must be checked first
    if (isCrosswordClue || isSolved || isRevealed || !currentClue) {
      return;
    }
    
    const expectedAnswer = getExpectedResponse();
    if (expectedAnswer) {
      const state = verifyInputBox(userInput, expectedAnswer);
      setInputBoxState(state);
      
      if (state === InputBoxState.Completed) {
        // Reveal the exact expected answer when completed successfully
        setUserInput(expectedAnswer);
        setIsSolved(true);
        submitAnswer(currentClue.id, true);
        onCorrect();
      }
    }
  }, [userInput, isCrosswordClue, isSolved, isRevealed, currentClue, setInputBoxState, setIsSolved, setUserInput, getExpectedResponse, onCorrect]);

  // Check for solved state in crossword mode
  useEffect(() => {
    if (!currentClue || !normalizedAnswer || !isCrosswordClue || isSolved || isRevealed) return;
    
    const userInputNormalized = normalizeAnswer(userInput);
    if (userInputNormalized === normalizedAnswer && userInputNormalized.length === normalizedAnswer.length) {
      // For crossword mode, keep user input as-is (it's already correct)
      setIsSolved(true);
      submitAnswer(currentClue.id, true);
      onCorrect();
    }
  }, [userInput, normalizedAnswer, isCrosswordClue, isSolved, isRevealed, currentClue, setIsSolved, onCorrect]);

  const validateAndSubmit = async (beforeReveal: boolean = false) => {
    if (!currentClue) return false;
    
    const expectedResponse = getExpectedResponse();
    const isCorrect = checkAnswerCorrectness(
      beforeReveal ? userInput : (isCrosswordClue ? normalizedAnswer : expectedResponse),
      expectedResponse,
      isCrosswordClue,
      normalizedAnswer
    );
    
    if (beforeReveal) {
      await submitAnswer(currentClue.id, isCorrect);
      if (isCorrect) {
        onCorrect();
      } else {
        onIncorrect();
      }
    }
    
    return isCorrect;
  };

  return {
    validateAndSubmit,
  };
}

