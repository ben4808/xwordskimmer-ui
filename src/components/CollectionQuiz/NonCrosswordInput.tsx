import React from 'react';
import styles from './CollectionQuiz.module.scss';
import { InputBoxState } from '../../models/InputBoxState';

interface NonCrosswordInputProps {
  clueText: string;
  userInput: string;
  inputBoxState: InputBoxState;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showFillInBlank: boolean;
  inputWidth: number;
}

export const NonCrosswordInput: React.FC<NonCrosswordInputProps> = ({
  clueText,
  userInput,
  inputBoxState,
  inputRef,
  onChange,
  onKeyDown,
  showFillInBlank,
  inputWidth,
}) => {
  const isIncorrect = inputBoxState === InputBoxState.Incorrect;
  const isCompleted = inputBoxState === InputBoxState.Completed;
  const isPartial = inputBoxState === InputBoxState.Partial;

  if (showFillInBlank && clueText) {
    // Render fill-in-the-blank input in place
    const fillInBlankPattern = /\{\{([^}]+)\}\}/i;
    const match = clueText.match(fillInBlankPattern);
    if (match && match.index !== undefined) {
      const before = clueText.substring(0, match.index);
      const after = clueText.substring(match.index + match[0].length);
      
      return (
        <div className={styles.fillInBlankContainer}>
          <div className={styles.fillInBlankText}>
            {before}
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={onChange}
              onKeyDown={onKeyDown}
              className={`${styles.fillInBlankInput} ${isIncorrect ? styles.incorrect : ''} ${isCompleted ? styles.completed : ''} ${isPartial ? styles.partial : ''}`}
              style={{ width: `${inputWidth}px` }}
              aria-label="Fill in the blank"
            />
            {after}
          </div>
        </div>
      );
    }
    
    // If pattern match failed, show clue text above regular input as fallback
    return (
      <>
        <div className={styles.clueText}>
          {clueText}
        </div>
        <div className={styles.nonCrosswordContainer}>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={onChange}
            onKeyDown={onKeyDown}
            className={`${styles.nonCrosswordInput} ${isIncorrect ? styles.incorrect : ''} ${isCompleted ? styles.completed : ''} ${isPartial ? styles.partial : ''}`}
            style={{ width: `${inputWidth}px` }}
            aria-label="Answer input field"
          />
        </div>
      </>
    );
  }

  // Regular input field (below clue)
  return (
    <div className={styles.nonCrosswordContainer}>
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={`${styles.nonCrosswordInput} ${isIncorrect ? styles.incorrect : ''} ${isCompleted ? styles.completed : ''} ${isPartial ? styles.partial : ''}`}
        style={{ width: `${inputWidth}px` }}
        aria-label="Answer input field"
      />
    </div>
  );
};

