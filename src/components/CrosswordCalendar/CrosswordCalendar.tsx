import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { CrosswordCalendarDay, Publications } from 'cruzi-models';
import CruziApi from '../../api/CruziApi';
import { useAuth } from '../../contexts/AuthContext';
import { CrosswordCalendarProps } from './CrosswordCalendarProps';
import styles from './CrosswordCalendar.module.scss';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const publicationOptions = Object.values(Publications).sort((a, b) =>
  a.name.localeCompare(b.name)
);

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isFutureMonth(year: number, month: number, today: Date): boolean {
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  return year > todayYear || (year === todayYear && month > todayMonth);
}

function isFutureDay(date: Date, today: Date): boolean {
  return startOfDay(date).getTime() > today.getTime();
}

function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function CrosswordCalendar({
  api = CruziApi,
  selectedDate,
  onClose,
  onDateSelect,
}: CrosswordCalendarProps) {
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [publicationId, setPublicationId] = useState(Publications.NYT.id);
  const [calendarDays, setCalendarDays] = useState<CrosswordCalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const maxMonthInputValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const canGoToNextMonth = !isFutureMonth(viewYear, viewMonth + 1, today);
  const calendarCells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const dayDataByDate = useMemo(() => {
    const map = new Map<string, CrosswordCalendarDay>();
    for (const day of calendarDays) {
      map.set(day.date, day);
    }
    return map;
  }, [calendarDays]);

  const fetchCalendar = useCallback(async () => {
    if (!user) {
      setCalendarDays([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCrosswordCalendar(
        publicationId,
        viewMonth + 1,
        viewYear
      );
      setCalendarDays(data);
    } catch (err) {
      console.error('Error fetching crossword calendar:', err);
      setError('Failed to load calendar data. Please try again.');
      setCalendarDays([]);
    } finally {
      setIsLoading(false);
    }
  }, [api, publicationId, user, viewMonth, viewYear]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const openMonthPicker = () => {
    const input = monthInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  };

  const handleMonthInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) return;
    const [yearPart, monthPart] = value.split('-');
    const year = parseInt(yearPart, 10);
    const month = parseInt(monthPart, 10) - 1;
    if (!isNaN(year) && !isNaN(month) && !isFutureMonth(year, month, today)) {
      setViewDate(new Date(year, month, 1));
    }
  };

  const shiftMonth = (delta: number) => {
    setViewDate((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + delta, 1);
      if (isFutureMonth(next.getFullYear(), next.getMonth(), today)) {
        return current;
      }
      return next;
    });
  };

  const handleDayClick = (date: Date) => {
    if (isFutureDay(date, today)) return;
    onDateSelect(date);
    onClose();
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const monthInputValue = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Crossword calendar"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close calendar"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <header className={styles.header}>
          <div className={styles.monthControls}>
            <button
              type="button"
              className={styles.monthNavButton}
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className={styles.monthDisplay}>
              <h2 className={styles.monthTitle}>{formatMonthYear(viewDate)}</h2>
              <button
                type="button"
                className={styles.monthPickerButton}
                onClick={openMonthPicker}
                aria-label="Select month"
              >
                <FontAwesomeIcon icon={faCalendar} />
              </button>
              <input
                ref={monthInputRef}
                type="month"
                className={styles.monthPickerInput}
                value={monthInputValue}
                max={maxMonthInputValue}
                onChange={handleMonthInputChange}
                tabIndex={-1}
                aria-hidden
              />
            </div>
            <button
              type="button"
              className={styles.monthNavButton}
              onClick={() => shiftMonth(1)}
              disabled={!canGoToNextMonth}
              aria-label="Next month"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          {user && (
            <select
              className={styles.publicationSelect}
              value={publicationId}
              onChange={(e) => setPublicationId(e.target.value)}
              aria-label="Crossword source"
            >
              {publicationOptions.map((publication) => (
                <option key={publication.id} value={publication.id}>
                  {publication.name}
                </option>
              ))}
            </select>
          )}
        </header>

        <div className={styles.calendar}>
          <div className={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className={styles.weekdayLabel}>
                {label}
              </div>
            ))}
          </div>

          {isLoading && (
            <div className={styles.loading}>Loading calendar...</div>
          )}
          {error && <div className={styles.error}>{error}</div>}

          {!isLoading && !error && (
            <div className={styles.dayGrid}>
              {calendarCells.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`blank-${index}`}
                      className={`${styles.dayCell} ${styles.dayCellEmpty}`}
                      aria-hidden
                    />
                  );
                }

                const dayData = dayDataByDate.get(toDateKey(date));
                const isSelected = isSameCalendarDay(date, selectedDate);
                const isDisabled = isFutureDay(date, today);
                const cellClassNames = [
                  styles.dayCell,
                  isDisabled ? styles.dayCellDisabled : '',
                  isSelected ? styles.dayCellSelected : '',
                  dayData?.progressState === 'in_progress'
                    ? styles.dayCellInProgress
                    : '',
                  dayData?.progressState === 'completed'
                    ? styles.dayCellCompleted
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={toDateKey(date)}
                    type="button"
                    className={cellClassNames}
                    onClick={() => handleDayClick(date)}
                    disabled={isDisabled}
                  >
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {user && dayData && (
                      <span className={styles.hintsUsed}>{dayData.hintsUsed}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CrosswordCalendar;
