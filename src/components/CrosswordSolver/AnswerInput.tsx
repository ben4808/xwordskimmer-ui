import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import styles from './CrosswordSolver.module.scss';
import { DisplaySlot, isUserInputValidSoFar } from './crosswordSolverHelpers';

interface AnswerInputProps {
  answer: string;
  displaySlots: DisplaySlot[];
  userInput: string;
  revealedMask: boolean[];
  isSolved: boolean;
  clueId?: string;
  compact?: boolean;
  active?: boolean;
  nytDebut?: boolean;
  onUserInputChange: (value: string) => void;
  onHint?: () => void;
  onActivate?: () => void;
}

export interface AnswerInputHandle {
  focus: () => void;
}

export const AnswerInput = forwardRef<AnswerInputHandle, AnswerInputProps>(
  function AnswerInput(
    {
      answer,
      displaySlots,
      userInput,
      revealedMask,
      isSolved,
      clueId,
      compact = false,
      active = true,
      nytDebut = false,
      onUserInputChange,
      onHint,
      onActivate,
    },
    ref
  ) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocus = !isSolved && (!compact || active);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input || input.disabled) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, []);

  useImperativeHandle(ref, () => ({ focus: focusInput }), [focusInput]);

  useLayoutEffect(() => {
    if (!shouldFocus) return;
    focusInput();
  }, [clueId, isSolved, shouldFocus, focusInput]);

  const enforceCursorAtEnd = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const end = userInput.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) {
      input.setSelectionRange(end, end);
    }
  }, [userInput.length]);

  useEffect(() => {
    if (!shouldFocus) return;
    enforceCursorAtEnd();
  }, [userInput, shouldFocus, enforceCursorAtEnd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSolved) return;
    if (compact && !active) {
      onActivate?.();
      e.target.value = userInput;
      return;
    }

    const next = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, answer.length);

    if (next === userInput) return;

    if (
      next.length === userInput.length + 1 &&
      next.startsWith(userInput)
    ) {
      onUserInputChange(next);
      return;
    }

    if (next.length < userInput.length && userInput.startsWith(next)) {
      onUserInputChange(next);
      return;
    }

    e.target.value = userInput;
    enforceCursorAtEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSolved) {
      e.preventDefault();
      return;
    }
    if (compact && !active) {
      onActivate?.();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onHint?.();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home') {
      e.preventDefault();
      enforceCursorAtEnd();
    }
  };

  const caretSlotIndex = useMemo(() => {
    if (!shouldFocus) return -1;
    const activeLetterIndex = userInput.length;
    return displaySlots.findIndex(
      (slot) => slot.isLetter && slot.letterIndex === activeLetterIndex
    );
  }, [displaySlots, shouldFocus, userInput.length]);

  const typedIsValid = isUserInputValidSoFar(userInput, answer);

  const getLetterCellChar = (letterIndex: number): string => {
    if (isSolved) return answer[letterIndex] ?? '•';
    if (userInput[letterIndex]) return userInput[letterIndex];
    if (revealedMask[letterIndex]) return answer[letterIndex] ?? '•';
    return '•';
  };

  const getLetterCellClassName = (letterIndex: number): string => {
    if (isSolved) return nytDebut ? styles.typedDebut : styles.typedCorrect;

    const typed = userInput[letterIndex];
    if (typed) {
      return typedIsValid ? styles.typedCorrect : styles.typedIncorrect;
    }
    if (revealedMask[letterIndex]) return styles.revealedChar;
    return styles.previewChar;
  };

  const activateAndFocus = () => {
    if (isSolved) return;
    if (compact && !active) {
      onActivate?.();
    }
    focusInput();
  };

  return (
    <div
      className={`${styles.answerInputContainer} ${compact ? styles.compactAnswerInput : ''} ${isSolved ? styles.solvedAnswerInput : ''}`}
      onMouseDown={(event) => {
        if (isSolved) return;
        event.preventDefault();
        activateAndFocus();
      }}
    >
      <div className={styles.answerDisplay} aria-hidden="true">
        {displaySlots.map((slot, index) => {
          if (!slot.isLetter) {
            return (
              <span key={index} className={styles.separatorCell}>
                <span className={styles.separatorChar}>{slot.char}</span>
              </span>
            );
          }

          const letterIndex = slot.letterIndex!;
          const cellChar = getLetterCellChar(letterIndex);
          const showCaret = index === caretSlotIndex;

          return (
            <span key={index} className={styles.charCell}>
              <span
                className={`${styles.cellChar} ${getLetterCellClassName(letterIndex)}`}
              >
                {cellChar}
              </span>
              {showCaret && (
                <span className={styles.inputCaret} aria-hidden="true" />
              )}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="text"
        className={styles.hiddenInput}
        value={userInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={enforceCursorAtEnd}
        onClick={enforceCursorAtEnd}
        onFocus={() => {
          if (!isSolved && compact && !active) {
            onActivate?.();
          }
          enforceCursorAtEnd();
        }}
        disabled={isSolved}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label="Crossword answer"
      />
    </div>
  );
  }
);
