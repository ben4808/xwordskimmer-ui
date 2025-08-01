/**
In React, write a component that displays a list of crosswords with the following features:
1. The component should display prominently the selected date at the top and include a date selector to change the date.
2. A list of crosswords should be displayed. Each crossword should have a title, a date, a source, an author, and a space on the left for a thumbnail image.
3. Each crossword should be clickable and navigate to a detailed view of the crossword (no need to implement the detailed view).
4. The component should be styled using an SCSS module.
5. The component should be styled in dark mode.
6. The component should be responsive and work well on different screen sizes, including mobile devices.
7. The component should use TypeScript for type safety.
8. The component should accept props for the crossword date.
9. The component should handle loading and error states gracefully.
 */

import { useCallback, useEffect, useState } from "react";
import { CrosswordListProps } from "./CrosswordListProps";
import styles from './CrosswordList.module.scss';
import { useNavigate } from "react-router";
import { ClueCollection } from "../../models/ClueCollection";
import { dateToURL, formatDate } from "../../lib/utils";
import { MockCruziApi } from "../../api/MockCruziApi";
import crosswordThumbnail from '../../../crossword_thumb.png';

function CrosswordList(props: CrosswordListProps) {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState<Date>(props.date);
    const [crosswords, setCrosswords] = useState<ClueCollection[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const api = new MockCruziApi();

    const fetchCrosswords = useCallback(async (date: Date) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getCrosswordList(date);
        setCrosswords(response);
      } catch (err) {
        console.error('Error fetching crosswords:', err);
        setError('Failed to load crosswords. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchCrosswords(selectedDate);
    }, [selectedDate, fetchCrosswords]);

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = new Date(event.target.value);
      setSelectedDate(newDate);
    };

    const handleCrosswordClick = (crossword: ClueCollection) => {
      navigate(`/crossword/${crossword.source}/${dateToURL(crossword.createdDate)}`);
    };

    return (
    <div className={styles.crosswordListPage}>
      <div className={styles.header}>
        <h1 className={styles.selectedDate}>{formatDate(selectedDate)}</h1>
        <div className={styles.dateSelectorContainer}>
          <label htmlFor="date-picker" className={styles.dateLabel}>Select Date:</label>
          <input
            id="date-picker"
            type="date"
            value={dateToURL(selectedDate)}
            onChange={handleDateChange}
            className={styles.datePicker}
          />
        </div>
      </div>

      <div className={styles.contentArea}>
        {isLoading && <div className={styles.loading}>Loading crosswords...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!isLoading && !error && crosswords.length === 0 && (
          <div className={styles.noCrosswords}>No crosswords found for this date.</div>
        )}
        {!isLoading && !error && crosswords.length > 0 && (
          <div className={styles.crosswordList}>
            {crosswords.map((crossword) => (
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
                  <img src={crosswordThumbnail} alt={`Thumbnail for ${crossword.name}`} />
                </div>
                <div className={styles.details}>
                  <p className={styles.meta}>{crossword.source}</p>
                  <h3 className={styles.title}>{crossword.name}</h3>
                  <p className={styles.meta}>By {crossword.author || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrosswordList;
