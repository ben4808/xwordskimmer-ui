import { useEffect, useState } from 'react';
import { ClassifyRowPayload, ICruziApi } from '../../api/ICruziApi';
import { ClassifyFillItem } from './crosswordSolverHelpers';
import styles from './ClassifyModal.module.scss';

export const ENTRY_TYPE_OPTIONS = [
  'Word',
  'Phrase',
  'Proper Name',
  'Acronym/Abbreviation',
  'Prefix/Suffix',
  'Nonsense',
];

export const UNITY_OPTIONS = [
  'Concept',
  'Collocation',
  'Formula',
  'Partial',
  'Variant',
  'Non-unit',
  'Nonsense',
];

export const FAMILIARITY_OPTIONS = [
  'Literal',
  'Ubiquitous',
  'Common Name',
  'Active',
  'General Knowledge',
  'Inferred',
  'Niche',
  'Obscure',
  'Barely Exists',
  'Nonsense',
];

export const QUALITY_OPTIONS = [
  'Idiomatic',
  'Interesting',
  'Appealing',
  'Positive',
  'Trendy',
  'Normal',
  'Sensitive',
  'Non-unit',
  'Uncommon Inflection',
  'Clunky',
];

interface ClassifyModalProps {
  fillItems: ClassifyFillItem[];
  api: ICruziApi;
  onClose: () => void;
  onSaved?: () => void;
}

function optionsWithCurrent(options: string[], current: string): string[] {
  if (current && !options.includes(current)) return [current, ...options];
  return options;
}

function asText(value: string | null | undefined): string {
  return value == null ? '' : value;
}

function rowsEqual(a: ClassifyRowPayload, b: ClassifyRowPayload): boolean {
  return a.fillWord === b.fillWord
    && a.entry === b.entry
    && a.displayText === b.displayText
    && a.classification === b.classification
    && a.unityBucket === b.unityBucket
    && a.familiarityBucket === b.familiarityBucket
    && a.qualityBucket === b.qualityBucket
    && a.isVulgar === b.isVulgar
    && a.isCrosswordese === b.isCrosswordese
    && a.isBreakfast === b.isBreakfast
    && a.isSensitive === b.isSensitive
    && (a.senseId || '') === (b.senseId || '');
}

function hasUnsavedChanges(rows: ClassifyRowPayload[], originals: ClassifyRowPayload[]): boolean {
  if (rows.length !== originals.length) return true;
  const originalById = new Map(originals.map((row) => [row.rowId, row]));
  return rows.some((row) => {
    const original = originalById.get(row.rowId);
    return !original || !rowsEqual(row, original);
  });
}

function getChangedRows(
  rows: ClassifyRowPayload[],
  originals: ClassifyRowPayload[],
): ClassifyRowPayload[] {
  const originalById = new Map(originals.map((row) => [row.rowId, row]));
  return rows.filter((row) => {
    const original = originalById.get(row.rowId);
    const entry = (row.entry || row.fillWord || '').trim();
    if (!entry) return false;
    return !original || !rowsEqual(row, original);
  }).map((row) => ({
    ...row,
    entry: (row.entry || row.fillWord || '').trim(),
    fillWord: (row.fillWord || row.entry || '').trim(),
    lang: row.lang || 'en',
  }));
}

function nytDisplay(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return 'None';
  return value;
}

