import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { ClueCollection, ClueWithProgress } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import { getPuzzleExternalLink } from '../../lib/crosswordDisplay';
import { formatCrosswordDateForQuery, parseCalendarDate } from '../../lib/utils';
import CrosswordInfoCard from '../CrosswordList/CrosswordInfoCard';
import { AnswerInput } from './AnswerInput';
import ClassifyModal from './ClassifyModal';
import { CrosswordSolverProps } from './CrosswordSolverProps';
import { EntryDetailsModal } from './EntryDetailsModal';
import {
  areAllEligibleCluesComplete,
  buildDisplaySlots,
  buildFreshClueState,
  buildSolvedClueState,
  ClassifyFillItem,
  ClueSolverState,
  fillUserInputToFirstUnsolved,
  getAnswer,
  getClassifyFillItems,
  getClueText,
  getDisplayText,
  getEligibleClues,
  getOrderedClues,
  getPuzzleClueColumns,
  getSenseSummaryBaseDisplay,
  hasMatchedSense,
  isClueComplete,
  isCluePreviouslyCompleted,
  parseCrosswordSolverDate,
  PuzzleClueItem,
  selectHintIndex,
} from './crosswordSolverHelpers';
import {
  classifyDesirability,
  classifyGettableNess,
  getDesirabilityColor,
  getDisplayFlagLabels,
  getGettableNessColor,
  hasAvoidDesirabilityFlags,
  hasDisplayWarningFlags,
  isLikelyNytDebut,
  isRatingUnset,
  MISSING_RATING_COLOR,
} from './entryRatings';
import styles from './CrosswordSolver.module.scss';

function RatingDot({
  label,
  color,
  outlined,
}: {
  label: string;
  color: string;
  outlined?: boolean;
}) {
  return (
    <span
      className={`${styles.dot} ${outlined ? styles.dotOutlined : ''}`}
      style={{ backgroundColor: color }}
      title={label}
      aria-label={label}
    />
  );
}

