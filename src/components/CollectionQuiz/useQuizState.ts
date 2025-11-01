import { useState, useEffect, useRef } from 'react';
import { Clue } from '../../models/Clue';
import { InputBoxState } from '../../models/InputBoxState';

interface UseQuizStateParams {
  currentClue: Clue | undefined;
  currentIndex: number;
  allUserInput: Record<number, string>;
  isCrosswordClue: boolean;
  normalizedAnswer: string;
}

/**
 * Custom hook for managing quiz state (input, solved, revealed, etc.)
 */
export function useQuizState({
  currentClue,
  currentIndex,
  allUserInput,
  isCrosswordClue,
  normalizedAnswer,
}: UseQuizStateParams) {
  const [userInput, setUserInput] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [inputBoxState, setInputBoxState] = useState<InputBoxState>(InputBoxState.Correct);
  const [isSolved, setIsSolved] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nonCrosswordInputRef = useRef<HTMLInputElement>(null);

  // Initialize state when a new clue is selected
  useEffect(() => {
    const savedInput = allUserInput[currentIndex] || '';
    setUserInput(savedInput);
    // Always reset solved/revealed when moving to a new clue
    setIsSolved(false);
    setIsRevealed(false);
    setInputBoxState(InputBoxState.Correct);

    if (isCrosswordClue) {
      const timer = setTimeout(() => {
        setFocusedIndex(0);
        inputRefs.current[0]?.focus();
        inputRefs.current[0]?.select();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        nonCrosswordInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
    // Only depend on currentIndex and isCrosswordClue, not allUserInput
    // This prevents the effect from running when we save the revealed answer
  }, [currentIndex, isCrosswordClue]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeFocusedIndex = (index: number) => {
    if (isCrosswordClue && index >= 0 && normalizedAnswer && index < normalizedAnswer.length) {
      setFocusedIndex(index);
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  };

  return {
    userInput,
    setUserInput,
    focusedIndex,
    setFocusedIndex,
    inputBoxState,
    setInputBoxState,
    isSolved,
    setIsSolved,
    isRevealed,
    setIsRevealed,
    inputRefs,
    nonCrosswordInputRef,
    changeFocusedIndex,
  };
}

