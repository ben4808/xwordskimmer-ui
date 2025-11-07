import React from 'react';
import styles from './CollectionQuiz.module.scss';
import { breakTextIntoLines, replaceCharAtIndex } from '../../lib/utils';

interface CrosswordInputsProps {
  displayText: string;
  normalizedAnswer: string;
  userInput: string;
  focusedIndex: number | null;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  onFocus: (index: number) => void;
}

export const CrosswordInputs: React.FC<CrosswordInputsProps> = ({
  displayText,
  normalizedAnswer,
  userInput,
  focusedIndex,
  inputRefs,
  onChange,
  onKeyDown,
  onFocus,
}) => {
  const segments: JSX.Element[] = [];
  let letterIndex = 0;

  breakTextIntoLines(displayText, 8).forEach((line, lineIndex) => {
    segments.push(
      <div key={`line-${lineIndex}`} className={styles.wordGroup}>
        {[...line].map((charItem, charDisplayIndex) => {
          const charIsLetter = /[A-Z0-9]/.test(charItem.toUpperCase());

          if (!charIsLetter) {
            return (
              <div key={`space-${lineIndex}-${charDisplayIndex}`} className={styles.spaceBox}>
                <span className={styles.space}>{charItem}</span>
              </div>
            );
          }

          const currentLetterIndex = letterIndex++;
          const inputChar = userInput[currentLetterIndex]?.toUpperCase() || '';
          const correctChar = normalizedAnswer[currentLetterIndex]?.toUpperCase();
          const isCorrect = inputChar === correctChar;
          const isIncorrect = inputChar !== '' && inputChar !== correctChar;
          const isFocused = focusedIndex === currentLetterIndex;
          const allCorrect = userInput.toUpperCase() === normalizedAnswer;

          return (
            <div
              key={currentLetterIndex}
              className={styles.letterBox}
              onClick={() => onFocus(currentLetterIndex)}
            >
              <input
                ref={(el) => (inputRefs.current[currentLetterIndex] = el)}
                type="text"
                maxLength={1}
                value={inputChar.trim()}
                onChange={(e) => onChange(currentLetterIndex, e.target.value)}
                onKeyDown={(e) => onKeyDown(e, currentLetterIndex)}
                onFocus={() => onFocus(currentLetterIndex)}
                className={`${styles.letterInput} ${isCorrect || allCorrect ? styles.correct : ''} ${isIncorrect ? styles.incorrect : ''} ${allCorrect ? styles.allCorrect : ''}`}
                aria-label={`Letter input ${currentLetterIndex + 1}`}
                spellCheck={false}
              />
            </div>
          );
        })}
      </div>
    );
  });

  return (
    <div className={styles.inputGridContainer}>
      {segments}
    </div>
  );
};
