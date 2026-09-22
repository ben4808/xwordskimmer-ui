import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useEffect } from 'react';
import styles from './SettingsModal.module.scss';

interface SettingsModalProps {
  crosswordSolverMinigame: boolean;
  onToggleMinigame: (enabled: boolean) => void;
  onClose: () => void;
}

function SettingsModal({
  crosswordSolverMinigame,
  onToggleMinigame,
  onClose,
}: SettingsModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close settings"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <h2 id="settings-title" className={styles.title}>Settings</h2>

        <label className={styles.settingRow}>
          <span className={styles.settingLabel}>Crossword Solver Minigame</span>
          <button
            type="button"
            className={`${styles.slider} ${crosswordSolverMinigame ? styles.sliderOn : ''}`}
            role="switch"
            aria-checked={crosswordSolverMinigame}
            aria-label="Crossword Solver Minigame"
            onClick={() => onToggleMinigame(!crosswordSolverMinigame)}
          >
            <span className={styles.sliderThumb} />
          </button>
        </label>
      </div>
    </div>
  );
}

export default SettingsModal;
