import React, { useCallback, useEffect, useRef } from 'react';
import styles from './CrosswordSolver.module.scss';
import { isUserInputValidSoFar } from './crosswordSolverHelpers';

interface AnswerInputProps {
  answer: string;
  userInput: string;
  revealedMask: boolean[];
  isSolved: boolean;
  onUserInputChange: (value: string) => void;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  answer,
  userInput,
  revealedMask,
  isSolved,
  onUserInputChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const enforceCursorAtEnd = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const end = userInput.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) {
      input.setSelectionRange(end, end);
    }
  }, [userInput.length]);

  useEffect(() => {
    enforceCursorAtEnd();
  }, [userInput, enforceCursorAtEnd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSolved) return;

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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home') {
      e.preventDefault();
      enforceCursorAtEnd();
    }
  };

  const typedValid =
    userInput.length > 0 && isUserInputValidSoFar(userInput, answer);
  const typedInvalid = userInput.length > 0 && !typedValid;

  const getPreviewChar = (index: number): string => {
    if (isSolved) return answer[index] ?? '•';
    if (revealedMask[index]) return answer[index] ?? '•';
    return '•';
  };

  /** User-typed overlay only; revealed hints stay in the preview layer. */
  const getDisplayChar = (index: number): string | null => {
    if (isSolved) return answer[index] ?? null;
    if (userInput[index]) return userInput[index];
    return null;
  };

  return (
    <div
      className={styles.answerInputContainer}
      onClick={() => inputRef.current?.focus()}
    >
      <div className={styles.answerDisplay} aria-hidden="true">
        {answer.split('').map((_, index) => {
          const displayChar = getDisplayChar(index);
          const previewChar = getPreviewChar(index);
          const showUserChar = Boolean(userInput[index]) && !isSolved;

          return (
            <span key={index} className={styles.charCell}>
              <span className={styles.previewChar}>{previewChar}</span>
              {displayChar && (
                <span
                  className={`${styles.typedChar} ${
                    isSolved
                      ? styles.typedCorrect
                      : showUserChar && typedValid
                        ? styles.typedCorrect
                        : showUserChar && typedInvalid
                          ? styles.typedIncorrect
                          : styles.revealedChar
                  }`}
                >
                  {displayChar}
                </span>
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
        onFocus={enforceCursorAtEnd}
        disabled={isSolved}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label="Crossword answer"
      />
    </div>
  );
};
