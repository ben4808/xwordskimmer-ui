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
  showClueCount6Plus?: boolean;
  showProgress?: boolean;
  puzzleLink?: PuzzleExternalLink | null;
  onClick?: () => void;
}

function calculateProgressPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, (value / total) * 100);
}

function CrosswordInfoCard({
  crossword,
  showClueCount6Plus = true,
  showProgress = false,
  puzzleLink,
  onClick,
}: CrosswordInfoCardProps) {
  const clueCount = crossword.clueCount ?? 0;
  const clueCount6Plus = crossword.clueCount6Plus ?? 0;
  const author = getCrosswordAuthor(crossword);
  const clickable = Boolean(onClick);

  const meta = showClueCount6Plus
    ? `By ${author} • ${clueCount} clues (${clueCount6Plus} of at least 6 letters)`
    : `By ${author} • ${clueCount} clues`;

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

  const renderProgressBar = () => {
    if (!showProgress) return null;

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
        {renderProgressBar()}
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
