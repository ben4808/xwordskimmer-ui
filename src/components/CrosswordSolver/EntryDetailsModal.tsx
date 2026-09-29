import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { ClueWithProgress, SenseReference } from 'cruzi-models';
import {
  buildExplainCluePrompt,
  buildInterestingFactPrompt,
  capitalizeFirst,
  getClueText,
  getDisplayText,
  getSenseDisplayText,
  getSpanishTranslations,
  joinWithBullets,
} from './crosswordSolverHelpers';
import {
  classifyDesirability,
  classifyGettableNess,
  getDesirabilityColor,
  getDisplayFlagLabels,
  getGettableNessTextColor,
  hasAvoidDesirabilityFlags,
  isRatingUnset,
  MISSING_RATING_COLOR,
} from './entryRatings';
import styles from './CrosswordSolver.module.scss';

function BucketTag({ value }: { value: string | undefined }) {
  const text = value?.trim();
  if (!text) return <span>—</span>;
  return <span className={styles.bucketTag}>{text}</span>;
}

function ReferenceItem({ reference }: { reference: SenseReference }) {
  const source = reference.referenceSource?.trim();
  const url = reference.referenceUrl?.trim();
  const sourceLabel = source || (url ? 'Link' : '');

  return (
    <li className={styles.referenceItem}>
      <span className={styles.referenceText}>{reference.referenceText}</span>
      {sourceLabel && (
        <>
          {' '}
          {url ? (
            <a
              className={styles.referenceLink}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {sourceLabel}
            </a>
          ) : (
            <span className={styles.referenceSource}>{sourceLabel}</span>
          )}
        </>
      )}
    </li>
  );
}

export function EntryDetailsModal({
  clue,
  onClose,
  onPromptCopied,
}: {
  clue: ClueWithProgress;
  onClose: () => void;
  onPromptCopied: (message: string) => void;
}) {
  const sense = clue.sense;
  const senseDisplayText = getSenseDisplayText(clue);
  const metaLine = joinWithBullets([
    sense?.classification,
    sense?.partOfSpeech,
    capitalizeFirst(sense?.domain),
  ]);
  const gettableNess = classifyGettableNess(
    sense?.unityBucket,
    sense?.familiarityBucket
  );
  const desirability = classifyDesirability(
    sense?.qualityBucket,
    sense?.tags,
    clue.entry?.tags
  );
  const gettableMissing =
    isRatingUnset(sense?.unityBucket) || isRatingUnset(sense?.familiarityBucket);
  const desirabilityMissing =
    isRatingUnset(sense?.qualityBucket) &&
    !hasAvoidDesirabilityFlags(sense?.tags, clue.entry?.tags);
  const gettableColor = gettableMissing
    ? MISSING_RATING_COLOR
    : getGettableNessTextColor(gettableNess);
  const desirabilityColor = desirabilityMissing
    ? MISSING_RATING_COLOR
    : getDesirabilityColor(desirability);
  const flags = getDisplayFlagLabels(sense?.tags, clue.entry?.tags);
  const spanish = getSpanishTranslations(sense);
  const alternatives = (sense?.similarEntries ?? []).map((item) => item.trim()).filter(Boolean);
  const references = sense?.references ?? [];
  const regionality = sense?.tags?.regionality?.trim()
    || Object.entries(sense?.tags ?? {}).find(([tag]) => tag.toLowerCase() === 'regionality')?.[1]?.trim();
  const clueText = getClueText(clue);
  const answerDisplayText = getDisplayText(clue);
  const definition = sense?.definition?.trim();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      onPromptCopied('AI prompt copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-label="Entry details"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close entry details"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className={styles.detailsHeader}>
          <p className={styles.modalEntryText}>{senseDisplayText}</p>
          {metaLine && <p className={styles.detailsMeta}>{metaLine}</p>}
          {sense?.summary && (
            <p className={styles.detailsSummary}>{sense.summary}</p>
          )}
        </div>

        <div className={styles.ratingBoxes}>
          <section className={styles.ratingBox}>
            <h3 className={styles.ratingBoxHeader}>
              Gettability:
              <span className={styles.ratingLevelValue} style={{ color: gettableColor }}>
                {gettableNess}
              </span>
            </h3>
            <p className={styles.ratingMetric}>
              <span>Unity:</span>
              <BucketTag value={sense?.unityBucket} />
            </p>
            <p className={styles.ratingMetric}>
              <span>Familiarity:</span>
              <BucketTag value={sense?.familiarityBucket} />
            </p>
          </section>
          <section className={styles.ratingBox}>
            <h3 className={styles.ratingBoxHeader}>
              Desirability:
              <span className={styles.ratingLevelValue} style={{ color: desirabilityColor }}>
                {desirability}
              </span>
            </h3>
            <p className={styles.ratingMetric}>
              <span>Quality:</span>
              <BucketTag value={sense?.qualityBucket} />
            </p>
            {flags.length > 0 && (
              <div className={styles.ratingFlags}>
                {flags.map((flag) => (
                  <p key={flag} className={styles.ratingFlag}>
                    <span aria-hidden="true">⚠️</span> {flag}
                  </p>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className={styles.detailsSection}>
          <h3 className={styles.detailsSectionTitle}>Clue</h3>
          <div className={styles.clueBodyRow}>
            <p className={styles.detailsBody}>{clueText}</p>
            <div className={styles.clueActions}>
              <button
                type="button"
                className={styles.detailsActionButton}
                onClick={() =>
                  copyPrompt(buildExplainCluePrompt(clueText, answerDisplayText))
                }
              >
                Explain Clue
              </button>
              <button
                type="button"
                className={styles.detailsActionButton}
                onClick={() =>
                  copyPrompt(
                    buildInterestingFactPrompt(
                      senseDisplayText,
                      sense?.classification,
                      sense?.summary
                    )
                  )
                }
              >
                Interesting Fact
              </button>
            </div>
          </div>
        </section>

        {definition && (
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Definition</h3>
            <p className={styles.detailsBody}>{definition}</p>
          </section>
        )}

        {regionality && (
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Regionality</h3>
            <p className={styles.detailsBody}>{regionality}</p>
          </section>
        )}

        {references.length > 0 && (
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>References</h3>
            <ul className={styles.referenceList}>
              {references.map((reference, index) => (
                <ReferenceItem
                  key={reference.id ?? `${reference.referenceText}-${index}`}
                  reference={reference}
                />
              ))}
            </ul>
          </section>
        )}

        {alternatives.length > 0 && (
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Alternatives</h3>
            <p className={styles.detailsBody}>{joinWithBullets(alternatives)}</p>
          </section>
        )}

        {(spanish.natural.length > 0 || spanish.colloquial.length > 0) && (
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Spanish translations</h3>
            {spanish.natural.length > 0 && (
              <div className={styles.translationGroup}>
                <h4 className={styles.detailsSubhead}>Natural</h4>
                <p className={styles.detailsBody}>{joinWithBullets(spanish.natural)}</p>
              </div>
            )}
            {spanish.colloquial.length > 0 && (
              <div className={styles.translationGroup}>
                <h4 className={styles.detailsSubhead}>Colloquial</h4>
                <p className={styles.detailsBody}>{joinWithBullets(spanish.colloquial)}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
