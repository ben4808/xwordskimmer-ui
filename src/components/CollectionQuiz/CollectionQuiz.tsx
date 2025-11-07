import React, { useState, useEffect, useMemo, useRef} from 'react';
import styles from './CollectionQuiz.module.scss';
import { CollectionQuizProps } from './CollectionQuizProps';
import { replaceCharAtIndex, getTextWidth } from '../../lib/utils';
import { normalizeAnswer } from './quizHelpers';
import { InputBoxState } from '../../models/InputBoxState';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useClueData } from './useClueData';
import { useAnswerValidation } from './useAnswerValidation';
import { useClueText } from './useClueText';
import { CrosswordInputs } from './CrosswordInputs';
import { NonCrosswordInput } from './NonCrosswordInput';
import { ClueProgressData } from '../../models/ClueProgressData';
import CruziApi from '../../api/CruziApi';

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
  
  // Clue text - MUST be calculated before quiz state to get expectedResponse
  const { clueText, translatedClue, expectedResponse } = useClueText(currentClue, user, currentIndex);
  
  // Quiz state management
  const [userInput, setUserInput] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [inputBoxState, setInputBoxState] = useState<InputBoxState>(InputBoxState.Partial);
  const [isSolved, setIsSolved] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [inputWidth, setInputWidth] = useState<number>(200); // Default width
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nonCrosswordInputRef = useRef<HTMLInputElement>(null);

  // Initialize state when a new clue is selected
  useEffect(() => {
    const savedInput = allUserInput[currentIndex] || '';
    setUserInput(savedInput);
    // Always reset solved/revealed when moving to a new clue
    setIsSolved(false);
    setIsRevealed(false);
    setInputBoxState(InputBoxState.Partial);

    // Calculate input width based on expected response (only for non-crossword clues)
    if (!isCrosswordClue && expectedResponse) {
      const textWidth = getTextWidth(expectedResponse, 1.5, 'Verdana, sans-serif');
      setInputWidth(textWidth + 20);
    }

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
  }, [currentIndex, isCrosswordClue, expectedResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeFocusedIndex = (index: number) => {
    if (isCrosswordClue && index >= 0 && normalizedAnswer && index < normalizedAnswer.length) {
      setFocusedIndex(index);
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  };
  
  // Score tracking (merged from useScoreTracking)
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const incrementCorrect = () => setCorrectAnswers(prev => prev + 1);
  const incrementIncorrect = () => setIncorrectAnswers(prev => prev + 1);
  
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
    onCorrect: () => {
      incrementCorrect();
      // Submit correct response to API (only if user is logged in)
      if (user && currentClue?.id && clueCollection?.id) {
        CruziApi.submitUserResponse(currentClue.id.toString(), clueCollection.id.toString(), true).catch(err => {
          console.error('Error submitting correct response:', err);
        });
      }
    },
    onIncorrect: () => {
      incrementIncorrect();
      // Submit incorrect response to API (only if user is logged in)
      if (user && currentClue?.id && clueCollection?.id) {
        CruziApi.submitUserResponse(currentClue.id.toString(), clueCollection.id.toString(), false).catch(err => {
          console.error('Error submitting incorrect response:', err);
        });
      }
    },
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

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  
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

  const revealAnswer = () => {
    if (isRevealed || isSolved) return;
    
    // Get the correct expected response based on mode
    // For crossword: use normalizedAnswer
    // For non-crossword: use expectedResponse which comes from clueText hook
    const fullAnswer = isCrosswordClue ? normalizedAnswer : expectedResponse;
    
    // Set userInput to the full answer so it appears in the input box
    setUserInput(fullAnswer || '');
    setAllUserInput(prev => ({ ...prev, [currentIndex]: fullAnswer || '' }));
    
    // Set revealed and solved state
    setIsRevealed(true);
    setIsSolved(true);
    setInputBoxState(InputBoxState.Completed);
    
    // According to requirements: if user has to press Reveal, it's incorrect
    incrementIncorrect();
    // Submit incorrect response to API (only if user is logged in)
    if (user && currentClue?.id && clueCollection?.id) {
      CruziApi.submitUserResponse(currentClue.id.toString(), clueCollection.id.toString(), false).catch(err => {
        console.error('Error submitting incorrect response:', err);
      });
    }
  };

  // Load next batch when reaching the last clue of current batch
  useEffect(() => {
    if (currentIndex === allClues.length - 1 && !isLoadingNextBatch && allClues.length > 0) {
      loadNextBatch();
    }
  }, [currentIndex, allClues.length, isLoadingNextBatch, loadNextBatch]);

  const nextClue = () => {
    setAllUserInput(prev => ({ ...prev, [currentIndex]: userInput }));
    const nextIndex = currentIndex + 1;
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
      // Show toast notification
      setToastMessage('Copied to clipboard');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // --- Render Helpers ---
  
  const fillInBlankPattern = /\{\{([^}]+)\}\}/i;
  const hasFillInBlank = fillInBlankPattern.test(clueText);

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
      {/* Score boxes and Progress bar container */}
      <div className={styles.scoreAndProgressContainer}>
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
        {user && (() => {
          // If no progress data, assume 0 correct, 0 incorrect, and 2 correct answers needed
          const progressData = currentClue.progressData as ClueProgressData | undefined;
          const correctSolves = progressData?.correctSolves ?? 0;
          const correctSolvesNeeded = progressData?.correctSolvesNeeded ?? 2;
          const progressPercent = correctSolvesNeeded > 0
            ? Math.min(100, (correctSolves / correctSolvesNeeded) * 100)
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
      </div>

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
            inputRef={nonCrosswordInputRef}
            onChange={handleNonCrosswordInputChange}
            onKeyDown={handleNonCrosswordKeyDown}
            showFillInBlank={true}
            inputWidth={inputWidth}
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
            inputRef={nonCrosswordInputRef}
            onChange={handleNonCrosswordInputChange}
            onKeyDown={handleNonCrosswordKeyDown}
            showFillInBlank={false}
            inputWidth={inputWidth}
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

      {/* Toast Notification */}
      {showToast && (
        <div className={styles.toast}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default CollectionQuiz;
