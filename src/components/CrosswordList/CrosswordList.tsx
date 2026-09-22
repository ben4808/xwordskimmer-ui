import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { ClueCollection } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatDate,
  formatCrosswordDateForQuery,
  parseCrosswordDateFromQuery,
} from '../../lib/utils';
import CrosswordCalendar from '../CrosswordCalendar/CrosswordCalendar';
import { getCrosswordSolverPath } from '../CrosswordSolver/crosswordSolverHelpers';
import CrosswordInfoCard from './CrosswordInfoCard';
import { CrosswordListProps } from './CrosswordListProps';
import styles from './CrosswordList.module.scss';

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
            {crosswords.map((crossword) => (
              <CrosswordInfoCard
                key={crossword.id}
                crossword={crossword}
                showProgress={Boolean(user)}
                onClick={() => handleCrosswordClick(crossword)}
              />
            ))}
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
