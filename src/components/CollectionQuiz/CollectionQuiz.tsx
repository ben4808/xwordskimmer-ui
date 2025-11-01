/**
 * Collection Quiz Component Requirements
 * 
 * Tech Stack: React + TypeScript, SCSS modules, Dark Mode UI, Google OAuth with JWT auth
 * 
 * Page: /quiz/<collectionId>
 * 
 * Data Loading:
 * - Fetch clues via getCollectionBatch API (initial batch: <=20 clues)
 * - When user hits the end of the batch (is on the last clue), load next batch in background
 * 
 * Layout (top to bottom):
 * 1. Session score boxes (side by side):
 *    - Correct: dark green border, super dark green background, no label
 *    - Incorrect: dark red border, super dark red background, no label
 * 
 * 2. Progress bar (if user logged in):
 *    - Current clue only (not session)
 *    - Green = correct responses, gray = remaining needed
 *    - No labels
 * 
 * 3. Clue display/input area (format depends on isCrosswordCollection flag
 *      and whether there is a fill-in-the-blank section in the clue text)
 * 
 * 4. Action buttons: Reveal → Next + Explain
 * 
 * Non-Crossword Mode (isCrosswordCollection = false):
 * - Clue text:
 *   • Custom clue OR random example sentence from sense (use translation matching clue language)
 *   • If clue text has fill-in-the-blank section, i.e. {{response}} pattern, 
 *       that section is replaced inline with input box. The text inside the double brackets
 *       (e.g., "name" in {{name}}) is the expected response for the input box.
 *   • If no double brackets, show input box below clue and translated clue, and the expected 
 *       response is the display text of the entry for the clue (not entry.entry).
 * - Translated clue: Show below the main clue text in smaller text
 *   • If there is a custom clue, no translated clue is shown.
 *   • If there is no custom clue, show the translation of the used example sentence in the native
 *       language of the user, or if there is no user, the English translation.
 * - The input box is adapted to the width of the expected response text. This width changes with
 *     every new clue that is shown.
 * - Input validation:
 *   • Validate input as a whole after every keystroke: correct = dark green, incorrect = dark red
 *   • Use the verifyInputBox function in lib/utils.ts to validate the input.
 *   • When validation shows "Completed", the entire input box gets a dark green background.
 * 
 * Crossword Mode (isCrosswordCollection = true):
 * - Clue text: Display custom clue text
 * - Input boxes:
 *   • One box per alphanumeric character (A-Z, 0-9)
 *   • Special chars/spaces displayed directly (no input box)
 *   • Click to activate box
 *   • Type letter → replaces letter, advances to next box
 *   • Backspace → clears letter, moves to previous box
 *   • Arrow keys navigate between boxes
 *   • Validation per box: correct = dark green letter, incorrect = dark red letter
 *   • When all correct, all boxes get dark green background
 * 
 * Action Buttons:
 * - Reveal: Reveals correct answer (Enter key also triggers)
 * - Next: Appears after reveal OR when answer is fully correct (Enter key also triggers)
 * - Explain: Copies AI explanation prompt to clipboard (prompt loaded from file, not hardcoded)
 *   • Explain button is shown beside the Next button and only when the Next button is visible.
 * 
 * User interaction flow:
 * - User sees clue text and input area
 * - User types input, and either completes the input sucessfully or reveals the correct answer
 * - If the input is completed successfully, the correct count is incremented and if the user has
 *     to press Reveal, the incorrect count is incremented.
 * - Either way, after pressing Reveal or completing the input box successfully, the correct answer is
 *     revealed in the input box and the Next and Explain buttons are shown.
 * - The user presses Next and sees the next clue and input area.
 * - User repeats process, eventually a new batch of clues is loaded and the process repeats.
 * - User can click Explain button to copy AI explanation prompt to clipboard
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './CollectionQuiz.module.scss';
import { CollectionQuizProps } from './CollectionQuizProps';
import { replaceCharAtIndex, getTextWidth } from '../../lib/utils';
import { normalizeAnswer, getExpectedResponse, submitAnswer } from './quizHelpers';
import { InputBoxState } from '../../models/InputBoxState';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useClueData } from './useClueData';
import { useQuizState } from './useQuizState';
import { useAnswerValidation } from './useAnswerValidation';
import { useClueText } from './useClueText';
import { CrosswordInputs } from './CrosswordInputs';
import { NonCrosswordInput } from './NonCrosswordInput';
import { ClueProgressData } from '../../models/ClueProgressData';

const CollectionQuiz = (props: CollectionQuizProps) => {
  // --- Hooks (all called unconditionally at top level) ---
  const { user } = useAuth();
  const { setCurrentCollection } = useCollection();
  const { clueCollection } = props;
  
  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allUserInput, setAllUserInput] = useState<Record<number, string>>({});
  
  // Data loading
  const { allClues, isLoading, isLoadingNextBatch, loadNextBatch } = useClueData(clueCollection);
  
  // Derived state
  const currentClue = allClues[currentIndex];
  const isCrosswordClue = clueCollection?.isCrosswordCollection || false;
  const rawAnswer = currentClue?.entry?.entry;
  const normalizedAnswer = useMemo(() => normalizeAnswer(rawAnswer), [rawAnswer]);
  const displayText = currentClue?.entry?.displayText || rawAnswer || '';
  
  // Quiz state management
  const quizState = useQuizState({
    currentClue,
    currentIndex,
    allUserInput,
    isCrosswordClue,
    normalizedAnswer,
  });
  
  const {
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
  } = quizState;
  
  // Score tracking (merged from useScoreTracking)
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const incrementCorrect = () => setCorrectAnswers(prev => prev + 1);
  const incrementIncorrect = () => setIncorrectAnswers(prev => prev + 1);
  
  // Clue text
  const { clueText, translatedClue, expectedResponse } = useClueText(currentClue, user, currentIndex);
  
  // Answer validation
  useAnswerValidation({
    currentClue,
    userInput,
    isCrosswordClue,
    normalizedAnswer,
    isSolved,
    isRevealed,
    setInputBoxState,
    setIsSolved,
    setUserInput,
    getExpectedResponse: () => expectedResponse,
    onCorrect: incrementCorrect,
    onIncorrect: incrementIncorrect,
  });
  
  // Explain prompt (merged from useExplainPrompt)
  const [explainPrompt, setExplainPrompt] = useState<string>('');
  useEffect(() => {
    const loadExplainPrompt = async () => {
      try {
        const response = await fetch('/explain_prompt.txt');
        if (response.ok) {
          const text = await response.text();
          setExplainPrompt(text);
        }
      } catch (error) {
        console.error('Error loading explain prompt:', error);
        setExplainPrompt('');
      }
    };
    loadExplainPrompt();
  }, []);
  
  // Set current collection in context
  useEffect(() => {
    setCurrentCollection(clueCollection);
    
    return () => {
      setCurrentCollection(null);
    };
  }, [clueCollection, setCurrentCollection]);

  // --- Event Handlers ---
  
  const handleCrosswordInputChange = (index: number, value: string) => {
    if (isSolved || isRevealed || !normalizedAnswer) return;
    const upperValue = value.toUpperCase();
    if (/^[A-Z0-9]$/.test(upperValue) || value === '') {
      let newUserInput = replaceCharAtIndex(userInput, upperValue, index);
      setUserInput(newUserInput);
      setAllUserInput(prev => ({ ...prev, [currentIndex]: newUserInput }));

      if (upperValue && index < normalizedAnswer.length - 1) {
        const nextIndex = index + 1;
        changeFocusedIndex(nextIndex);
      }
    }
  };

  const handleNonCrosswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSolved || isRevealed) return;
    const value = e.target.value;
    setUserInput(value);
    setAllUserInput(prev => ({ ...prev, [currentIndex]: value }));
  };

  const handleNonCrosswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isSolved || isRevealed) {
        nextClue();
      } else {
        revealAnswer();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (!isCrosswordClue || focusedIndex === null || !normalizedAnswer) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isSolved && !isRevealed) {
          revealAnswer();
        } else {
          nextClue();
        }
      }
      return;
    }
    
    const len = normalizedAnswer.length;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isSolved && !isRevealed) {
        revealAnswer();
      } else {
        nextClue();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newIndex = Math.max(0, focusedIndex - 1);
      changeFocusedIndex(newIndex);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newIndex = Math.min(len - 1, focusedIndex + 1);
      changeFocusedIndex(newIndex);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const newInput = replaceCharAtIndex(userInput, '', index);
      const newIndex = Math.max(0, index - 1);
      changeFocusedIndex(newIndex);
      setUserInput(newInput);
      setAllUserInput(prev => ({ ...prev, [currentIndex]: newInput }));
    }
  };

  const revealAnswer = async () => {
    if (isRevealed || isSolved) return;
    
    // Get expected response according to priority list
    const fullAnswer = isCrosswordClue ? normalizedAnswer : expectedResponse;
    
    // Check if user's answer was correct (before reveal) for API submission
    const normalizedInput = normalizeAnswer(userInput);
    const normalizedExpected = isCrosswordClue 
      ? normalizedAnswer 
      : normalizeAnswer(expectedResponse);
    const isCorrect = normalizedInput === normalizedExpected;
    
    // Set all state updates together - React will batch them
    setIsRevealed(true);
    setIsSolved(true);
    setInputBoxState(InputBoxState.Completed);
    setUserInput(fullAnswer || '');
    setAllUserInput(prev => ({ ...prev, [currentIndex]: fullAnswer || '' }));
    
    // Submit user response to API
    await submitAnswer(currentClue?.id, isCorrect);
    
    // According to requirements: if user has to press Reveal, it's incorrect
    incrementIncorrect();
  };

  const nextClue = () => {
    setAllUserInput(prev => ({ ...prev, [currentIndex]: userInput }));
    const nextIndex = currentIndex + 1;
    
    // If we're on the last clue, load next batch in background
    if (nextIndex >= allClues.length && !isLoadingNextBatch) {
      loadNextBatch();
    }
    
    setCurrentIndex(nextIndex);
    setIsRevealed(false);
  };

  const handleExplain = async () => {
    if (!explainPrompt || !currentClue) return;
    
    try {
      // Replace placeholders in the prompt
      const filledPrompt = explainPrompt
        .replace('{CLUE_TEXT}', clueText)
        .replace('{ANSWER_TEXT}', expectedResponse);
      
      await navigator.clipboard.writeText(filledPrompt);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // --- Render Helpers ---
  
  const fillInBlankPattern = /\{\{([^}]+)\}\}/i;
  const hasFillInBlank = fillInBlankPattern.test(clueText);
  
  // Calculate input width based on expected response text
  // Width adapts to expected response text and changes with every new clue
  const [inputWidth, setInputWidth] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (!expectedResponse || !currentClue) {
      setInputWidth(undefined);
      return;
    }
    
    // Calculate width after DOM is ready
    const calculateWidth = () => {
      try {
        const textWidth = getTextWidth(expectedResponse, 1.5, 'Verdana, sans-serif');
        if (textWidth === 0) {
          // If calculation fails, retry after a short delay
          setTimeout(calculateWidth, 50);
          return;
        }
        // Add padding based on input type:
        // - fillInBlankInput: 0.5rem padding each side = 1rem total
        // - nonCrosswordInput: 0.75rem padding each side = 1.5rem total
        // Use 1.5rem (0.75rem each side) to accommodate both
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const paddingWidth = 1.5 * rootFontSize; // 1.5rem total padding (0.75rem each side)
        // Ensure minimum width based on min-width in SCSS
        const calculatedWidth = textWidth + paddingWidth;
        const minWidth = 150; // Match min-width from SCSS for fill-in-blank
        setInputWidth(`${Math.max(calculatedWidth, minWidth)}px`);
      } catch (error) {
        console.error('Error calculating input width:', error);
        setInputWidth(undefined);
      }
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(calculateWidth, 0);
    return () => clearTimeout(timer);
  }, [expectedResponse, currentIndex, currentClue]);

  // --- Data and Guard Clauses ---
  if (!clueCollection || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>Loading clues...</div>
      </div>
    );
  }

  if (allClues.length === 0 || !currentClue) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>No clues available</div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className={styles.container}>
      {/* Score boxes (merged from ScoreBoxes) */}
      <div className={styles.scoreBoxes}>
        <div className={`${styles.scoreBox} ${styles.scoreBoxCorrect}`}>
          <div className={styles.scoreValue}>{correctAnswers}</div>
        </div>
        <div className={`${styles.scoreBox} ${styles.scoreBoxIncorrect}`}>
          <div className={styles.scoreValue}>{incorrectAnswers}</div>
        </div>
      </div>

      {/* Progress bar (merged from ProgressBar) */}
      {user && currentClue.progressData && (() => {
        const progressData = currentClue.progressData as ClueProgressData;
        const progressPercent = progressData.correctSolvesNeeded > 0
          ? Math.min(100, (progressData.correctSolves / progressData.correctSolvesNeeded) * 100)
          : 0;
        return (
          <div className={styles.progressBar}>
            <div className={styles.progressBarTrack}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        );
      })()}

      {isCrosswordClue ? (
        <>
          {/* Clue display (merged from ClueDisplay) */}
          {clueText && (
            <div className={styles.clueText}>
              {clueText}
            </div>
          )}
          <CrosswordInputs
            displayText={displayText}
            normalizedAnswer={normalizedAnswer}
            userInput={userInput}
            focusedIndex={focusedIndex}
            inputRefs={inputRefs}
            onChange={handleCrosswordInputChange}
            onKeyDown={handleKeyDown}
            onFocus={changeFocusedIndex}
          />
        </>
      ) : hasFillInBlank ? (
        <>
          <NonCrosswordInput
            clueText={clueText}
            userInput={userInput}
            inputBoxState={inputBoxState}
            inputWidth={inputWidth}
            inputRef={nonCrosswordInputRef}
            onChange={handleNonCrosswordInputChange}
            onKeyDown={handleNonCrosswordKeyDown}
            showFillInBlank={true}
          />
          {/* Translated clue (merged from ClueDisplay) */}
          {translatedClue && (
            <div className={styles.translatedClue}>
              {translatedClue}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Clue display (merged from ClueDisplay) */}
          {clueText && (
            <div className={styles.clueText}>
              {clueText}
            </div>
          )}
          {translatedClue && (
            <div className={styles.translatedClue}>
              {translatedClue}
            </div>
          )}
          <NonCrosswordInput
            clueText={clueText}
            userInput={userInput}
            inputBoxState={inputBoxState}
            inputWidth={inputWidth}
            inputRef={nonCrosswordInputRef}
            onChange={handleNonCrosswordInputChange}
            onKeyDown={handleNonCrosswordKeyDown}
            showFillInBlank={false}
          />
        </>
      )}

      {/* Action buttons (merged from ActionButtons) */}
      <div className={styles.buttonContainer}>
        {!isRevealed && !isSolved ? (
          <button onClick={revealAnswer} className={styles.revealButton}>
            Reveal
          </button>
        ) : (
          <div className={styles.nextButtonContainer}>
            <button onClick={nextClue} className={styles.nextButton}>
              Next
            </button>
            <button onClick={handleExplain} className={styles.explainButton}>
              Explain
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionQuiz;
