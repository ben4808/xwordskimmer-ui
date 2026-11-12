import { ClueCollection } from 'cruzi-models';
import crosswordThumb from '../../../crossword_thumb.png';
import {
  getCrosswordAuthor,
  getPublicationName,
  PuzzleExternalLink,
} from '../../lib/crosswordDisplay';
import styles from './CrosswordInfoCard.module.scss';

interface CrosswordInfoCardProps {
  crossword: ClueCollection;
  puzzleLink?: PuzzleExternalLink | null;
  onClick?: () => void;
}

function CrosswordInfoCard({
  crossword,
  puzzleLink,
  onClick,
}: CrosswordInfoCardProps) {
  const clueCount = crossword.clueCount ?? 0;
  const author = getCrosswordAuthor(crossword);
  const clickable = Boolean(onClick);
  const meta = `By ${author} • ${clueCount} clues`;

  const renderPuzzleLink = () => {
    if (!puzzleLink) return null;

    return (
      <>
        {' • '}
        <a
          className={styles.puzzleLink}
          href={puzzleLink.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {puzzleLink.label}
        </a>
      </>
    );
  };

  const content = (
    <>
      <div className={styles.thumbnail}>
        <img src={crosswordThumb} alt="" />
      </div>
      <div className={styles.details}>
        <p className={styles.publication}>{getPublicationName(crossword)}</p>
        <h3 className={styles.title}>{crossword.title}</h3>
        <p className={styles.meta}>
          {meta}
          {renderPuzzleLink()}
        </p>
      </div>
    </>
  );

  if (clickable) {
    return (
      <div
        className={`${styles.crosswordCard} ${styles.clickable}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {content}
      </div>
    );
  }

  return <div className={styles.crosswordCard}>{content}</div>;
}

export default CrosswordInfoCard;
