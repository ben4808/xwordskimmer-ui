import { useEffect } from 'react';
import { ClueWithProgress } from 'cruzi-models';
import { InputBoxState } from '../../models/InputBoxState';
import { verifyInputBox } from '../../lib/utils';

interface UseAnswerValidationParams {
  currentClue: ClueWithProgress | undefined;
  userInput: string;
  isSolved: boolean;
  isRevealed: boolean;
  setInputBoxState: (state: InputBoxState) => void;
  setIsSolved: (solved: boolean) => void;
  setUserInput: (input: string) => void;
  getExpectedResponse: () => string;
  onCorrect: () => void;
}

export function useAnswerValidation({
  currentClue,
  userInput,
  isSolved,
  isRevealed,
  setInputBoxState,
  setIsSolved,
  setUserInput,
  getExpectedResponse,
  onCorrect,
}: UseAnswerValidationParams) {
  useEffect(() => {
    if (isSolved || isRevealed || !currentClue) {
      return;
    }

    const expectedAnswer = getExpectedResponse();
    if (expectedAnswer) {
      const state = verifyInputBox(userInput, expectedAnswer);
      setInputBoxState(state);

      if (state === InputBoxState.Completed) {
        setUserInput(expectedAnswer);
        setIsSolved(true);
        onCorrect();
      }
    }
  }, [
    userInput,
    isSolved,
    isRevealed,
    currentClue,
    setInputBoxState,
    setIsSolved,
    setUserInput,
    getExpectedResponse,
    onCorrect,
  ]);
}
