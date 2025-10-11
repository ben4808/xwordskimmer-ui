/**
Modify the code in this React component according to the given requirements and remove things 
not in the requirements. Assume that all other components are already in an optimal, working state.

General
- The site is built in React with Typescript.
- The entire site is responsive and works well on both phones and computers. 
- Each component includes an SCSS module and does not use Tailwind or any other additional CSS framework.
- The site supports login with Google OAuth and manages authentication with a JWT token. 
    The JWT token contains a custom claim for the currently logged in username.
- The site is styled in Dark Mode, using a standard Dark Mode color set with accent color 
    as a pleasing light blue.
- The header is part of the page and does not float on top of the screen.

Collection Quiz page (/quiz/<collectionId>)
- The first thing shown are a couple boxes indicating how many correct and incorrect answers 
    the user has given during the session. The correct answers box has a thin green border, and the 
    incorrect box a thin red border.
- Next is a progress bar, where green shows correct responses and gray shows responses still needed 
    to master the clue.
- Next is the clue text itself. If the clue has a fill-in-the-blank section, that section functions 
    as the input box for the user.
  - The component validates the user's input on each letter entered against the correct answer for the 
      entire clue. If the answer is "hello", typing "he" shows "he" in dark green, but typing "hi" 
      shows "hi" in dark red).
  - The input field is based on the entry's display text, which may include spaces or special characters. 
      However, the input validation should only enforce that the alphanumeric characters (A-Z, 0-9, 
      others depeding on the language) are in the correct order and should ignore case. 
  - In any case, when all the letters are correctly entered, the input field changes to a dark green 
      background.
- Next is shown in smaller text the translated clue if there is one for this clue.
- Next is an input box for clues without a fill-in-the-blank section. 
- Finally there is a submit button (pressing Enter with the input box focused does the same thing).
- After submit is pressed, the correct answer is revealed in the input box, the progress box is updated, 
    and the Submit button is changed to a "Next" button which takes the user to the next clue 
    (pressing Enter does the same thing).
- Beside the next button is an "Explain" button. Pressing this button copies to the clipboard an AI 
    prompt that will break down the clue word by word to help users understand.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faChevronLeft, faChevronRight, faInfoCircle, faLanguage, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './CollectionQuiz.module.scss';
import { CollectionQuizProps } from './CollectionQuizProps';
import { replaceCharAtIndex, breakTextIntoLines, getCruziScoreColor, getTextWidth, deepClone } from '../../lib/utils';
import { Clue } from '../../models/Clue';


const CollectionQuiz = (props: CollectionQuizProps) => {
  // --- State Management ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allUserInput, setAllUserInput] = useState<Record<number, string>>({});
  const [userInput, setUserInput] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [revealProgress, setRevealProgress] = useState<number>(0);
  const [isSolved, setIsSolved] = useState(false);
  const [randomizedClues, setRandomizedClues] = useState<Clue[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);

  // Refs for DOM elements and timers
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nonCrosswordInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // --- Derived State and Variables ---
  const { clueCollection } = props;
  const currentClue = randomizedClues[currentIndex];
  const isCrosswordClue = currentClue?.isCrosswordClue;
  const rawAnswer = currentClue?.entry.entry;
  const normalizedAnswer = rawAnswer?.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const displayText = currentClue?.entry.displayText || rawAnswer;

  // --- Utility Functions ---
  const randomizeClues = (clues: Clue[]) => {
    return clues.sort(() => Math.random() - 0.5);
  }

  const changeFocusedIndex = (index: number) => {
    if (isCrosswordClue && index >= 0 && normalizedAnswer && index < normalizedAnswer.length) {
      setFocusedIndex(index);
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  }

  const revealAnswer = () => {
    if (!isSolved) {
      const fullAnswer = isCrosswordClue ? normalizedAnswer : displayText;
      setUserInput(fullAnswer || '');
      setAllUserInput(prev => ({ ...prev, [currentIndex]: fullAnswer || '' }));
      setIsSolved(true);
      
      // Check if user's answer was correct
      const normalizedInput = userInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const isCorrect = normalizedInput === normalizedAnswer;
      if (isCorrect) {
        setCorrectAnswers(prev => prev + 1);
      } else {
        setIncorrectAnswers(prev => prev + 1);
      }
    }
  };

  const previousClue = () => {
    setAllUserInput(prev => ({ ...prev, [currentIndex]: userInput }));
    const prevIndex = (currentIndex - 1 + clueCollection.clues.length) % clueCollection.clues.length;
    setCurrentIndex(prevIndex);
  };

  const nextClue = () => {
    setAllUserInput(prev => ({ ...prev, [currentIndex]: userInput }));
    const nextIndex = (currentIndex + 1) % clueCollection.clues.length;
    setCurrentIndex(nextIndex);
  };

  const handleExplain = async () => {
    const prompt = `Please explain this crossword clue word by word to help me understand it better:

Clue: ${currentClue.clue}
Answer: ${currentClue.entry.entry}
${currentClue.entry.translation ? `Translation: ${currentClue.entry.translation}` : ''}

Please break down each word in the clue and explain how it relates to the answer.`;
    
    try {
      await navigator.clipboard.writeText(prompt);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // --- Event Handlers ---

  const handleCrosswordInputChange = (index: number, value: string) => {
    if (isSolved || !normalizedAnswer) return;
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
    if (isSolved) return;
    const value = e.target.value;
    setUserInput(value);
    setAllUserInput(prev => ({ ...prev, [currentIndex]: value }));
    
    // Check if answer is correct and update scores
    const normalizedInput = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const isCorrect = normalizedInput === normalizedAnswer;
    if (isCorrect && normalizedInput.length === normalizedAnswer.length) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleNonCrosswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isSolved) {
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
        if (!isSolved) {
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
      if (!isSolved) {
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
  }

  // --- Long Press Logic ---
  const startLongPress = (index: number) => {
    if (!isCrosswordClue || !normalizedAnswer) return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
    changeFocusedIndex(index);
    setRevealProgress(0);

    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress = Math.min(100, progress + 20);
      setRevealProgress(progress);
    }, 100);

    longPressTimer.current = setTimeout(() => {
      const newInput = replaceCharAtIndex(userInput, normalizedAnswer[index], index);
      setUserInput(newInput);
      setAllUserInput(prev => ({ ...prev, [currentIndex]: newInput }));
      stopLongPress();
    }, 500);
  };

  const stopLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
    setRevealProgress(0);
    if (isCrosswordClue && focusedIndex !== null) {
      changeFocusedIndex(focusedIndex);
    }
  };

  // --- Effects ---
  // Initialize and randomize clues on first load
  useEffect(() => {
    setRandomizedClues(randomizeClues(deepClone(props.clueCollection.clues)));
  }, [props.clueCollection]);

  // Initialize state when a new clue is selected
  useEffect(() => {
    const savedInput = allUserInput[currentIndex] || '';
    setUserInput(savedInput);
    setIsSolved(false);

    if (isCrosswordClue) {
      const timer = setTimeout(() => {
        changeFocusedIndex(0);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        nonCrosswordInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isCrosswordClue, allUserInput]);

  // Check for solved state
  useEffect(() => {
    if (!currentClue || !normalizedAnswer) return;
    const isClueSolved = isCrosswordClue
      ? userInput.toUpperCase() === normalizedAnswer
      : userInput.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedAnswer;

    if (isClueSolved && !isSolved) {
      setIsSolved(true);
    }
  }, [userInput, isSolved, normalizedAnswer, isCrosswordClue, currentClue]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // --- Data and Guard Clauses ---
  if (!props.clueCollection || props.clueCollection.clues.length === 0 || !currentClue) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>Loading clues...</div>
      </div>
    );
  }
  
  // --- Renderers ---
  const renderCrosswordInputs = () => {
    if (!displayText || !normalizedAnswer) return null;
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

            return (
              <div
                key={currentLetterIndex}
                className={styles.letterBox}
                onMouseDown={(e) => {
                  e.preventDefault();
                  startLongPress(currentLetterIndex);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  stopLongPress();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startLongPress(currentLetterIndex);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopLongPress();
                }}
              >
                {isFocused && revealProgress > 0 && (
                  <div
                    className={styles.revealProgress}
                    style={{ height: `${revealProgress}%` }}
                  />
                )}
                <input
                  ref={(el) => (inputRefs.current[currentLetterIndex] = el)}
                  type="text"
                  maxLength={1}
                  value={inputChar.trim()}
                  onChange={(e) => handleCrosswordInputChange(currentLetterIndex, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, currentLetterIndex)}
                  onFocus={() => changeFocusedIndex(currentLetterIndex)}
                  className={`${styles.letterInput} ${isCorrect ? styles.correct : ''} ${isIncorrect ? styles.incorrect : ''}`}
                  aria-label={`Letter input ${currentLetterIndex + 1}`}
                />
              </div>
            );
          })}
        </div>
      );
    });
    return segments;
  };

  const renderNonCrosswordInput = () => {
    if (!normalizedAnswer || !displayText) return null;
    const normalizedInput = userInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const isIncorrect = !isSolved && normalizedInput !== normalizedAnswer.slice(0, normalizedInput.length);
    const isCorrect = isSolved || normalizedInput === normalizedAnswer.slice(0, normalizedInput.length);

    return (
      <div className={styles.nonCrosswordContainer}>
        <input
          ref={nonCrosswordInputRef}
          type="text"
          value={userInput}
          onChange={handleNonCrosswordInputChange}
          onKeyDown={handleNonCrosswordKeyDown}
          className={`${styles.nonCrosswordInput} ${isIncorrect ? styles.incorrect : ''} ${isCorrect ? styles.correct : ''}`}
          style={{ width: getTextWidth(displayText, 1.5, "Verdana") + 20 }}
          aria-label="Answer input field"
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Score boxes */}
      <div className={styles.scoreBoxes}>
        <div className={styles.scoreBox}>
          <div className={styles.scoreLabel}>Correct</div>
          <div className={styles.scoreValue}>{correctAnswers}</div>
        </div>
        <div className={styles.scoreBox}>
          <div className={styles.scoreLabel}>Incorrect</div>
          <div className={styles.scoreValue}>{incorrectAnswers}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressBarTrack}>
          <div 
            className={styles.progressBarFill} 
            style={{ width: `${(correctAnswers / clueCollection.clues.length) * 100}%` }}
          />
        </div>
        <div className={styles.progressText}>
          {correctAnswers} of {clueCollection.clues.length} mastered
        </div>
      </div>

      <div className={styles.clueText}>{currentClue.clue}</div>
      
      {/* Translated clue if available */}
      {currentClue.entry.translation && (
        <div className={styles.translatedClue}>
          {currentClue.entry.translation}
        </div>
      )}

      {/* Submit/Next and Explain buttons */}
      <div className={styles.buttonContainer}>
        {!isSolved ? (
          <button onClick={revealAnswer} className={styles.submitButton}>
            Submit
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

      {/* Input field based on clue type */}
      {isCrosswordClue ? (
        <div className={styles.inputGridContainer}>
          {renderCrosswordInputs()}
        </div>
      ) : (
        renderNonCrosswordInput()
      )}
    </div>
  );
};

export default CollectionQuiz;