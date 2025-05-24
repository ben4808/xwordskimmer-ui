/**
In React, write a component that displays a single crossword clue with a input space to solve it with the following features:
1. The component should accept props for the crossword clue data, including the clue text and the answer.
2. The component should display the clue text and an input field for the user to enter their answer.
3. The input field should be styled to match the crossword theme, i.e. each letter should be in a separate box that looks like a crossword square.
4. The component should validate the user's input against the correct answer for every letter entered. Correct letters should display in dark green and incorrect letters in dark red.
5. The user should be able to click on a letter box to focus it. Once a letter is entered, the focus should move to the next letter.
6. The component should handle keyboard events to allow the user to navigate through the letters using arrow keys and backspace.
7. Long pressing on a letter should wait about a second and then show the correct answer for that letter. During that wait time, the letter box should progressively fill with light green to indicate that it's about to be revealed. This progressive fill should start from the bottom of the box and progress to the top so the box completely fills after a second.
8. The component should be responsive and work well on different screen sizes.
9. The component should use TypeScript for type safety.
 */

import React, { useState, useRef, useEffect } from 'react';
import { SolverProps } from './SolverProps';
import styles from './Solver.module.scss';

function Solver(props: SolverProps) {
  const firstClue = props.clueCollection.clues[0];
  const [currentClue, setCurrentClue] = useState(firstClue);
  const [userInput, setUserInput] = useState<string[]>(Array(firstClue.entry.length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [revealProgress, setRevealProgress] = useState<number>(0);  // percentage
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (index: number, value: string) => {
    const newInput = [...userInput];
    const upperValue = value.toUpperCase();
    if (/^[A-Z]$/.test(upperValue) || value === '') {
      newInput[index] = upperValue;
      setUserInput(newInput);
      if (upperValue && index < currentClue.entry.length - 1) {
        setFocusedIndex(index + 1);
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!focusedIndex) return;
    const index = focusedIndex;
    if (e.key === 'ArrowLeft' && index > 0) {
      setFocusedIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < currentClue.entry.length - 1) {
      setFocusedIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Backspace' && !userInput[index] && index > 0) {
      setFocusedIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const startLongPress = () => {
    if (!focusedIndex) return;
    stopLongPress(); // Clear any existing timers
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += 10; // Increment every 100ms to reach 100 in 1 second
      setRevealProgress(progress);
    }, 100);

    longPressTimer.current = setTimeout(() => {
      const newInput = [...userInput];
      newInput[focusedIndex] = currentClue.entry[focusedIndex].toUpperCase();
      setUserInput(newInput);
      setRevealProgress(0);
      stopLongPress();
    }, 1000);
  };

  const stopLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer.current!);
      longPressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current!);
      progressInterval.current = null;
      setRevealProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup timer on unmount
      stopLongPress();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.clue}>{currentClue.clue}</div>
      <div className={styles.inputContainer}>
        {currentClue.entry.split('').map((letter, index) => {
          const isCorrect = userInput[index] && userInput[index] === letter;
          const isIncorrect = userInput[index] && userInput[index] !== letter;
          return (
            <div
              key={index}
              className={styles.letterBox}
              onMouseDown={() => startLongPress()}
              onMouseUp={() => stopLongPress()}
              onMouseLeave={() => stopLongPress()}
              onTouchStart={() => startLongPress()}
              onTouchEnd={() => stopLongPress()}
            >
              {index == focusedIndex && revealProgress > 0 && (
                <div
                  className={styles.revealProgress}
                  style={{ height: `${revealProgress}%` }}
                />
              )}
              <input
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={userInput[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e)}
                onFocus={() => setFocusedIndex(index)}
                className={`${styles.letterInput} ${
                  isCorrect ? styles.correct : isIncorrect ? styles.incorrect : ''
                } ${focusedIndex === index ? styles.focused : ''}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Solver;
