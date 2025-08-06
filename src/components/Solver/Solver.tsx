/**
In React, write a component that displays a single clue with a input space to answer it with the following features:
- The component should accept props for the full set of clues and answers as well as a return URL.
- At the top, display the name of the clue collection. Indicate which clue is currently being solved (e.g. "Clue 3 of 10").
  - Include links to navigate to the previous and next clues.
  - Include a link to view the full list of clues the side panel (will be a separate component).
- Display the clue text fairly prominently below this.
- Below the clue, display a few buttons:
  - A button to go back to the collection list via the return URL.
  - A button to show the Spanish information in the side panel (will be a separate component).
  - A button to open an explanation of the clue in the side panel (will be a separate component).
- Below the buttons, display the crossword score for the current clue in the form of "Cruzi Score: <score>".
  - Make it trend red for scores closer to 0 and green for scores closer to 5.
- Below the buttons, display an input field for the user to enter their answer.
  - For clues that are crossword-style:
    - The input field should be styled to match the crossword theme
      i.e. each letter should be in a separate box that looks like a crossword square.
    - The component should validate the user's input against the correct answer for every letter entered. 
      Correct letters should display in dark green and incorrect letters in dark red.
    - The user should be able to click on a letter box to focus it. 
      Once a letter is entered, the focus should move to the next letter.
    - The component should handle keyboard events to allow the user to navigate through the letters 
      using arrow keys and backspace.
    - Long pressing or clicking and holding on a letter should wait about a half second 
      and then show the correct answer for that letter. During that wait time, the letter box should progressively fill 
      with light green to indicate that it's about to be revealed. This progressive fill should start from the bottom 
      of the box and progress to the top so that when the box completely fills, the letter is revealed.
  - For non-crossword clues:
    - The input field should be a single text box where the user can type their answer.
    - The component should validate the user's input on each letter entered against the correct answer for the entire clue.
      (e.g. if the answer is "hello", typing "he" should show "he" in dark green, but typing "hi" should show "hi" in dark red).
    - The input field should be based on the entry's display text, which may include spaces or special characters.
      However, the input should only enforce that the alphanumeric characters (A-Z, 0-9) are in the correct order
      and should ignore case. 
  - In any case, when all the letters are correctly entered, the input field should emit some celebratory sparkles
    and play a brief, joyful sound.
    - The sparkles should be a simple CSS animation that appears around the input field.
  - Keep track of the user's input for each clue, so it doesn't get lost when users move between clues.
- The component should be styled using an SCSS module.
- The component should be styled in dark mode.
- The component should be responsive and work well on different screen sizes, including mobile devices.
- The component should use TypeScript for type safety.
- The component should handle loading and error states gracefully.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faChevronLeft, faChevronRight, faInfoCircle, faLanguage, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './Solver.module.scss';
import { SolverProps } from './SolverProps';
import { replaceCharAtIndex, breakTextIntoLines, getCruziScoreColor, getTextWidth, deepClone } from '../../lib/utils'; // Assuming this utility function exists.
import { Clue } from '../../models/Clue';

// Type definitions for the celebration sparkle effect
interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
}

const Solver = (props: SolverProps) => {
  // --- State Management ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allUserInput, setAllUserInput] = useState<Record<number, string>>({}); // Changed to store string
  const [userInput, setUserInput] = useState<string>(''); // Single string for both input types
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [revealProgress, setRevealProgress] = useState<number>(0);
  const [isSolved, setIsSolved] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  // Refs for DOM elements and timers
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nonCrosswordInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const sparkleContainerRef = useRef<HTMLDivElement>(null);

  // --- Data and Guard Clauses ---
  if (!props.clueCollection || props.clueCollection.clues.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>Loading clues...</div>
      </div>
    );
  }

  const randomizeClues = (clues: Clue[]) => {
    return clues.sort(() => Math.random() - 0.5);
  }

  const { clueCollection } = props;
  const currentClue = clueCollection.clues[currentIndex];
  const isCrosswordClue = currentClue.isCrosswordClue;
  const rawAnswer = currentClue.entry.entry;
  const normalizedAnswer = rawAnswer.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const displayText = currentClue.entry.displayText || rawAnswer;

  // --- Celebration Sparks Logic ---
  const handleCelebration = useCallback(() => {
    const sparkleContainer = sparkleContainerRef.current;
    if (!sparkleContainer) return;
    const rect = sparkleContainer.getBoundingClientRect();
    const newSparkles: Sparkle[] = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      size: Math.random() * 5 + 2,
      color: `hsl(${Math.random() * 360}, 100%, 75%)`,
      duration: Math.random() * 0.5 + 0.5,
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1000);
  }, []);

  useEffect(() => {
    clueCollection.clues = randomizeClues(deepClone(clueCollection.clues));
  }, []);

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
  }, [currentIndex]);

  // Check for solved state and trigger celebration
  useEffect(() => {
    const isClueSolved = isCrosswordClue
      ? userInput.toUpperCase() === normalizedAnswer
      : userInput.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedAnswer;

    if (isClueSolved && !isSolved) {
      setIsSolved(true);
      handleCelebration();
    }
  }, [userInput]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // --- Event Handlers ---
  const handleCrosswordInputChange = (index: number, value: string) => {
    if (isSolved) return;
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
  };

  const changeFocusedIndex = (index: number) => {
    if (isCrosswordClue && index >= 0 && index < normalizedAnswer.length) {
      setFocusedIndex(index);
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  }

  const revealAnswer = () => {
    if (!isSolved) {
      const fullAnswer = isCrosswordClue ? normalizedAnswer : displayText;
      setUserInput(fullAnswer);
      setAllUserInput(prev => ({ ...prev, [currentIndex]: fullAnswer }));
      setIsSolved(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (!isCrosswordClue || focusedIndex === null) {
      if (e.key === 'Enter') {
        e.preventDefault();
        revealAnswer();
      }
      return;
    }
    const len = normalizedAnswer.length;

    if (e.key === 'Enter') {
      e.preventDefault();
      revealAnswer();
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
    if (!isCrosswordClue) return;
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

  // --- Navigation Handlers ---
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

  // --- Renderers ---
  const renderCrosswordInputs = () => {
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
                // Prevent default blur behavior on mouse/touch events
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
                  disabled={isSolved}
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
    const normalizedInput = userInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const isIncorrect = !isSolved && normalizedInput !== normalizedAnswer.slice(0, normalizedInput.length);
    const isCorrect = !isSolved && normalizedInput === normalizedAnswer.slice(0, normalizedInput.length);

    return (
      <div className={styles.nonCrosswordContainer}>
        <input
          ref={nonCrosswordInputRef}
          type="text"
          value={userInput}
          onChange={handleNonCrosswordInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!isSolved) {
                revealAnswer();
              }
              else {
                nextClue();
              }
            }
          }}
          className={`${styles.nonCrosswordInput} ${isIncorrect ? styles.incorrect : ''} ${isCorrect ? styles.correct : ''}`}
          disabled={isSolved}
          style={{ width: getTextWidth(displayText, 1.5, "Verdana") + 20 }}
          aria-label="Answer input field"
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Celebration sparkles */}
      <div ref={sparkleContainerRef} className={styles.sparkleContainer}>
        {sparkles.map(sparkle => (
          <div
            key={sparkle.id}
            className={styles.sparkle}
            style={{
              '--sparkle-x': `${sparkle.x}px`,
              '--sparkle-y': `${sparkle.y}px`,
              '--sparkle-size': `${sparkle.size}px`,
              '--sparkle-color': sparkle.color,
              '--sparkle-duration': `${sparkle.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Header and navigation */}
      <div className={styles.collectionInfo}>
        <div className={styles.collectionName}>{clueCollection.name}</div>
      </div>
      <div className={styles.navigation}>
        <button className={styles.navButton} onClick={previousClue} aria-label="Previous Clue">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className={styles.clueIndexContainer}>
          <span className={styles.clueIndex}>Clue {currentIndex + 1} of {clueCollection.clues.length}</span>
          <button onClick={props.onShowClueList} className={styles.actionButton} aria-label="Show Clue List">
            <FontAwesomeIcon icon={faList} />
          </button>
        </div>
        <button className={styles.navButton} onClick={nextClue} aria-label="Next Clue">
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className={styles.clueText}>{currentClue.clue}</div>

      {/* Action buttons for side panel */}
      <div className={styles.buttonContainer}>
        <button onClick={props.onGoBack} className={styles.panelButton} aria-label="Back to Crossword List">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>End Solve</span>
        </button>
        <button onClick={props.onShowSpanish} className={styles.panelButton} aria-label="Show Spanish Info">
          <FontAwesomeIcon icon={faLanguage} />
          <span>Spanish</span>
        </button>
        <button onClick={props.onShowExplanation} className={styles.panelButton} aria-label="Show Explanation">
          <FontAwesomeIcon icon={faInfoCircle} />
          <span>Explain</span>
        </button>
      </div>

      {isCrosswordClue && (
        <div className={styles.scoreContainer}>
          Cruzi Score:
          <div className={styles.scoreDisplay} style={{ color: getCruziScoreColor(currentClue.entry.cruziScore as number) }}>
            {(currentClue.entry.cruziScore as number).toFixed(1)}
          </div>
        </div>
      )}

      {/* Input field based on clue type */}
      {isCrosswordClue ? (
        <div className={styles.inputGridContainer}>
          {renderCrosswordInputs()}
        </div>
      ) : (
        renderNonCrosswordInput()
      )}

      {/* Next button */}
      {isSolved && (
        <button onClick={nextClue} className={styles.nextButton}>
          NEXT
        </button>
      )}
    </div>
  );
};

export default Solver;
