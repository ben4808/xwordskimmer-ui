import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { ClueCollection } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import { formatCrosswordDateForQuery, parseCalendarDate } from '../../lib/utils';
import { AnswerInput, AnswerInputHandle } from './AnswerInput';
import { CrosswordSolverProps } from './CrosswordSolverProps';
import {
  areAllEligibleCluesComplete,
  buildDisplaySlots,
  buildFreshClueState,
  buildSolvedClueState,
  ClueSolverState,
  dbScoreToUi,
  formatUiScore,
  getAnswer,
  getClueText,
  getDisplayText,
  getEligibleClues,
  getScoreBadgeBackground,
  isClueComplete,
  isCluePreviouslyCompleted,
  parseCrosswordSolverDate,
  selectHintIndex,
} from './crosswordSolverHelpers';
import styles from './CrosswordSolver.module.scss';

function CrosswordSolver({ api = CruziApi }: CrosswordSolverProps) {
  const navigate = useNavigate();
  const { publicationOrId } = useParams<{ publicationOrId?: string }>();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const id = dateParam ? undefined : publicationOrId;
  const publication = dateParam ? publicationOrId : undefined;
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
  const collectionCompletedRef = useRef(false);
  const answerInputRef = useRef<AnswerInputHandle>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const clueDraftsRef = useRef<Record<string, ClueSolverState>>({});
  const sessionCompletedClueIdsRef = useRef<Set<string>>(new Set());
  const submittedClueIdsRef = useRef<Set<string>>(new Set());

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
  const displayText = useMemo(
    () => (currentClue ? getDisplayText(currentClue) : ''),
    [currentClue]
  );
  const displaySlots = useMemo(
    () => buildDisplaySlots(displayText, answer),
    [displayText, answer]
  );
  const clueText = currentClue ? getClueText(currentClue) : '';
  const totalClues = eligibleClues.length;
  const isLastClue = currentClueIndex >= totalClues - 1;

  const puzzleDate = useMemo(() => {
    if (crossword?.metadata1) {
      return parseCalendarDate(crossword.metadata1);
    }
    if (crossword?.puzzle?.date) {
      return parseCalendarDate(crossword.puzzle.date);
    }
    if (dateParam) {
      return parseCrosswordSolverDate(dateParam) ?? new Date();
    }
    return new Date();
  }, [crossword?.metadata1, crossword?.puzzle?.date, dateParam]);

  const fetchCrossword = useCallback(async () => {
    if (id) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getCrossword({ id });
        setCrossword(data);
        setCurrentClueIndex(0);
        setCrosswordHintsUsed(data.progressData?.hintsUsed ?? 0);
        clueDraftsRef.current = {};
        sessionCompletedClueIdsRef.current = new Set();
        submittedClueIdsRef.current = new Set();
        collectionCompletedRef.current = false;
      } catch (err) {
        console.error('Error fetching crossword:', err);
        setError('Failed to load crossword. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!publication || !dateParam) {
      setError('Invalid crossword URL.');
      setIsLoading(false);
      return;
    }

    if (!parseCrosswordSolverDate(dateParam)) {
      setError('Date must be formatted as MM/DD/YYYY.');
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
      setCrosswordHintsUsed(data.progressData?.hintsUsed ?? 0);
      clueDraftsRef.current = {};
      sessionCompletedClueIdsRef.current = new Set();
      submittedClueIdsRef.current = new Set();
      collectionCompletedRef.current = false;
    } catch (err) {
      console.error('Error fetching crossword:', err);
      setError('Failed to load crossword. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [api, id, publication, dateParam]);

  useEffect(() => {
    fetchCrossword();
  }, [fetchCrossword]);

  const applyClueState = useCallback(
    (state: ClueSolverState, clue: NonNullable<typeof currentClue>) => {
      setUserInput(state.userInput);
      setRevealedMask(state.revealedMask);
      setClueHintsUsed(state.clueHintsUsed);
      setIsSolved(state.isSolved);
      submittedRef.current =
        isCluePreviouslyCompleted(clue) ||
        submittedClueIdsRef.current.has(clue.id);
    },
    []
  );

  const saveCurrentClueDraft = useCallback(() => {
    const clueId = currentClue?.id;
    if (!clueId || !answer.length || isSolved) return;
    if (
      isCluePreviouslyCompleted(currentClue) ||
      sessionCompletedClueIdsRef.current.has(clueId)
    ) {
      return;
    }

    clueDraftsRef.current[clueId] = {
      userInput,
      revealedMask,
      clueHintsUsed,
      isSolved: false,
    };
  }, [currentClue, answer.length, isSolved, userInput, revealedMask, clueHintsUsed]);

  const refocusAnswerInput = useCallback(() => {
    requestAnimationFrame(() => answerInputRef.current?.focus());
  }, []);

  const loadClueState = useCallback(
    (clue: NonNullable<typeof currentClue>, answerText: string): ClueSolverState => {
      const previouslyCompleted =
        isCluePreviouslyCompleted(clue) ||
        sessionCompletedClueIdsRef.current.has(clue.id);

      if (previouslyCompleted) {
        return buildSolvedClueState(
          answerText,
          clue.progressData?.hintsUsed ?? 0
        );
      }

      const draft = clueDraftsRef.current[clue.id];
      if (draft) {
        const solved = isClueComplete(
          answerText,
          draft.userInput,
          draft.revealedMask
        );
        if (solved) {
          sessionCompletedClueIdsRef.current.add(clue.id);
        }
        return { ...draft, isSolved: solved };
      }

      return buildFreshClueState(answerText.length);
    },
    []
  );

  useEffect(() => {
    if (!currentClue || !answer.length) {
      setRevealedMask([]);
      setUserInput('');
      setClueHintsUsed(0);
      setIsSolved(false);
      submittedRef.current = false;
      return;
    }

    applyClueState(loadClueState(currentClue, answer), currentClue);
  }, [currentClueIndex, currentClue, answer, applyClueState, loadClueState]);

  const preventButtonFocus = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const withInputRefocus = useCallback(
    (handler: () => void) => () => {
      handler();
      refocusAnswerInput();
    },
    [refocusAnswerInput]
  );

  useEffect(() => {
    if (!answer.length || isSolved || !currentClue?.id) return;
    if (isClueComplete(answer, userInput, revealedMask)) {
      sessionCompletedClueIdsRef.current.add(currentClue.id);
      setIsSolved(true);
    }
  }, [answer, userInput, revealedMask, isSolved, currentClue?.id]);

  useEffect(() => {
    if (
      !isSolved ||
      !user ||
      !currentClue?.id ||
      submittedRef.current ||
      !sessionCompletedClueIdsRef.current.has(currentClue.id)
    ) {
      return;
    }

    submittedRef.current = true;
    submittedClueIdsRef.current.add(currentClue.id);
    sessionCompletedClueIdsRef.current.add(currentClue.id);
    delete clueDraftsRef.current[currentClue.id];

    api
      .submitCrosswordResponse({
        clueId: currentClue.id,
        hintsUsed: clueHintsUsed,
      })
      .catch((err) => {
        console.error('Error submitting crossword response:', err);
        sessionCompletedClueIdsRef.current.delete(currentClue.id);
        submittedClueIdsRef.current.delete(currentClue.id);
        submittedRef.current = false;
      });
  }, [isSolved, user, currentClue?.id, clueHintsUsed, api]);

  useEffect(() => {
    const sessionCompleted = sessionCompletedClueIdsRef.current;
    const allComplete = areAllEligibleCluesComplete(eligibleClues, sessionCompleted);
    const completedInSession = eligibleClues.some(
      ({ clue }) => clue.id && sessionCompleted.has(clue.id)
    );

    if (
      !user ||
      !crossword?.id ||
      collectionCompletedRef.current ||
      !allComplete ||
      !completedInSession
    ) {
      return;
    }

    collectionCompletedRef.current = true;
    api.completeCrossword(crossword.id).catch((err) => {
      console.error('Error completing crossword:', err);
      collectionCompletedRef.current = false;
    });
  }, [isSolved, user, crossword?.id, eligibleClues, api]);

  const handleBack = () => {
    navigate(`/crosswords?date=${formatCrosswordDateForQuery(puzzleDate)}`);
  };

  const goToPreviousClue = () => {
    if (currentClueIndex > 0) {
      saveCurrentClueDraft();
      setCurrentClueIndex((i) => i - 1);
    }
  };

  const goToNextClue = () => {
    if (currentClueIndex < totalClues - 1) {
      saveCurrentClueDraft();
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
    const prompt = `Explain why "${clueText}" was used as a crossword clue for "${answer}".`;
    try {
      await navigator.clipboard.writeText(prompt);
      setToastMessage('AI query copied to clipboard');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleFinish = () => {
    handleBack();
  };

  const handleSolvedPrimaryAction = () => {
    if (isLastClue) {
      handleFinish();
    } else {
      goToNextClue();
    }
  };

  useEffect(() => {
    if (!isSolved) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (e.target instanceof HTMLButtonElement) return;

      e.preventDefault();
      handleSolvedPrimaryAction();
      refocusAnswerInput();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSolved, isLastClue, currentClueIndex, totalClues, refocusAnswerInput]);

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
          Hints used:{' '}
          <span className={styles.hintsCount}>{crosswordHintsUsed}</span>
        </div>
        <div className={styles.carousel}>
          <button
            type="button"
            className={styles.carouselButton}
            onMouseDown={preventButtonFocus}
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
            onMouseDown={preventButtonFocus}
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
        ref={answerInputRef}
        clueId={currentClue.id}
        answer={answer}
        displaySlots={displaySlots}
        userInput={userInput}
        revealedMask={revealedMask}
        isSolved={isSolved}
        onUserInputChange={setUserInput}
      />

      <footer className={styles.footer}>
        {!isSolved ? (
          <button
            type="button"
            className={styles.hintButton}
            onMouseDown={preventButtonFocus}
            onClick={withInputRefocus(handleHint)}
          >
            Hint
          </button>
        ) : (
          <div className={styles.solvedActions}>
            <button
              type="button"
              className={styles.explainButton}
              onMouseDown={preventButtonFocus}
              onClick={withInputRefocus(handleExplain)}
            >
              Explain
            </button>
            {isLastClue ? (
              <button
                type="button"
                className={styles.nextButton}
                onMouseDown={preventButtonFocus}
                onClick={withInputRefocus(handleSolvedPrimaryAction)}
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                className={styles.nextButton}
                onMouseDown={preventButtonFocus}
                onClick={withInputRefocus(handleSolvedPrimaryAction)}
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