function ClueRow({
  item,
  minigameOn,
  state,
  isActive,
  onSecondLineClick,
  onUserInputChange,
  onHint,
  onReveal,
  onActivate,
}: {
  item: PuzzleClueItem;
  minigameOn: boolean;
  state: ClueSolverState;
  isActive: boolean;
  onSecondLineClick: () => void;
  onUserInputChange: (value: string) => void;
  onHint: () => void;
  onReveal: () => void;
  onActivate: () => void;
}) {
  const clue = item.clue;
  const answer = getAnswer(clue);
  const displayText = getDisplayText(clue);
  const displaySlots = buildDisplaySlots(displayText, answer);
  const ratingSource = hasMatchedSense(clue) ? clue.sense : clue.entry;
  const gettableMissing =
    isRatingUnset(ratingSource?.unityBucket) ||
    isRatingUnset(ratingSource?.familiarityBucket);
  const desirabilityMissing =
    isRatingUnset(ratingSource?.qualityBucket) &&
    !hasAvoidDesirabilityFlags(clue.sense?.tags, clue.entry?.tags);
  const gettableNess = classifyGettableNess(
    ratingSource?.unityBucket,
    ratingSource?.familiarityBucket
  );
  const desirability = classifyDesirability(
    ratingSource?.qualityBucket,
    clue.sense?.tags,
    clue.entry?.tags
  );
  const warningFlags = getDisplayFlagLabels(clue.sense?.tags, clue.entry?.tags);
  const showWarning = hasDisplayWarningFlags(clue.sense?.tags, clue.entry?.tags);
  const nytDebut = isLikelyNytDebut(clue.entry?.tags);
  const answerLengthLabel = `${answer.length} letter${answer.length === 1 ? '' : 's'}`;
  const fromBaseDisplay = getSenseSummaryBaseDisplay(clue);
  const secondLineOpensDetails = hasMatchedSense(clue) && (!minigameOn || state.isSolved);
  const secondLineActivates = minigameOn && !state.isSolved;
  const secondLineClickable = secondLineOpensDetails || secondLineActivates;
  const showSenseSummary = secondLineOpensDetails;
  const senseSummary = clue.sense?.summary?.trim();

  const handleSecondLineKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSecondLineClick();
    }
  };

  return (
    <div className={styles.clueItem}>
      <div className={styles.clueHead}>
        <span className={styles.clueNumber}>{item.clueNumber}</span>
        <span className={styles.cluePrompt}>
          {getClueText(clue)}
          {answer.length > 0 && (
            <span className={styles.clueLength}>{answerLengthLabel}</span>
          )}
        </span>
      </div>
      <div className={styles.answerRow}>
        <div
          className={`${styles.answerLine} ${secondLineOpensDetails ? styles.answerLineLink : ''} ${secondLineClickable ? styles.answerLineClickable : ''}`}
          role={secondLineOpensDetails ? 'button' : undefined}
          tabIndex={secondLineOpensDetails ? 0 : undefined}
          onClick={secondLineClickable ? onSecondLineClick : undefined}
          onKeyDown={secondLineOpensDetails ? handleSecondLineKeyDown : undefined}
          aria-label={
            secondLineOpensDetails
              ? `Details for ${displayText}`
              : secondLineActivates
                ? `Solve ${displayText}`
                : undefined
          }
        >
          <span className={styles.dots}>
            <RatingDot
              label={gettableMissing ? 'Unknown' : gettableNess}
              color={
                gettableMissing
                  ? MISSING_RATING_COLOR
                  : getGettableNessColor(gettableNess)
              }
              outlined={!gettableMissing && gettableNess === 'Not a Thing'}
            />
            <RatingDot
              label={desirabilityMissing ? 'Unknown' : desirability}
              color={
                desirabilityMissing
                  ? MISSING_RATING_COLOR
                  : getDesirabilityColor(desirability)
              }
            />
            {showWarning && (
              <span
                className={styles.warningEmoji}
                title={warningFlags.join(', ')}
                aria-label={warningFlags.join(', ')}
              >
                ⚠️
              </span>
            )}
          </span>
          {minigameOn ? (
            <AnswerInput
              clueId={clue.id}
              answer={answer}
              displaySlots={displaySlots}
              userInput={state.userInput}
              revealedMask={state.revealedMask}
              isSolved={state.isSolved}
              nytDebut={nytDebut}
              compact
              active={isActive}
              onUserInputChange={onUserInputChange}
              onHint={onHint}
              onActivate={onActivate}
            />
          ) : (
            <span
              className={`${styles.answerText} ${nytDebut ? styles.debutAnswer : ''}`}
              title={nytDebut ? 'Likely NYT debut' : undefined}
            >
              {displayText}
            </span>
          )}
          {showSenseSummary && (fromBaseDisplay || senseSummary) && (
            <span className={styles.senseSummary}>
              {fromBaseDisplay && (
                <span className={styles.fromBasePrefix}>
                  From <span className={styles.fromBaseEntry}>{fromBaseDisplay}</span>:{' '}
                </span>
              )}
              {senseSummary}
            </span>
          )}
        </div>
        {minigameOn && !state.isSolved && (
          <div className={styles.inlineActions}>
            <button
              type="button"
              className={styles.inlineActionButton}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onHint();
              }}
            >
              Hint
            </button>
            <button
              type="button"
              className={styles.inlineActionButton}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onReveal();
              }}
            >
              Reveal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CrosswordSolver({ api = CruziApi }: CrosswordSolverProps) {
  const navigate = useNavigate();
  const { publicationOrId } = useParams<{ publicationOrId?: string }>();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const id = dateParam ? undefined : publicationOrId;
  const publication = dateParam ? publicationOrId : undefined;
  const { user, userSettings } = useAuth();
  const minigameOn = Boolean(user) && userSettings.crosswordSolverMinigame;

  const [crossword, setCrossword] = useState<ClueCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clueStates, setClueStates] = useState<Record<string, ClueSolverState>>({});
  const [activeClueId, setActiveClueId] = useState<string | null>(null);
  const [detailsClue, setDetailsClue] = useState<ClueWithProgress | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [classifyFillItems, setClassifyFillItems] = useState<ClassifyFillItem[] | undefined>(undefined);
  const [keyboardPaddingBottom, setKeyboardPaddingBottom] = useState(0);

  const collectionCompletedRef = useRef(false);
  const sessionCompletedClueIdsRef = useRef<Set<string>>(new Set());
  const submittedClueIdsRef = useRef<Set<string>>(new Set());
  const previouslyCompletedIdsRef = useRef<Set<string>>(new Set());

  const orderedClues = useMemo(
    () => getOrderedClues(crossword?.clues),
    [crossword?.clues]
  );
  const eligibleClues = useMemo(
    () => getEligibleClues(crossword?.clues),
    [crossword?.clues]
  );
  const clueColumns = useMemo(
    () => getPuzzleClueColumns(crossword?.clues),
    [crossword?.clues]
  );

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

  const puzzleLink = useMemo(
    () => (crossword ? getPuzzleExternalLink(crossword) : null),
    [crossword]
  );

  const initializeClueStates = useCallback((data: ClueCollection) => {
    const next: Record<string, ClueSolverState> = {};
    const previouslyCompleted = new Set<string>();
    for (const item of getOrderedClues(data.clues)) {
      const clue = item.clue;
      if (!clue.id) continue;
      const answer = getAnswer(clue);
      if (isCluePreviouslyCompleted(clue)) {
        previouslyCompleted.add(clue.id);
        next[clue.id] = buildSolvedClueState(
          answer,
          clue.progressData?.hintsUsed ?? 0
        );
      } else {
        next[clue.id] = buildFreshClueState(answer.length);
      }
    }
    previouslyCompletedIdsRef.current = previouslyCompleted;
    sessionCompletedClueIdsRef.current = new Set();
    submittedClueIdsRef.current = new Set();
    collectionCompletedRef.current = false;
    setClueStates(next);
    setActiveClueId(null);
  }, []);

  const fetchCrossword = useCallback(async () => {
    if (id) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getCrossword({ id });
        setCrossword(data);
        initializeClueStates(data);
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
      initializeClueStates(data);
    } catch (err) {
      console.error('Error fetching crossword:', err);
      setError('Failed to load crossword. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [api, id, publication, dateParam, initializeClueStates]);

  const refreshCrosswordEntries = useCallback(async () => {
    try {
      const data = id
        ? await api.getCrossword({ id })
        : publication && dateParam
          ? await api.getCrossword({ publicationId: publication, date: dateParam })
          : null;
      if (data) {
        setCrossword(data);
      }
    } catch (err) {
      console.error('Error refreshing crossword entries:', err);
    }
  }, [api, id, publication, dateParam]);

  useEffect(() => {
    fetchCrossword();
  }, [fetchCrossword]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const updateKeyboardPadding = () => {
      const obscuredHeight =
        window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardPaddingBottom(Math.max(0, obscuredHeight));
    };

    viewport.addEventListener('resize', updateKeyboardPadding);
    viewport.addEventListener('scroll', updateKeyboardPadding);
    updateKeyboardPadding();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardPadding);
      viewport.removeEventListener('scroll', updateKeyboardPadding);
    };
  }, []);

  const updateClueState = useCallback(
    (clueId: string, updater: (current: ClueSolverState) => ClueSolverState) => {
      setClueStates((prev) => {
        const current = prev[clueId];
        if (!current) return prev;
        const next = updater(current);
        if (
          next.isSolved &&
          !current.isSolved &&
          !previouslyCompletedIdsRef.current.has(clueId)
        ) {
          sessionCompletedClueIdsRef.current.add(clueId);
        }
        return { ...prev, [clueId]: next };
      });
    },
    []
  );

  useEffect(() => {
    if (!minigameOn || !user) return;

    for (const [clueId, state] of Object.entries(clueStates)) {
      if (
        !state.isSolved ||
        previouslyCompletedIdsRef.current.has(clueId) ||
        submittedClueIdsRef.current.has(clueId)
      ) {
        continue;
      }

      submittedClueIdsRef.current.add(clueId);
      sessionCompletedClueIdsRef.current.add(clueId);
      api
        .submitCrosswordResponse({
          clueId,
          hintsUsed: state.clueHintsUsed,
        })
        .catch((err) => {
          console.error('Error submitting crossword response:', err);
          sessionCompletedClueIdsRef.current.delete(clueId);
          submittedClueIdsRef.current.delete(clueId);
        });
    }
  }, [clueStates, minigameOn, user, api]);

  useEffect(() => {
    if (!minigameOn || !user || !crossword?.id || collectionCompletedRef.current) {
      return;
    }

    const sessionCompleted = sessionCompletedClueIdsRef.current;
    const allComplete = areAllEligibleCluesComplete(eligibleClues, sessionCompleted);
    const completedInSession = eligibleClues.some(
      ({ clue }) => clue.id && sessionCompleted.has(clue.id)
    );

    if (!allComplete || !completedInSession) {
      return;
    }

    collectionCompletedRef.current = true;
    api.completeCrossword(crossword.id).catch((err) => {
      console.error('Error completing crossword:', err);
      collectionCompletedRef.current = false;
    });
  }, [clueStates, minigameOn, user, crossword?.id, eligibleClues, api]);

  const handleBack = () => {
    navigate(`/crosswords?date=${formatCrosswordDateForQuery(puzzleDate)}`);
  };

  const activateClue = useCallback(
    (clue: ClueWithProgress) => {
      if (!clue.id || !minigameOn) return;
      const answer = getAnswer(clue);
      updateClueState(clue.id, (current) => {
        if (current.isSolved) return current;
        return {
          ...current,
          userInput: fillUserInputToFirstUnsolved(
            answer,
            current.userInput,
            current.revealedMask
          ),
        };
      });
      setActiveClueId(clue.id);
    },
    [minigameOn, updateClueState]
  );

  const openClueDetails = (clue: ClueWithProgress) => {
    if (!hasMatchedSense(clue)) return;
    setActiveClueId(null);
    setDetailsClue(clue);
  };

  const handleSecondLineClick = (clue: ClueWithProgress) => {
    const state = clue.id ? clueStates[clue.id] : undefined;
    if (minigameOn && state && !state.isSolved) {
      activateClue(clue);
      return;
    }
    openClueDetails(clue);
  };

  const handleUserInputChange = (clue: ClueWithProgress, value: string) => {
    if (!clue.id) return;
    const answer = getAnswer(clue);
    const revealedMask = clueStates[clue.id]?.revealedMask ?? [];
    const solved = isClueComplete(answer, value, revealedMask);
    updateClueState(clue.id, (current) => ({
      ...current,
      userInput: value,
      isSolved: isClueComplete(answer, value, current.revealedMask),
    }));
    if (solved) {
      setActiveClueId((active) => (active === clue.id ? null : active));
    }
  };

  const handleHint = (clue: ClueWithProgress) => {
    if (!clue.id) return;
    const answer = getAnswer(clue);
    const current = clueStates[clue.id];
    if (!current || current.isSolved || !answer.length) return;

    const index = selectHintIndex(answer, current.userInput, current.revealedMask);
    if (index == null) return;

    const revealedMask = [...current.revealedMask];
    revealedMask[index] = true;
    let userInput = current.userInput;
    if (index < userInput.length && userInput[index] !== answer[index]) {
      userInput = userInput.slice(0, index);
    }
    userInput = fillUserInputToFirstUnsolved(answer, userInput, revealedMask);
    const solved = isClueComplete(answer, userInput, revealedMask);
    updateClueState(clue.id, (state) => ({
      ...state,
      revealedMask,
      userInput,
      clueHintsUsed: state.clueHintsUsed + 1,
      isSolved: solved,
    }));
    if (solved) {
      setActiveClueId((active) => (active === clue.id ? null : active));
    } else {
      setActiveClueId(clue.id);
    }
  };

  const handleReveal = (clue: ClueWithProgress) => {
    if (!clue.id) return;
    const answer = getAnswer(clue);
    if (!answer.length) return;

    updateClueState(clue.id, (state) => {
      if (state.isSolved) return state;
      return buildSolvedClueState(answer, state.clueHintsUsed);
    });
    setActiveClueId((active) => (active === clue.id ? null : active));
  };

  const handleRevealAll = () => {
    setClueStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const { clue } of orderedClues) {
        if (!clue.id) continue;
        const current = next[clue.id];
        if (!current || current.isSolved) continue;
        const answer = getAnswer(clue);
        if (!answer.length) continue;
        next[clue.id] = buildSolvedClueState(answer, current.clueHintsUsed);
        if (!previouslyCompletedIdsRef.current.has(clue.id)) {
          sessionCompletedClueIdsRef.current.add(clue.id);
        }
        changed = true;
      }
      return changed ? next : prev;
    });
    setActiveClueId(null);
  };

  const renderClueColumn = (title: string, items: PuzzleClueItem[]) => {
    if (items.length === 0) return null;
    return (
      <section className={styles.clueColumn}>
        <h2 className={styles.columnTitle}>{title}</h2>
        {items.map((item) => {
          const clueId = item.clue.id ?? `${item.direction}-${item.clueNumber}`;
          const state =
            (item.clue.id && clueStates[item.clue.id]) ||
            buildFreshClueState(getAnswer(item.clue).length);
          return (
            <ClueRow
              key={clueId}
              item={item}
              minigameOn={minigameOn}
              state={state}
              isActive={Boolean(item.clue.id) && item.clue.id === activeClueId}
              onSecondLineClick={() => handleSecondLineClick(item.clue)}
              onUserInputChange={(value) => handleUserInputChange(item.clue, value)}
              onHint={() => handleHint(item.clue)}
              onReveal={() => handleReveal(item.clue)}
              onActivate={() => activateClue(item.clue)}
            />
          );
        })}
      </section>
    );
  };

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

  if (orderedClues.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>No clues for this crossword.</div>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to list</span>
        </button>
      </div>
    );
  }

  const crosswordHintsUsed = Math.max(
    crossword.progressData?.hintsUsed ?? 0,
    Object.values(clueStates).reduce((sum, state) => sum + state.clueHintsUsed, 0)
  );
  const hasUnsolvedClues = orderedClues.some(({ clue }) => {
    if (!clue.id) return false;
    const state = clueStates[clue.id];
    return Boolean(state && !state.isSolved);
  });

  const pageStyle =
    keyboardPaddingBottom > 0
      ? { paddingBottom: `calc(${keyboardPaddingBottom}px + 1.5rem)` }
      : undefined;

  return (
    <div className={styles.page} style={pageStyle}>
      <div className={styles.topSection}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Back to crossword list"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className={styles.puzzleInfo}>
          <CrosswordInfoCard
            crossword={crossword}
            showClueCount6Plus={false}
            puzzleLink={puzzleLink}
          />
        </div>
      </div>

      <div className={styles.cluesSection}>
        <div className={styles.minigameToolbar}>
          {minigameOn && (
            <>
              <div className={styles.hintsCounter}>
                Hints used:{' '}
                <span className={styles.hintsCount}>{crosswordHintsUsed}</span>
              </div>
              <button
                type="button"
                className={styles.revealAllButton}
                onClick={handleRevealAll}
                disabled={!hasUnsolvedClues}
              >
                Reveal All
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.classifyButton}
            onClick={() => setClassifyFillItems(getClassifyFillItems(crossword.clues))}
          >
            Classify
          </button>
        </div>

        <div className={styles.clueColumns}>
          {renderClueColumn('ACROSS', clueColumns.across)}
          {renderClueColumn('DOWN', clueColumns.down)}
        </div>
      </div>

      {detailsClue && (
        <EntryDetailsModal
          clue={detailsClue}
          onClose={() => setDetailsClue(null)}
          onPromptCopied={(message) => {
            setToastMessage(message);
            window.setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}

      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}

      {classifyFillItems && (
        <ClassifyModal
          fillItems={classifyFillItems}
          api={api}
          onClose={() => setClassifyFillItems(undefined)}
          onSaved={refreshCrosswordEntries}
        />
      )}
    </div>
  );
}

export default CrosswordSolver;
