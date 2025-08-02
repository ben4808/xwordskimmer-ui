/**
In React, write a component that displays a single crossword clue with a input space to solve it with the following features:
- The component should accept props for the full set of crossword clues and answers.
- At the top, display the name of the crossword collection. Indicate which clue is currently being solved (e.g. "Clue 3 of 10").
  - Include links to navigate to the previous and next clues.
  - Include a link to view the full list of clues the side panel (will be a separate component).
- Display the clue text fairly prominently below this.
- Below the clue, display a couple of buttons:
  - A button to show the Spanish information in the side panel (will be a separate component).
  - A button to open an explanation of the clue in the side panel (will be a separate component).
- Below the buttons, display an input field for the user to enter their answer.
  - The input field should be styled to match the crossword theme, 
    i.e. each letter should be in a separate box that looks like a crossword square.
  - The component should validate the user's input against the correct answer for every letter entered. 
    Correct letters should display in dark green and incorrect letters in dark red.
  - The user should be able to click on a letter box to focus it. 
    Once a letter is entered, the focus should move to the next letter.
  - The component should handle keyboard events to allow the user to navigate through the letters using arrow keys and backspace.
  - Long pressing or clicking and holding on a letter should wait about a second 
    and then show the correct answer for that letter. During that wait time, the letter box should progressively fill 
    with light green to indicate that it's about to be revealed. This progressive fill should start from the bottom 
    of the box and progress to the top so that when the box completely fills, the letter is revealed.
  - When all the letters are correctly entered, the input field should emit some celebratory sparks
    and play a brief, joyful sound.
- The component should be styled using an SCSS module.
- The component should be styled in dark mode.
- The component should be responsive and work well on different screen sizes, including mobile devices.
- The component should use TypeScript for type safety.
- The component should handle loading and error states gracefully.
- Add a display of the crossword score just above the answer boxes in the form of "Cruzi Score: <score>". 
  - Make it trend red for scores closer to 0 and green for scores closer to 5.
- Use the displayText to determine the letters to make boxes before, rather than the raw 'entry'. 
  - Ignore anything that isn't a letter, number, or space when creating boxes. Insert a space between the boxes where there is a space in the displayText.
- Keep track of the user's input for each clue, so it doesn't get lost when users move between clues.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faChevronLeft, faChevronRight, faInfoCircle, faLanguage, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './Solver.module.scss';
import { SolverProps } from './SolverProps';
import { displayTextToEntry } from '../../lib/utils';

// Sparkle effect type for the celebration
interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
};

function Solver(props: SolverProps) {
  // --- State Management ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allUserInput, setAllUserInput] = useState<Record<number, string[]>>({});
  const [userInput, setUserInput] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [revealProgress, setRevealProgress] = useState<number>(0);
  const [isSolved, setIsSolved] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  // Refs for DOM elements and timers
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Guard clause for missing data
  if (!props.clueCollection || props.clueCollection.clues.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>Loading crossword...</div>
      </div>
    );
  }

  const { clueCollection } = props;
  const currentClue = clueCollection.clues[currentIndex];
  const displayText = currentClue.entry.displayText || currentClue.entry.entry;
  // Get the actual characters for the input, ignoring non-alphanumeric chars for length.
  const entryTextForInput = displayText.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase();
  const entryLength = displayTextToEntry(displayText).length;

  // --- Audio Logic for Celebration ---
  // Plays a simple, joyful sound when the puzzle is solved
  const playCelebrationSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext)();
    }
    const audioContext = audioContextRef.current;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, []);

  // --- Celebration Sparks Logic ---
  // Creates and manages the celebratory sparkle effect within the input container
  const handleCelebration = useCallback(() => {
    playCelebrationSound();

    const inputContainer = inputContainerRef.current;
    if (!inputContainer) return;
    const rect = inputContainer.getBoundingClientRect();

    const newSparkles: Sparkle[] = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      size: Math.random() * 5 + 2,
      color: `hsl(${Math.random() * 360}, 100%, 75%)`,
      duration: Math.random() * 1 + 1,
    }));
    setSparkles(newSparkles);

    setTimeout(() => setSparkles([]), 2000);
  }, [playCelebrationSound]);

  // --- Utility Functions ---
  const getScoreColor = (score: number): string => {
    // Ensure score is within the 0-50 range
    score = Math.max(0, Math.min(50, score));

    if (score < 10) {
      return 'Red'; // Scores below 10 are DarkRed
    } else if (score >= 10 && score < 30) {
      // Transition from DarkRed (139,0,0) to LightGray (211,211,211)
      const ratio = (score - 10) / (30 - 10); // 0 at score 10, 1 at score 30
      const red = Math.round(139 * (1 - ratio) + 211 * ratio);
      const green = Math.round(0 * (1 - ratio) + 211 * ratio);
      const blue = Math.round(0 * (1 - ratio) + 211 * ratio);

      return `rgb(${red}, ${green}, ${blue})`;
    } else if (score >= 30 && score <= 50) {
      // Transition from LightGray (211,211,211) to Green (0,128,0)
      const ratio = (score - 30) / (50 - 30); // 0 at score 30, 1 at score 50
      const red = Math.round(211 * (1 - ratio) + 0 * ratio);
      const green = Math.round(211 * (1 - ratio) + 128 * ratio);
      const blue = Math.round(211 * (1 - ratio) + 0 * ratio);

      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      return 'lightgray'; // Should technically only be hit if score is exactly 30
    }
  };

  // --- useEffect Hooks ---

  // Initialize input state when a new clue is selected
  useEffect(() => {
    // Load user input for the current clue
    const savedInput = allUserInput[currentIndex] || Array(entryLength).fill('');
    setUserInput(savedInput);
    setIsSolved(false);
    setFocusedIndex(0);

    // Use a small delay to ensure refs are ready
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [currentIndex, entryLength, allUserInput]);

  // Check for a solved state and trigger celebration
  useEffect(() => {
    // Ensure we only compare the actual input characters against the entry.
    const actualEntryText = currentClue.entry.entry.toUpperCase();
    const isClueSolved = userInput.join('') === actualEntryText;

    if (isClueSolved && !isSolved) {
      setIsSolved(true);
      handleCelebration();
    }
  }, [userInput, currentClue, isSolved, handleCelebration]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // --- Event Handlers ---

  // Handles input from the letter boxes
  const handleInputChange = (index: number, value: string) => {
    const newInput = [...userInput];
    const upperValue = value.toUpperCase();

    if (/^[A-Z0-9]$/.test(upperValue) || value === '') {
      newInput[index] = upperValue;
      setUserInput(newInput);

      // Auto-focus the next input box
      if (upperValue && index < entryLength - 1) {
        setFocusedIndex(index + 1);
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handles keyboard navigation (arrows, backspace)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (focusedIndex === null) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newIndex = Math.max(0, focusedIndex - 1);
      setFocusedIndex(newIndex);
      inputRefs.current[newIndex]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newIndex = Math.min(entryLength - 1, focusedIndex + 1);
      setFocusedIndex(newIndex);
      inputRefs.current[newIndex]?.focus();
    } else if (e.key === 'Backspace') {
      if (!userInput[focusedIndex] && focusedIndex > 0) {
        setFocusedIndex(focusedIndex - 1);
        inputRefs.current[focusedIndex - 1]?.focus();
      }
    }
  };

  // --- Long Press Logic ---
  const startLongPress = (index: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
    setFocusedIndex(index);
    setRevealProgress(0);

    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += 10;
      setRevealProgress(progress);
    }, 100);

    longPressTimer.current = setTimeout(() => {
      const newInput = [...userInput];
      // Reveals the correct letter and updates the state
      const entryString = currentClue.entry.entry.toUpperCase(); // Ensure comparison is case-insensitive
      newInput[index] = entryString[index];
      setUserInput(newInput);
      stopLongPress();
    }, 1000);
  };

  const stopLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setRevealProgress(0);
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

  // --- Render Logic for Word Wrapping ---
  let currentInputCharIndex = 0; // Tracks the index for the actual input boxes, skipping spaces

  const renderInputBoxes = () => {
    const segments: React.ReactNode[] = [];
    let currentWordChars: { char: string; originalIndex: number }[] = [];

    [...entryTextForInput].forEach((item, originalIndex) => {
      if (item === ' ') {
        if (currentWordChars.length > 0) {
          segments.push(
            <div key={`word-${currentInputCharIndex}`} className={styles.wordGroup}>
              {currentWordChars.map((charItem) => {
                const charIndex = charItem.originalIndex; // Use original index for char mapping
                const actualInputIndex = currentInputCharIndex - currentWordChars.length + currentWordChars.indexOf(charItem);

                const isCorrect = userInput[actualInputIndex] && userInput[actualInputIndex].toUpperCase() === currentClue.entry.entry.toUpperCase()[actualInputIndex];
                const isIncorrect = userInput[actualInputIndex] && userInput[actualInputIndex].toUpperCase() !== currentClue.entry.entry.toUpperCase()[actualInputIndex];
                const isFocused = focusedIndex === actualInputIndex;

                return (
                  <div
                    key={charIndex}
                    className={styles.letterBox}
                    onMouseDown={() => startLongPress(actualInputIndex)}
                    onMouseUp={stopLongPress}
                    onMouseLeave={stopLongPress}
                    onTouchStart={() => startLongPress(actualInputIndex)}
                    onTouchEnd={stopLongPress}
                  >
                    {isFocused && revealProgress > 0 && (
                      <div
                        className={styles.revealProgress}
                        style={{ height: `${revealProgress}%` }}
                      />
                    )}
                    <input
                      ref={(el) => (inputRefs.current[actualInputIndex] = el)}
                      type="text"
                      maxLength={1}
                      value={userInput[actualInputIndex] || ''}
                      onChange={(e) => handleInputChange(actualInputIndex, e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setFocusedIndex(actualInputIndex)}
                      className={`${styles.letterInput} ${isCorrect ? styles.correct : ''} ${isIncorrect ? styles.incorrect : ''}`}
                      disabled={isSolved}
                      aria-label={`Letter input ${actualInputIndex + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          );
          currentWordChars = []; // Reset for the next word
        }
        segments.push(<div key={`space-${originalIndex}`} className={styles.wordSpace} />);
      } else {
        // Collect characters for the current word
        currentWordChars.push({ char: item, originalIndex: currentInputCharIndex++ });
      }
    });

    // Add any remaining word characters after the loop
    if (currentWordChars.length > 0) {
      segments.push(
        <div key={`word-final-${currentInputCharIndex}`} className={styles.wordGroup}>
          {currentWordChars.map((charItem) => {
            const charIndex = charItem.originalIndex;
            const isCorrect = userInput[charIndex] && userInput[charIndex].toUpperCase() === currentClue.entry.entry.toUpperCase()[charIndex];
            const isIncorrect = userInput[charIndex] && userInput[charIndex].toUpperCase() !== currentClue.entry.entry.toUpperCase()[charIndex];
            const isFocused = focusedIndex === charIndex;

            return (
              <div
                key={charIndex}
                className={styles.letterBox}
                onMouseDown={() => startLongPress(charIndex)}
                onMouseUp={stopLongPress}
                onMouseLeave={stopLongPress}
                onTouchStart={() => startLongPress(charIndex)}
                onTouchEnd={stopLongPress}
              >
                {isFocused && revealProgress > 0 && (
                  <div
                    className={styles.revealProgress}
                    style={{ height: `${revealProgress}%` }}
                  />
                )}
                <input
                  ref={(el) => (inputRefs.current[charIndex] = el)}
                  type="text"
                  maxLength={1}
                  value={userInput[charIndex] || ''}
                  onChange={(e) => handleInputChange(charIndex, e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusedIndex(charIndex)}
                  className={`${styles.letterInput} ${isCorrect ? styles.correct : ''} ${isIncorrect ? styles.incorrect : ''}`}
                  disabled={isSolved}
                  aria-label={`Letter input ${charIndex + 1}`}
                />
              </div>
            );
          })}
        </div>
      );
    }
    return segments;
  };

  const renderInputBox = (charIndex: number) => {
    const isCorrect = userInput[charIndex] && userInput[charIndex].toUpperCase() === currentClue.entry.entry.toUpperCase()[charIndex];
    const isIncorrect = userInput[charIndex] && userInput[charIndex].toUpperCase() !== currentClue.entry.entry.toUpperCase()[charIndex];
    const isFocused = focusedIndex === charIndex;

    return (
      <div
        key={charIndex}
        className={styles.letterBox}
        onMouseDown={() => startLongPress(charIndex)}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress(charIndex)}
        onTouchEnd={stopLongPress}
      >
        {isFocused && revealProgress > 0 && (
          <div
            className={styles.revealProgress}
            style={{ height: `${revealProgress}%` }}
          />
        )}
        <input
          ref={(el) => (inputRefs.current[charIndex] = el)}
          type="text"
          maxLength={1}
          value={userInput[charIndex] || ''}
          onChange={(e) => handleInputChange(charIndex, e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocusedIndex(charIndex)}
          className={`${styles.letterInput} ${isCorrect ? styles.correct : ''} ${isIncorrect ? styles.incorrect : ''}`}
          disabled={isSolved}
          aria-label={`Letter input ${charIndex + 1}`}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Celebration sparkles */}
      <div ref={inputContainerRef} className={styles.sparkleContainer}>
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

      <div className={styles.scoreContainer}>
        Cruzi Score:
        {currentClue.entry.crosswordScore !== undefined && (
          <div className={styles.scoreDisplay} style={{ color: getScoreColor(currentClue.entry.crosswordScore) }}>
            {(currentClue.entry.crosswordScore / 10).toFixed(1)}
          </div>
        )}
      </div>

      {/* Crossword input field */}
      <div className={styles.inputGridContainer}> {/* This will be your flex container for words */}
        {renderInputBoxes()}
      </div>
    </div>
  );
};

export default Solver;
