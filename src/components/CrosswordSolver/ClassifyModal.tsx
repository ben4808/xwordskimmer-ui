import { useEffect, useState } from 'react';
import { ClassifyRowPayload, ICruziApi } from '../../api/ICruziApi';
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
  fillWords: string[];
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

function hasUnsavedChanges(rows: ClassifyRowPayload[], originals: ClassifyRowPayload[]): boolean {
  if (rows.length !== originals.length) return true;
  return rows.some((row, i) => !rowsEqual(row, originals[i]));
}

function getChangedRows(
  rows: ClassifyRowPayload[],
  originals: ClassifyRowPayload[],
): ClassifyRowPayload[] {
  return rows.filter((row, i) => {
    const entry = (row.entry || row.fillWord || '').trim();
    if (!entry) return false;
    return !originals[i] || !rowsEqual(row, originals[i]);
  }).map((row) => ({
    ...row,
    entry: (row.entry || row.fillWord || '').trim(),
    fillWord: (row.fillWord || row.entry || '').trim(),
    lang: row.lang || 'en',
  }));
}

function rowsEqual(a: ClassifyRowPayload, b: ClassifyRowPayload): boolean {
  return a.fillWord === b.fillWord
    && a.entry === b.entry
    && a.baseForm === b.baseForm
    && a.displayText === b.displayText
    && a.entryType === b.entryType
    && a.unityBucket === b.unityBucket
    && a.familiarityBucket === b.familiarityBucket
    && a.qualityBucket === b.qualityBucket
    && a.isVulgar === b.isVulgar
    && a.isCrosswordese === b.isCrosswordese
    && a.isBreakfast === b.isBreakfast;
}

function nytDisplay(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return 'None';
  return value;
}

function makeBlankRow(): ClassifyRowPayload {
  return {
    rowId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isNew: true,
    fillWord: '',
    entry: '',
    lang: 'en',
    baseForm: '',
    displayText: '',
    entryType: '',
    unityBucket: 'Concept',
    familiarityBucket: 'General Knowledge',
    qualityBucket: 'Normal',
    isVulgar: false,
    isCrosswordese: false,
    isBreakfast: false,
    nytValue: 'None',
  };
}

function ClassifyModal({ fillWords, api, onClose, onSaved }: ClassifyModalProps) {
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

    api.getClassifyEntries(fillWords)
      .then((entries) => {
        if (cancelled) return;
        const mapped: ClassifyRowPayload[] = fillWords.map((fillWord) => {
          const match = entries.find((entry) => entry.fillWord === fillWord);
          return {
            rowId: fillWord,
            fillWord,
            entry: match?.entry ?? null,
            lang: match?.lang ?? null,
            baseForm: asText(match?.baseForm),
            displayText: asText(match?.displayText),
            entryType: asText(match?.entryType),
            unityBucket: asText(match?.unityBucket),
            familiarityBucket: asText(match?.familiarityBucket),
            qualityBucket: asText(match?.qualityBucket),
            isVulgar: match?.isVulgar === true,
            isCrosswordese: match?.isCrosswordese === true,
            isBreakfast: match?.isBreakfast === true,
            nytValue: nytDisplay(match?.nytValue),
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
  }, [api, fillWords]);

  function updateRow(index: number, patch: Partial<ClassifyRowPayload>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setStatus(undefined);
    setError(undefined);
  }

  function handleAddEntry() {
    const blank = makeBlankRow();
    setRows((prev) => [...prev, blank]);
    setOriginals((prev) => [...prev, { ...blank }]);
    setStatus(undefined);
    setError(undefined);
  }

  async function handleDelete(rowId: string) {
    const row = rows.find((item) => item.rowId === rowId);
    if (!row) return;
    if (!window.confirm('Are you sure?')) return;

    const entry = (row.entry || '').trim();
    if (entry && !row.isNew) {
      try {
        setSaving(true);
        setError(undefined);
        await api.deleteClassifyEntry(entry, row.lang || 'en');
        onSaved?.();
      } catch (err: any) {
        setError(err.message || String(err));
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    setRows((prev) => prev.filter((item) => item.rowId !== rowId));
    setOriginals((prev) => prev.filter((item) => item.rowId !== rowId));
    setStatus(`Deleted ${entry || 'row'}.`);
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
        if (!savedIds.has(row.rowId)) return { ...row };
        const entry = (row.entry || row.fillWord || '').trim();
        if (!entry) return row;
        if (row.isNew) {
          return { ...row, isNew: false, rowId: entry, fillWord: entry, entry, lang: row.lang || 'en' };
        }
        return { ...row, entry, lang: row.lang || 'en' };
      });
      setRows(nextRows);
      setOriginals(nextRows.map((row) => ({ ...row })));
      setStatus(`Saved ${changed.length} ${changed.length === 1 ? 'entry' : 'entries'}.`);
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
                  <th>Base Form</th>
                  <th>Display</th>
                  <th>Classification</th>
                  <th>Unity</th>
                  <th>Familiarity</th>
                  <th>Quality</th>
                  <th>Vulgar</th>
                  <th>Crosswordese</th>
                  <th>Breakfast</th>
                  <th>NYT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.rowId}>
                    <td>
                      {row.isNew ? (
                        <input
                          type="text"
                          value={row.entry || ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateRow(index, { entry: value, fillWord: value, lang: 'en' });
                          }}
                        />
                      ) : (
                        <>
                          {row.fillWord}
                          {!row.entry && <div className={styles.missing}>Not in database</div>}
                        </>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.baseForm}
                        onChange={(event) => updateRow(index, { baseForm: event.target.value })}
                      />
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
                        value={row.entryType}
                        onChange={(event) => updateRow(index, { entryType: event.target.value })}
                      >
                        <option value=""></option>
                        {optionsWithCurrent(ENTRY_TYPE_OPTIONS, row.entryType).map((option) => (
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
                    <td className={styles.deleteCell}>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        title="Delete entry"
                        onClick={() => handleDelete(row.rowId)}
                        disabled={saving}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12a1 1 0 0 0 1-1V8H5v12a1 1 0 0 0 1 1z"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddEntry}
            >
              Add Entry
            </button>
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
