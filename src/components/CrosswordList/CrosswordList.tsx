/**
In React, write a component that displays a list of crosswords with the following features:
1. Each crossword should have a title, a date, a source, an author, and a space on the left for a thumbnail image.
3. Each crossword should be clickable and navigate to a detailed view of the crossword (no need to implement the detailed view).
4. The component should be styled using an SCSS module or styled-components.
5. The component should be responsive and work well on different screen sizes.
6. The component should use TypeScript for type safety.
7. The component should be reusable and accept props for the crossword data.
8. The component should handle loading and error states gracefully.
 */

import { useState } from "react";
import { CrosswordListProps } from "./CrosswordListProps";
import styles from './CrosswordList.scss';
import { useNavigate } from "react-router";

function CrosswordList(props: CrosswordListProps) {

    
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    if (isLoading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
    <div className={styles.listContainer}>
        {props.crosswords.map(crossword => (
        <div
            key={crossword.id}
            className={styles.crosswordCard}
            onClick={() => navigate(`/crossword/${crossword.id}`)}
        >
            <div className={styles.thumbnail} style={{ backgroundImage: `url(${crossword.thumbnail})` }} />
            <div className={styles.content}>
            <h3 className={styles.title}>{crossword.title}</h3>
            <p className={styles.meta}>{crossword.date}</p>
            <p className={styles.meta}>By {crossword.author}</p>
            <p className={styles.meta}>Source: {crossword.source}</p>
            </div>
        </div>
        ))}
    </div>
    )
};

export default CrosswordList;
