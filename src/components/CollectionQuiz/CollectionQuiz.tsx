import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './CollectionQuiz.module.scss';
import { CollectionQuizProps } from './CollectionQuizProps';
import { getTextWidth } from '../../lib/utils';
import { InputBoxState } from '../../models/InputBoxState';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useClueData } from './useClueData';
import { useAnswerValidation } from './useAnswerValidation';
import { useClueText } from './useClueText';
import { NonCrosswordInput } from './NonCrosswordInput';
import CruziApi from '../../api/CruziApi';
import { ClueCollection } from 'cruzi-models';
import {
  applyCorrectSolveProgress,
  applyIncorrectSolveProgress,
  buildExampleSentenceExplainPrompt,
  buildClueExplainPrompt,
  getClueLanguage,
  normalizeClueProgress,
  stripFillInBlankBrackets,
} from './quizHelpers';

const CollectionQuiz = (props: CollectionQuizProps) => {
  const navigate = useNavigate();
  const { id: collectionId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { setCurrentCollection } = useCollection();
  const [fetchedCollection, setFetchedCollection] = useState<ClueCollection | null>(null);
  const [fetchLoading, setFetchLoading] = useState(!props.clueCollection);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const clueCollection = props.clueCollection ?? fetchedCollection;

  useEffect(() => {
    if (props.clueCollection || !collectionId) {
      return;
    }

    let cancelled = false;

    const loadCollection = async () => {
      setFetchLoading(true);
      setFetchError(null);
      try {
        const data = await CruziApi.getCollectionById(collectionId);
        if (cancelled) return;
        if (data) {
          setFetchedCollection(data);
        } else {
          setFetchError('Collection not found');
        }
      } catch (err) {
        console.error('Error fetching collection:', err);
        if (!cancelled) {
          setFetchError('Failed to load collection');
        }
      } finally {
        if (!cancelled) {
          setFetchLoading(false);
        }
      }
    };

    loadCollection();

    return () => {
      cancelled = true;
    };
  }, [collectionId, props.clueCollection]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [allUserInput, setAllUserInput] = useState<Record<number, string>>({});

  const { allClues, isLoading, isLoadingNextBatch, loadNextBatch } = useClueData(
    clueCollection ?? undefined
  );

  const currentClue = allClues[currentIndex];
  const { clueText, translatedClue, translatedClueLang, expectedResponse } = useClueText(
    currentClue,
    user,
    currentIndex
  );

  const [userInput, setUserInput] = useState<string>('');
  const [inputBoxState, setInputBoxState] = useState<InputBoxState>(InputBoxState.Partial);
  const [isSolved, setIsSolved] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [inputWidth, setInputWidth] = useState<number>(200);

  const inputRef = useRef<HTMLInputElement>(null);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const incrementCorrect = () => setCorrectAnswers((prev) => prev + 1);
  const incrementIncorrect = () => setIncorrectAnswers((prev) => prev + 1);

  const [currentClueProgress, setCurrentClueProgress] = useState<{
    correctSolves: number;
    correctSolvesNeeded: number;
  }>({ correctSolves: 0, correctSolvesNeeded: 2 });

  useEffect(() => {
    const savedInput = allUserInput[currentIndex] || '';
    setUserInput(savedInput);
    setIsSolved(false);
    setIsRevealed(false);
    setInputBoxState(InputBoxState.Partial);
    setCurrentClueProgress(normalizeClueProgress(currentClue?.progressData));

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [currentIndex, currentClue?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!expectedResponse) {
      return;
    }

    const mobileMediaQuery = window.matchMedia('(max-width: 768px)');

    const updateInputWidth = () => {
      const fontSizeRem = mobileMediaQuery.matches ? 1.2 : 1.5;
      const textWidth = getTextWidth(expectedResponse, fontSizeRem, 'Verdana, sans-serif', 700);
      setInputWidth(textWidth + 12);
    };

    updateInputWidth();
    mobileMediaQuery.addEventListener('change', updateInputWidth);
    window.addEventListener('resize', updateInputWidth);

    return () => {
      mobileMediaQuery.removeEventListener('change', updateInputWidth);
      window.removeEventListener('resize', updateInputWidth);
    };
  }, [expectedResponse]);

  useAnswerValidation({
    currentClue,
    userInput,
    isSolved,
    isRevealed,
    setInputBoxState,
    setIsSolved,
    setUserInput,
    getExpectedResponse: () => expectedResponse,
    onCorrect: () => {
      incrementCorrect();
      setCurrentClueProgress((prev) => applyCorrectSolveProgress(prev));
      if (user && currentClue?.id && clueCollection?.id) {
        CruziApi.submitUserResponse(
          currentClue.id.toString(),
          clueCollection.id.toString(),
          true
        ).catch((err) => {
          console.error('Error submitting correct response:', err);
        });
      }
    },
  });

  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    setCurrentCollection(clueCollection);

    return () => {
      setCurrentCollection(null);
    };
  }, [clueCollection, setCurrentCollection]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSolved || isRevealed) return;
    const value = e.target.value;
    setUserInput(value);
    setAllUserInput((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isSolved || isRevealed) {
        nextClue();
      } else {
        revealAnswer();
      }
    }
  };

  const revealAnswer = () => {
    if (isRevealed || isSolved) return;

    setUserInput(expectedResponse || '');
    setAllUserInput((prev) => ({ ...prev, [currentIndex]: expectedResponse || '' }));
    setIsRevealed(true);
    setIsSolved(true);
    setInputBoxState(InputBoxState.Completed);

    incrementIncorrect();
    setCurrentClueProgress((prev) => applyIncorrectSolveProgress(prev));
    if (user && currentClue?.id && clueCollection?.id) {
      CruziApi.submitUserResponse(
        currentClue.id.toString(),
        clueCollection.id.toString(),
        false
      ).catch((err) => {
        console.error('Error submitting incorrect response:', err);
      });
    }
  };

  useEffect(() => {
    if (currentIndex === allClues.length - 1 && !isLoadingNextBatch && allClues.length > 0) {
      loadNextBatch();
    }
  }, [currentIndex, allClues.length, isLoadingNextBatch, loadNextBatch]);

  const nextClue = () => {
    setAllUserInput((prev) => ({ ...prev, [currentIndex]: userInput }));
    setCurrentIndex(currentIndex + 1);
    setIsRevealed(false);
  };

  const handleExplain = async () => {
    if (!currentClue) return;

    try {
      let filledPrompt: string;
      const clueTextForPrompt = stripFillInBlankBrackets(clueText);

      if (currentClue.sense?.id && clueText) {
        const clueLang = getClueLanguage(currentClue);
        const promptLang =
          translatedClueLang ?? (clueLang === 'es' ? 'en' : 'es');
        filledPrompt = buildExampleSentenceExplainPrompt(clueTextForPrompt, clueLang, promptLang);
      } else {
        filledPrompt = buildClueExplainPrompt(
          clueTextForPrompt,
          expectedResponse ?? ''
        );
      }

      await navigator.clipboard.writeText(filledPrompt);
      setToastMessage('AI query copied to clipboard');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const fillInBlankPattern = /\{\{([^}]+)\}\}/i;
  const hasFillInBlank = fillInBlankPattern.test(clueText);

  const handleBack = () => {
    if (collectionId) {
      navigate(`/collection/${collectionId}`);
    } else {
      navigate('/collections');
    }
  };

  if (fetchLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>Loading collection...</div>
      </div>
    );
  }

  if (fetchError || !clueCollection) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>{fetchError ?? 'Collection not found'}</div>
      </div>
    );
  }

  if (isLoading) {
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

  const correctSolves = currentClueProgress.correctSolves;
  const correctSolvesNeeded = currentClueProgress.correctSolvesNeeded;
  const progressPercent =
    correctSolvesNeeded > 0
      ? Math.min(100, (correctSolves / correctSolvesNeeded) * 100)
      : 0;

  return (
    <div className={styles.container}>
      <header className={styles.headerRow}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Back to collection"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className={styles.title}>{clueCollection.title}</h1>
      </header>

      <div className={styles.scoreAndProgressContainer}>
        <div className={styles.scoreGroup}>
          <span className={styles.progressLabel}>Session:</span>
          <div className={styles.scoreBoxes}>
            <div className={`${styles.scoreBox} ${styles.scoreBoxCorrect}`}>
              <div className={styles.scoreValue}>{correctAnswers}</div>
            </div>
            <div className={`${styles.scoreBox} ${styles.scoreBoxIncorrect}`}>
              <div className={styles.scoreValue}>{incorrectAnswers}</div>
            </div>
          </div>
        </div>

        {user && (
          <div className={styles.clueProgressGroup}>
            <span className={styles.progressLabel}>Clue:</span>
            <div className={styles.progressBar}>
              <div className={styles.progressText}>
                {correctSolves}/{correctSolvesNeeded}
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFillInBlank ? (
        <>
          <NonCrosswordInput
            clueText={clueText}
            userInput={userInput}
            inputBoxState={inputBoxState}
            inputRef={inputRef}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            showFillInBlank={true}
            inputWidth={inputWidth}
          />
          {translatedClue && (
            <div className={styles.translatedClue}>{translatedClue}</div>
          )}
        </>
      ) : (
        <>
          {clueText && <div className={styles.clueText}>{clueText}</div>}
          {translatedClue && (
            <div className={styles.translatedClue}>{translatedClue}</div>
          )}
          <NonCrosswordInput
            clueText={clueText}
            userInput={userInput}
            inputBoxState={inputBoxState}
            inputRef={inputRef}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            showFillInBlank={false}
            inputWidth={inputWidth}
          />
        </>
      )}

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

      {showToast && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
};

export default CollectionQuiz;
