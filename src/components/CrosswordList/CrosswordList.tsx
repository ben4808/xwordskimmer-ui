import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { ClueCollection, Publications } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatDate,
  formatCrosswordDateForQuery,
  parseCrosswordDateFromQuery,
} from '../../lib/utils';
import CrosswordCalendar from '../CrosswordCalendar/CrosswordCalendar';
import { getCrosswordSolverPath } from '../CrosswordSolver/crosswordSolverHelpers';
import { CrosswordListProps } from './CrosswordListProps';
import styles from './CrosswordList.module.scss';
import crosswordThumb from '../../../crossword_thumb.png';

function getPublicationName(crossword: ClueCollection): string {
  const source = crossword.source;
  if (!source) {
    return 'Unknown';
  }
  const publication = Object.values(Publications).find(
    (entry) => entry.id === source
  );
  return publication?.name ?? 'Unknown';
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shiftCalendarDay(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

function getCrosswordAuthor(crossword: ClueCollection): string {
  return (
    crossword.author ||
    crossword.puzzle?.authors?.[0] ||
    crossword.creator?.firstName ||
    'Unknown'
  );
}

function CrosswordList({ api = CruziApi }: CrosswordListProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const selectedDate = useMemo(
    () => parseCrosswordDateFromQuery(searchParams.get('date')),
    [searchParams]
  );

  const [crosswords, setCrosswords] = useState<ClueCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const dateQueryString = formatCrosswordDateForQuery(selectedDate);

  const fetchCrosswords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getCrosswordList(dateQueryString);
      setCrosswords(response);
    } catch (err) {
      console.error('Error fetching crosswords:', err);
      setError('Failed to load crosswords. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [api, dateQueryString, user]);

  useEffect(() => {
    fetchCrosswords();
  }, [fetchCrosswords]);

  const handleCrosswordClick = (crossword: ClueCollection) => {
    const path = getCrosswordSolverPath(crossword);
    if (path) {
      navigate(path);
    }
  };

  const handleDateSelect = (date: Date) => {
    navigate(`/crosswords?date=${formatCrosswordDateForQuery(date)}`);
  };

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const isSelectedDateToday = isSameCalendarDay(selectedDate, today);

  const shiftSelectedDate = (delta: number) => {
    const nextDate = shiftCalendarDay(selectedDate, delta);
    if (delta > 0 && nextDate.getTime() > today.getTime()) {
      return;
    }
    handleDateSelect(nextDate);
  };

  const calculateProgressPercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  const renderProgressBar = (crossword: ClueCollection) => {
    if (!user) return null;

    const total = crossword.clueCount6Plus ?? 0;
    if (total === 0) return null;

    const progress = crossword.progressData;
    const completed = progress?.completed ?? 0;
    const inProgress = progress?.inProgress ?? 0;
    const unseen = Math.max(0, total - completed);

    return (
      <div className={styles.progressBar}>
        <div
          className={styles.progressCompleted}
          style={{ width: `${calculateProgressPercentage(completed, total)}%` }}
        />
        <div
          className={styles.progressInProgress}
          style={{ width: `${calculateProgressPercentage(inProgress, total)}%` }}
        />
        <div
          className={styles.progressUnseen}
          style={{ width: `${calculateProgressPercentage(unseen, total)}%` }}
        />
      </div>
    );
  };

  const renderCrosswordCard = (crossword: ClueCollection) => {
    const clueCount = crossword.clueCount ?? 0;
    const clueCount6Plus = crossword.clueCount6Plus ?? 0;
    const author = getCrosswordAuthor(crossword);

    return (
      <div
        key={crossword.id}
        className={styles.crosswordCard}
        onClick={() => handleCrosswordClick(crossword)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCrosswordClick(crossword);
          }
        }}
      >
        <div className={styles.thumbnail}>
          <img src={crosswordThumb} alt="" />
        </div>
        <div className={styles.details}>
          <p className={styles.publication}>{getPublicationName(crossword)}</p>
          <h3 className={styles.title}>{crossword.title}</h3>
          <p className={styles.meta}>
            By {author} • {clueCount} clues ({clueCount6Plus} of at least 6 letters)
          </p>
          {renderProgressBar(crossword)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.crosswordListPage}>
      <div className={styles.headerRow}>
        <div className={styles.dateNav}>
          <button
            type="button"
            className={styles.dateNavButton}
            onClick={() => shiftSelectedDate(-1)}
            aria-label="Previous day"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h1 className={styles.selectedDate}>{formatDate(selectedDate)}</h1>
          <button
            type="button"
            className={styles.dateNavButton}
            onClick={() => shiftSelectedDate(1)}
            disabled={isSelectedDateToday}
            aria-label="Next day"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
        <button
          type="button"
          className={styles.calendarButton}
          onClick={() => setIsCalendarOpen(true)}
          aria-label="Open calendar and stats"
        >
          <FontAwesomeIcon icon={faCalendarDays} />
          <span>Calendar/Stats</span>
        </button>
      </div>

      <div className={styles.contentArea}>
        {isLoading && <div className={styles.loading}>Loading crosswords...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!isLoading && !error && crosswords.length === 0 && (
          <div className={styles.noCrosswords}>
            No crosswords found for this date.
          </div>
        )}
        {!isLoading && !error && crosswords.length > 0 && (
          <div className={styles.crosswordList}>
            {crosswords.map((crossword) => renderCrosswordCard(crossword))}
          </div>
        )}
      </div>

      {isCalendarOpen && (
        <CrosswordCalendar
          api={api}
          selectedDate={selectedDate}
          onClose={() => setIsCalendarOpen(false)}
          onDateSelect={handleDateSelect}
        />
      )}
    </div>
  );
}

export default CrosswordList;
