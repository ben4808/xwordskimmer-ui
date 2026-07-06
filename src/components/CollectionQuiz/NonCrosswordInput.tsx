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

const AnswerInputForm: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <form
    autoComplete="off"
    onSubmit={(e) => e.preventDefault()}
    className={styles.answerForm}
  >
    {children}
  </form>
);

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

  const renderInput = (
    className: string,
    ariaLabel: string,
    autoCapitalize: 'sentences' | 'none'
  ) => (
    <AnswerInputForm>
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={className}
        style={{ width: `${inputWidth}px` }}
        aria-label={ariaLabel}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize={autoCapitalize}
        spellCheck={false}
      />
    </AnswerInputForm>
  );

  if (showFillInBlank && clueText) {
    const fillInBlankPattern = /\{\{([^}]+)\}\}/i;
    const match = clueText.match(fillInBlankPattern);
    if (match && match.index !== undefined) {
      const before = clueText.substring(0, match.index);
      const after = clueText.substring(match.index + match[0].length);
      const blankIsSentenceStart = !before.trim();

      return (
        <div className={styles.fillInBlankContainer}>
          <div className={styles.fillInBlankText}>
            {before}
            {renderInput(
              `${styles.fillInBlankInput} ${!userInput ? styles.isEmpty : ''} ${isIncorrect ? styles.incorrect : ''} ${isCompleted ? styles.completed : ''} ${isPartial ? styles.partial : ''}`,
              'Fill in the blank',
              blankIsSentenceStart ? 'sentences' : 'none'
            )}
            {after}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={styles.clueText}>{clueText}</div>
        <div className={styles.nonCrosswordContainer}>
          {renderInput(
            `${styles.nonCrosswordInput} ${isIncorrect ? styles.incorrect : ''} ${isCompleted ? styles.completed : ''} ${isPartial ? styles.partial : ''}`,
            'Answer input field',
            'sentences'
          )}
        </div>
      </>
    );
  }

  return (
    <div className={styles.nonCrosswordContainer}>
      {renderInput(
        `${styles.nonCrosswordInput} ${isIncorrect ? styles.incorrect : ''} ${isCompleted ? styles.completed : ''} ${isPartial ? styles.partial : ''}`,
        'Answer input field',
        'sentences'
      )}
    </div>
  );
};
