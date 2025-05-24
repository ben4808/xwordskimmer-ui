/**
In React, write a component that displays a list of crosswords with the following features:
1. Each crossword should have a title, a date, a source, an author, and a space on the left for a thumbnail image.
3. Each crossword should be clickable and navigate to a detailed view of the crossword (no need to implement the detailed view).
4. The component should be styled using an SCSS module.
5. The component should be responsive and work well on different screen sizes.
6. The component should use TypeScript for type safety.
7. The component should be reusable and accept props for the crossword data.
8. The component should handle loading and error states gracefully.
 */

import { useEffect, useState } from "react";
import { CrosswordListProps } from "./CrosswordListProps";
import styles from './CrosswordList.module.scss';
import { useNavigate } from "react-router";
import { getCrosswordList } from "../../api/mockApi";
import { ClueCollection } from "../../models/ClueCollection";
import { formatDate } from "../../lib/utils";

function CrosswordList(props: CrosswordListProps) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [crosswords, setCrosswords] = useState([] as ClueCollection[]);

    useEffect(() => {
        async function fetchData() {
            try {
                let response = await getCrosswordList(props.date)
                setCrosswords(response);
            } catch (error) {
                console.error('Error fetching crosswords:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

    if (isLoading) {
      return <div className={styles.loading}>Loading...</div>;
    } 

    return (
    <div className={styles.listContainer}>
        {crosswords.map(crossword => (
        <div
            key={crossword.id}
            className={styles.crosswordCard}
            onClick={() => navigate(`/crossword/NYT/2025-05-05`)}
        >
            <div className={styles.thumbnail} style={{ backgroundColor: 'lightgray' }} />
            <div className={styles.content}>
            <h3 className={styles.title}>{crossword.name}</h3>
            <p className={styles.meta}>{formatDate(crossword.date)}</p>
            <p className={styles.meta}>By Author</p>
            <p className={styles.meta}>Source: {crossword.source}</p>
            </div>
        </div>
        ))}
    </div>
    )
};

export default CrosswordList;