function ClassifyModal({ fillItems, api, onClose, onSaved }: ClassifyModalProps) {
  const [rows, setRows] = useState<ClassifyRowPayload[]>([]);
  const [originals, setOriginals] = useState<ClassifyRowPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [confirmClose, setConfirmClose] = useState(false);

  const dirty = hasUnsavedChanges(rows, originals);

  function requestClose() {
    if (saving) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmClose) {
        setConfirmClose(false);
        return;
      }
      requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmClose, dirty, saving, onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setStatus(undefined);

    api.getClassifyEntries(fillItems.map((item) => ({
      fillWord: item.fillWord,
      senseId: item.attachedSenseId,
    })))
      .then((entries) => {
        if (cancelled) return;
        const mapped: ClassifyRowPayload[] = fillItems.map((fillItem) => {
          const match = entries.find((entry) => entry.fillWord === fillItem.fillWord);
          const senseId = fillItem.attachedSenseId || match?.senseId || null;
          return {
            rowId: fillItem.fillWord,
            fillWord: fillItem.fillWord,
            entry: match?.entry ?? null,
            lang: match?.lang ?? null,
            displayText: asText(match?.displayText),
            classification: asText(match?.classification),
            unityBucket: asText(match?.unityBucket),
            familiarityBucket: asText(match?.familiarityBucket),
            qualityBucket: asText(match?.qualityBucket),
            isVulgar: match?.isVulgar === true,
            isCrosswordese: match?.isCrosswordese === true,
            isBreakfast: match?.isBreakfast === true,
            isSensitive: match?.isSensitive === true,
            nytValue: nytDisplay(match?.nytValue),
            senseId,
            senseSummary: asText(match?.senseSummary),
          };
        });
        setRows(mapped);
        setOriginals(mapped.map((row) => ({ ...row })));
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, fillItems]);

  function updateRow(index: number, patch: Partial<ClassifyRowPayload>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setStatus(undefined);
    setError(undefined);
  }

  async function handleSave(closeAfter = false): Promise<boolean> {
    const changed = getChangedRows(rows, originals);
    if (changed.length === 0) {
      setStatus('No changes to save.');
      if (closeAfter) onClose();
      return true;
    }

    setSaving(true);
    setError(undefined);
    setStatus(undefined);

    try {
      await api.saveClassifyEntries(originals, changed);

      const savedIds = new Set(changed.map((row) => row.rowId));
      const nextRows = rows.map((row) => {
        if (!savedIds.has(row.rowId)) return row;
        const entry = (row.entry || row.fillWord || '').trim();
        return { ...row, entry, lang: row.lang || 'en' };
      });
      setRows(nextRows);
      setOriginals(nextRows.map((row) => ({ ...row })));
      setStatus(`Saved ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}.`);
      onSaved?.();
      if (closeAfter) onClose();
      return true;
    } catch (err: any) {
      setError(err.message || String(err));
      setConfirmClose(false);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndClose() {
    await handleSave(true);
  }

  return (
    <div className={styles.overlay} onClick={requestClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Classify fill entries"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.title}>Classify Fill Entries</div>
          <button type="button" className={styles.close} onClick={requestClose} aria-label="Close classify modal">
            ×
          </button>
        </div>
        {loading && <div className={styles.status}>Loading entries…</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Display</th>
                  <th>Classification</th>
                  <th>Unity</th>
                  <th>Familiarity</th>
                  <th>Quality</th>
                  <th>Vulgar</th>
                  <th>Sensitive</th>
                  <th>Crosswordese</th>
                  <th>Breakfast</th>
                  <th>NYT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const hasSense = !!(row.senseId || '').trim();
                  return (
                    <tr key={row.rowId}>
                      <td className={styles.entryCell}>
                        <div className={styles.entryLabel}>{row.fillWord}</div>
                        {!row.entry && <div className={styles.missing}>Not in database</div>}
                        {hasSense ? (
                          <div className={styles.senseSummary}>{row.senseSummary || '(no summary)'}</div>
                        ) : (
                          <div className={styles.missing}>No sense</div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.displayText}
                          onChange={(event) => updateRow(index, { displayText: event.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={row.classification}
                          onChange={(event) => updateRow(index, { classification: event.target.value })}
                        >
                          <option value=""></option>
                          {optionsWithCurrent(ENTRY_TYPE_OPTIONS, row.classification).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.unityBucket}
                          onChange={(event) => updateRow(index, { unityBucket: event.target.value })}
                        >
                          <option value=""></option>
                          {optionsWithCurrent(UNITY_OPTIONS, row.unityBucket).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.familiarityBucket}
                          onChange={(event) => updateRow(index, { familiarityBucket: event.target.value })}
                        >
                          <option value=""></option>
                          {optionsWithCurrent(FAMILIARITY_OPTIONS, row.familiarityBucket).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.qualityBucket}
                          onChange={(event) => updateRow(index, { qualityBucket: event.target.value })}
                        >
                          <option value=""></option>
                          {optionsWithCurrent(QUALITY_OPTIONS, row.qualityBucket).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </td>
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          checked={row.isVulgar}
                          onChange={(event) => updateRow(index, { isVulgar: event.target.checked })}
                        />
                      </td>
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          checked={row.isSensitive}
                          onChange={(event) => updateRow(index, { isSensitive: event.target.checked })}
                        />
                      </td>
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          checked={row.isCrosswordese}
                          onChange={(event) => updateRow(index, { isCrosswordese: event.target.checked })}
                        />
                      </td>
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          checked={row.isBreakfast}
                          onChange={(event) => updateRow(index, { isBreakfast: event.target.checked })}
                        />
                      </td>
                      <td>{row.nytValue || 'None'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.footer}>
          {status && <div className={styles.status}>{status}</div>}
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => handleSave()}
            disabled={loading || saving || !!error}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      {confirmClose && (
        <div
          className={styles.confirmOverlay}
          onClick={(event) => {
            event.stopPropagation();
            setConfirmClose(false);
          }}
          role="presentation"
        >
          <div
            className={styles.confirmPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="classify-unsaved-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="classify-unsaved-title" className={styles.confirmTitle}>
              You have unsaved changes.
            </p>
            <p className={styles.confirmText}>Save before leaving, discard them, or cancel to keep editing?</p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSaveAndClose}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className={styles.discardButton}
                onClick={onClose}
                disabled={saving}
              >
                Discard
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setConfirmClose(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassifyModal;
