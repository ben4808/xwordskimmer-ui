import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { ClueCollection } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatDate,
  formatCrosswordDateForQuery,
  parseCrosswordDateFromQuery,
} from '../../lib/utils';
import CrosswordCalendar from '../CrosswordCalendar/CrosswordCalendar';
import { CrosswordListProps } from './CrosswordListProps';
import styles from './CrosswordList.module.scss';
import crosswordThumb from '../../../crossword_thumb.png';

function CrosswordList({ api = CruziApi }: CrosswordListProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
    if (!crossword.id) return;
    navigate(`/crossword/${crossword.id}`);
  };

  const handleDateSelect = (date: Date) => {
    setSearchParams({ date: formatCrosswordDateForQuery(date) });
  };

  const calculateProgressPercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  const renderProgressBar = (crossword: ClueCollection) => {
    if (!user) return null;

    const total = crossword.clueCount6Plus ?? crossword.clueCount ?? 0;
    if (total === 0) return null;

    const completed = crossword.progressData?.completed ?? 0;

    return (
      <div className={styles.progressBar}>
        <div
          className={styles.progressCompleted}
          style={{ width: `${calculateProgressPercentage(completed, total)}%` }}
        />
      </div>
    );
  };

  const renderCrosswordCard = (crossword: ClueCollection) => {
    const clueCount = crossword.clueCount6Plus ?? crossword.clueCount ?? 0;
    const author =
      crossword.author || crossword.creator?.firstName || 'Unknown';

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
          <h3 className={styles.title}>{crossword.title}</h3>
          <p className={styles.meta}>
            By: {author} • {clueCount} 6 letters or longer
          </p>
          {renderProgressBar(crossword)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.crosswordListPage}>
      <div className={styles.headerRow}>
        <h1 className={styles.selectedDate}>{formatDate(selectedDate)}</h1>
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
