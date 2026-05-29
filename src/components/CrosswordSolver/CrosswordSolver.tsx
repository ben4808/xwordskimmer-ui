import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { ClueCollection } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import { formatCrosswordDateForQuery } from '../../lib/utils';
import { AnswerInput } from './AnswerInput';
import { CrosswordSolverProps } from './CrosswordSolverProps';
import {
  createInitialRevealedMask,
  dbScoreToUi,
  formatUiScore,
  getAnswer,
  getClueText,
  getEligibleClues,
  getScoreBadgeBackground,
  isClueComplete,
  parseCrosswordSolverDate,
  selectHintIndex,
} from './crosswordSolverHelpers';
import styles from './CrosswordSolver.module.scss';

function CrosswordSolver({ api = CruziApi }: CrosswordSolverProps) {
  const navigate = useNavigate();
  const { publication, date: dateParam } = useParams<{
    publication: string;
    date: string;
  }>();
  const { user } = useAuth();

  const [crossword, setCrossword] = useState<ClueCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [crosswordHintsUsed, setCrosswordHintsUsed] = useState(0);
  const [clueHintsUsed, setClueHintsUsed] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [revealedMask, setRevealedMask] = useState<boolean[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const submittedRef = useRef(false);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const eligibleClues = useMemo(
    () => getEligibleClues(crossword?.clues),
    [crossword?.clues]
  );

  const currentEntry = eligibleClues[currentClueIndex];
  const currentClue = currentEntry?.clue;
  const answer = useMemo(
    () => (currentClue ? getAnswer(currentClue) : ''),
    [currentClue]
  );
  const clueText = currentClue ? getClueText(currentClue) : '';
  const totalClues = eligibleClues.length;
  const isLastClue = currentClueIndex >= totalClues - 1;

  const puzzleDate = useMemo(() => {
    if (crossword?.puzzle?.date) {
      return new Date(crossword.puzzle.date);
    }
    if (dateParam) {
      return parseCrosswordSolverDate(dateParam) ?? new Date();
    }
    return new Date();
  }, [crossword?.puzzle?.date, dateParam]);

  const fetchCrossword = useCallback(async () => {
    if (!publication || !dateParam) {
      setError('Invalid crossword URL.');
      setIsLoading(false);
      return;
    }

    if (!parseCrosswordSolverDate(dateParam)) {
      setError('Date must be formatted as MM-DD-YYYY.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCrossword({
        publicationId: publication,
        date: dateParam,
      });
      setCrossword(data);
      setCurrentClueIndex(0);
      setCrosswordHintsUsed(0);
    } catch (err) {
      console.error('Error fetching crossword:', err);
      setError('Failed to load crossword. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [api, publication, dateParam]);

  useEffect(() => {
    fetchCrossword();
  }, [fetchCrossword]);

  useEffect(() => {
    if (!answer.length) {
      setRevealedMask([]);
      setUserInput('');
      setClueHintsUsed(0);
      setIsSolved(false);
      submittedRef.current = false;
      return;
    }

    setRevealedMask(createInitialRevealedMask(answer.length));
    setUserInput('');
    setClueHintsUsed(0);
    setIsSolved(false);
    submittedRef.current = false;
  }, [currentClueIndex, answer]);

  useEffect(() => {
    if (!answer.length || isSolved) return;
    if (isClueComplete(answer, userInput, revealedMask)) {
      setIsSolved(true);
    }
  }, [answer, userInput, revealedMask, isSolved]);

  useEffect(() => {
    if (!isSolved || !user || !currentClue?.id || submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    api
      .submitCrosswordResponse({
        clueId: currentClue.id,
        hintsUsed: clueHintsUsed,
      })
      .catch((err) => {
        console.error('Error submitting crossword response:', err);
      });
  }, [isSolved, user, currentClue?.id, clueHintsUsed, api]);

  const handleBack = () => {
    navigate(`/crosswords?date=${formatCrosswordDateForQuery(puzzleDate)}`);
  };

  const goToPreviousClue = () => {
    if (currentClueIndex > 0) {
      setCurrentClueIndex((i) => i - 1);
    }
  };

  const goToNextClue = () => {
    if (currentClueIndex < totalClues - 1) {
      setCurrentClueIndex((i) => i + 1);
    }
  };

  const handleHint = () => {
    if (isSolved || !answer.length) return;

    const index = selectHintIndex(answer, userInput, revealedMask);
    if (index == null) return;

    setCrosswordHintsUsed((c) => c + 1);
    setClueHintsUsed((c) => c + 1);
    setRevealedMask((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    if (index < userInput.length && userInput[index] !== answer[index]) {
      setUserInput((prev) => prev.slice(0, index));
    }
  };

  const handleExplain = async () => {
    if (!clueText || !answer) return;
    const prompt = `Explain why ${clueText} was used as a crossword clue for ${answer}.`;
    try {
      await navigator.clipboard.writeText(prompt);
      setToastMessage('Copied to clipboard');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleFinish = () => {
    handleBack();
  };

  const familiarityDb = currentClue?.entry?.familiarityScore;
  const qualityDb = currentClue?.entry?.qualityScore;
  const familiarityUi = dbScoreToUi(familiarityDb);
  const qualityUi = dbScoreToUi(qualityDb);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading crossword...</div>
      </div>
    );
  }

  if (error || !crossword) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error ?? 'Crossword not found.'}</div>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to list</span>
        </button>
      </div>
    );
  }

  if (!currentClue || totalClues === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>No eligible clues for this crossword.</div>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to list</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page} ref={inputContainerRef}>
      <header className={styles.headerRow}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Back to crossword list"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className={styles.title}>{crossword.title}</h1>
      </header>

      <div className={styles.trackerRow}>
        <div className={styles.hintsCounter}>
          Hints used: {crosswordHintsUsed}
        </div>
        <div className={styles.carousel}>
          <button
            type="button"
            className={styles.carouselButton}
            onClick={goToPreviousClue}
            disabled={currentClueIndex === 0}
            aria-label="Previous clue"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className={styles.carouselLabel}>
            Clue {currentClueIndex + 1} of {totalClues}
          </span>
          <button
            type="button"
            className={styles.carouselButton}
            onClick={goToNextClue}
            disabled={isLastClue}
            aria-label="Next clue"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <p className={styles.clueText}>{clueText}</p>

      <div className={styles.statsRow}>
        <span className={styles.letterCount}>{answer.length} letters</span>
        <div className={styles.scoreBadges}>
          <span
            className={styles.scoreBadge}
            style={{ backgroundColor: getScoreBadgeBackground(familiarityUi) }}
            title="Familiarity"
          >
            F {formatUiScore(familiarityDb)}
          </span>
          <span
            className={styles.scoreBadge}
            style={{ backgroundColor: getScoreBadgeBackground(qualityUi) }}
            title="Quality"
          >
            Q {formatUiScore(qualityDb)}
          </span>
        </div>
      </div>

      <AnswerInput
        answer={answer}
        userInput={userInput}
        revealedMask={revealedMask}
        isSolved={isSolved}
        onUserInputChange={setUserInput}
      />

      <footer className={styles.footer}>
        {!isSolved ? (
          <button type="button" className={styles.hintButton} onClick={handleHint}>
            Hint
          </button>
        ) : (
          <div className={styles.solvedActions}>
            <button
              type="button"
              className={styles.explainButton}
              onClick={handleExplain}
            >
              Explain
            </button>
            {isLastClue ? (
              <button
                type="button"
                className={styles.nextButton}
                onClick={handleFinish}
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                className={styles.nextButton}
                onClick={goToNextClue}
              >
                Next
              </button>
            )}
          </div>
        )}
      </footer>

      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}

export default CrosswordSolver;
