import { useEffect, useState } from 'react';
import { ClassifyRowPayload, ClassifySenseOption, ICruziApi } from '../../api/ICruziApi';
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

function senseIdOf(row: ClassifyRowPayload): string {
  return (row.senseId || '').trim();
}

function rowsEqual(a: ClassifyRowPayload, b: ClassifyRowPayload): boolean {
  return a.kind === b.kind
    && a.fillWord === b.fillWord
    && a.entry === b.entry
    && a.baseForm === b.baseForm
    && a.displayText === b.displayText
    && a.entryType === b.entryType
    && a.unityBucket === b.unityBucket
    && a.familiarityBucket === b.familiarityBucket
    && a.qualityBucket === b.qualityBucket
    && a.domain === b.domain
    && a.regionality === b.regionality
    && a.isVulgar === b.isVulgar
    && a.isCrosswordese === b.isCrosswordese
    && a.isBreakfast === b.isBreakfast
    && a.isSensitive === b.isSensitive
    && senseIdOf(a) === senseIdOf(b);
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
    if (row.kind === 'sense') {
      return !original || !rowsEqual(row, original);
    }
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

function mapSenseOption(raw: ClassifySenseOption): ClassifySenseOption {
  return {
    senseId: raw.senseId,
    summary: asText(raw.summary),
    displayText: asText(raw.displayText),
    entryType: asText(raw.entryType),
    unityBucket: asText(raw.unityBucket),
    familiarityBucket: asText(raw.familiarityBucket),
    qualityBucket: asText(raw.qualityBucket),
    domain: asText(raw.domain),
    regionality: asText(raw.regionality),
    isVulgar: raw.isVulgar === true,
    isSensitive: raw.isSensitive === true,
  };
}

function fieldsFromSense(option: ClassifySenseOption | undefined): Pick<
  ClassifyRowPayload,
  | 'displayText'
  | 'entryType'
  | 'unityBucket'
  | 'familiarityBucket'
  | 'qualityBucket'
  | 'domain'
  | 'regionality'
  | 'isVulgar'
  | 'isSensitive'
> {
  if (!option) {
    return {
      displayText: '',
      entryType: '',
      unityBucket: '',
      familiarityBucket: '',
      qualityBucket: '',
      domain: '',
      regionality: '',
      isVulgar: false,
      isSensitive: false,
    };
  }
  return {
    displayText: option.displayText,
    entryType: option.entryType,
    unityBucket: option.unityBucket,
    familiarityBucket: option.familiarityBucket,
    qualityBucket: option.qualityBucket,
    domain: option.domain,
    regionality: option.regionality,
    isVulgar: option.isVulgar,
    isSensitive: option.isSensitive,
  };
}

function applySenseSelection(row: ClassifyRowPayload, senseId: string): Partial<ClassifyRowPayload> {
  const nextId = senseId.trim();
  if (!nextId) {
    return { senseId: null, ...fieldsFromSense(undefined) };
  }
  const option = (row.senses || []).find((sense) => sense.senseId === nextId);
  return { senseId: nextId, ...fieldsFromSense(option) };
}

function syncCatalog(row: ClassifyRowPayload): ClassifyRowPayload {
  const senseId = senseIdOf(row);
  if (row.kind !== 'sense' || !senseId) return { ...row };
  return {
    ...row,
    senses: (row.senses || []).map((sense) => (
      sense.senseId === senseId
        ? {
          ...sense,
          displayText: row.displayText,
          entryType: row.entryType,
          unityBucket: row.unityBucket,
          familiarityBucket: row.familiarityBucket,
          qualityBucket: row.qualityBucket,
          domain: row.domain,
          regionality: row.regionality,
          isVulgar: row.isVulgar,
          isSensitive: row.isSensitive,
        }
        : sense
    )),
  };
}

function makeBlankEntryRow(): ClassifyRowPayload {
  return {
    rowId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'entry',
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
    domain: '',
    regionality: '',
    isVulgar: false,
    isCrosswordese: false,
    isBreakfast: false,
    isSensitive: false,
    nytValue: 'None',
  };
}

function makeSenseRow(parent: ClassifyRowPayload, fillItem?: ClassifyFillItem, senses: ClassifySenseOption[] = []): ClassifyRowPayload {
  const attachedId = fillItem?.attachedSenseId || null;
  const option = senses.find((sense) => sense.senseId === attachedId);
  const senseOptions = attachedId && !option
    ? [{
        senseId: attachedId,
        summary: '(attached sense)',
        displayText: '',
        entryType: '',
        unityBucket: '',
        familiarityBucket: '',
        qualityBucket: '',
        domain: '',
        regionality: '',
        isVulgar: false,
        isSensitive: false,
      }, ...senses]
    : senses;
  return {
    rowId: `${parent.rowId}-sense`,
    kind: 'sense',
    parentRowId: parent.rowId,
    fillWord: parent.fillWord,
    entry: parent.entry,
    lang: parent.lang,
    baseForm: '',
    nytValue: '',
    isCrosswordese: false,
    isBreakfast: false,
    senseId: attachedId,
    clueIds: fillItem?.clueIds ?? [],
    senses: senseOptions,
    ...fieldsFromSense(option),
  };
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

    const fillWords = fillItems.map((item) => item.fillWord);

    api.getClassifyEntries(fillWords)
      .then((entries) => {
        if (cancelled) return;
        const mapped: ClassifyRowPayload[] = [];
        for (const fillItem of fillItems) {
          const match = entries.find((entry) => entry.fillWord === fillItem.fillWord);
          const senses = (match?.senses ?? []).map(mapSenseOption);
          const entryRow: ClassifyRowPayload = {
            rowId: fillItem.fillWord,
            kind: 'entry',
            fillWord: fillItem.fillWord,
            entry: match?.entry ?? null,
            lang: match?.lang ?? null,
            baseForm: asText(match?.baseForm),
            displayText: asText(match?.displayText),
            entryType: asText(match?.entryType),
            unityBucket: asText(match?.unityBucket),
            familiarityBucket: asText(match?.familiarityBucket),
            qualityBucket: asText(match?.qualityBucket),
            domain: asText(match?.domain),
            regionality: asText(match?.regionality),
            isVulgar: match?.isVulgar === true,
            isCrosswordese: match?.isCrosswordese === true,
            isBreakfast: match?.isBreakfast === true,
            isSensitive: match?.isSensitive === true,
            nytValue: nytDisplay(match?.nytValue),
          };
          mapped.push(entryRow, makeSenseRow(entryRow, fillItem, senses));
        }
        setRows(mapped);
        setOriginals(mapped.map((row) => ({ ...row, senses: row.senses ? row.senses.map((sense) => ({ ...sense })) : undefined })));
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

  function handleAddEntry() {
    const entryRow = makeBlankEntryRow();
    const senseRow = makeSenseRow(entryRow);
    setRows((prev) => [...prev, entryRow, senseRow]);
    setOriginals((prev) => [...prev, { ...entryRow }, { ...senseRow }]);
    setStatus(undefined);
    setError(undefined);
  }

  async function handleDelete(rowId: string) {
    const row = rows.find((item) => item.rowId === rowId);
    if (!row || row.kind === 'sense') return;
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

    setRows((prev) => prev.filter((item) => item.rowId !== rowId && item.parentRowId !== rowId));
    setOriginals((prev) => prev.filter((item) => item.rowId !== rowId && item.parentRowId !== rowId));
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
        if (!savedIds.has(row.rowId) && !(row.kind === 'sense' && row.parentRowId && savedIds.has(row.parentRowId))) {
          return syncCatalog(row);
        }
        const entry = (row.entry || row.fillWord || '').trim();
        if (row.kind === 'entry' && row.isNew && entry) {
          return { ...row, isNew: false, rowId: entry, fillWord: entry, entry, lang: row.lang || 'en' };
        }
        if (row.kind === 'sense' && row.parentRowId && savedIds.has(row.parentRowId)) {
          const parent = rows.find((item) => item.rowId === row.parentRowId);
          const nextParentId = (parent?.entry || parent?.fillWord || row.fillWord || '').trim();
          return syncCatalog({
            ...row,
            parentRowId: nextParentId || row.parentRowId,
            rowId: `${nextParentId || row.parentRowId}-sense`,
            fillWord: nextParentId || row.fillWord,
            entry: nextParentId || row.entry,
            lang: row.lang || 'en',
          });
        }
        return syncCatalog({ ...row, entry, lang: row.lang || 'en' });
      });
      setRows(nextRows);
      setOriginals(nextRows.map((row) => ({
        ...row,
        senses: row.senses ? row.senses.map((sense) => ({ ...sense })) : undefined,
      })));
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
                  <th>Summary</th>
                  <th>Base Form</th>
                  <th>Display</th>
                  <th>Classification</th>
                  <th>Unity</th>
                  <th>Familiarity</th>
                  <th>Quality</th>
                  <th>Domain</th>
                  <th>Regionality</th>
                  <th>Vulgar</th>
                  <th>Sensitive</th>
                  <th>Crosswordese</th>
                  <th>Breakfast</th>
                  <th>NYT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const isSense = row.kind === 'sense';
                  const hasSense = isSense && !!senseIdOf(row);
                  const senseFieldsEnabled = hasSense;
                  return (
                    <tr
                      key={row.rowId}
                      className={`${isSense ? styles.senseRow : styles.entryRow} ${index % 4 < 2 ? styles.groupOdd : styles.groupEven}`}
                    >
                      <td className={styles.entryCell}>
                        {isSense ? (
                          <span className={hasSense ? styles.senseLabel : styles.missing}>
                            {hasSense ? row.fillWord : 'no sense'}
                          </span>
                        ) : row.isNew ? (
                          <input
                            type="text"
                            value={row.entry || ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              const parentId = row.rowId;
                              setRows((prev) => prev.map((item, i) => {
                                if (i === index) return { ...item, entry: value, fillWord: value, lang: 'en' };
                                if (item.parentRowId === parentId) return { ...item, entry: value, fillWord: value, lang: 'en' };
                                return item;
                              }));
                              setStatus(undefined);
                              setError(undefined);
                            }}
                          />
                        ) : (
                          <>
                            {row.fillWord}
                            {!row.entry && <div className={styles.missing}>Not in database</div>}
                          </>
                        )}
                      </td>
                      <td className={styles.summaryCell}>
                        {isSense ? (
                          <select
                            value={senseIdOf(row)}
                            onChange={(event) => updateRow(index, applySenseSelection(row, event.target.value))}
                          >
                            <option value=""></option>
                            {(row.senses || []).map((sense) => (
                              <option key={sense.senseId} value={sense.senseId}>
                                {sense.summary || '(no summary)'}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                      <td>
                        {isSense ? null : (
                          <input
                            type="text"
                            value={row.baseForm}
                            onChange={(event) => updateRow(index, { baseForm: event.target.value })}
                          />
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <input
                            type="text"
                            value={row.displayText}
                            onChange={(event) => updateRow(index, { displayText: event.target.value })}
                          />
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <select
                            value={row.entryType}
                            onChange={(event) => updateRow(index, { entryType: event.target.value })}
                          >
                            <option value=""></option>
                            {optionsWithCurrent(ENTRY_TYPE_OPTIONS, row.entryType).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <select
                            value={row.unityBucket}
                            onChange={(event) => updateRow(index, { unityBucket: event.target.value })}
                          >
                            <option value=""></option>
                            {optionsWithCurrent(UNITY_OPTIONS, row.unityBucket).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <select
                            value={row.familiarityBucket}
                            onChange={(event) => updateRow(index, { familiarityBucket: event.target.value })}
                          >
                            <option value=""></option>
                            {optionsWithCurrent(FAMILIARITY_OPTIONS, row.familiarityBucket).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <select
                            value={row.qualityBucket}
                            onChange={(event) => updateRow(index, { qualityBucket: event.target.value })}
                          >
                            <option value=""></option>
                            {optionsWithCurrent(QUALITY_OPTIONS, row.qualityBucket).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <input
                            type="text"
                            value={row.domain}
                            onChange={(event) => updateRow(index, { domain: event.target.value })}
                          />
                        )}
                      </td>
                      <td>
                        {(!isSense || senseFieldsEnabled) && (
                          <input
                            type="text"
                            value={row.regionality}
                            onChange={(event) => updateRow(index, { regionality: event.target.value })}
                          />
                        )}
                      </td>
                      <td className={styles.checkCell}>
                        {(!isSense || senseFieldsEnabled) && (
                          <input
                            type="checkbox"
                            checked={row.isVulgar}
                            onChange={(event) => updateRow(index, { isVulgar: event.target.checked })}
                          />
                        )}
                      </td>
                      <td className={styles.checkCell}>
                        {(!isSense || senseFieldsEnabled) && (
                          <input
                            type="checkbox"
                            checked={row.isSensitive}
                            onChange={(event) => updateRow(index, { isSensitive: event.target.checked })}
                          />
                        )}
                      </td>
                      <td className={styles.checkCell}>
                        {isSense ? null : (
                          <input
                            type="checkbox"
                            checked={row.isCrosswordese}
                            onChange={(event) => updateRow(index, { isCrosswordese: event.target.checked })}
                          />
                        )}
                      </td>
                      <td className={styles.checkCell}>
                        {isSense ? null : (
                          <input
                            type="checkbox"
                            checked={row.isBreakfast}
                            onChange={(event) => updateRow(index, { isBreakfast: event.target.checked })}
                          />
                        )}
                      </td>
                      <td>{isSense ? null : (row.nytValue || 'None')}</td>
                      <td className={styles.deleteCell}>
                        {isSense ? null : (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.footer}>
          {!loading && !error && (
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddEntry}
            >
              Add Entry
            </button>
          )}
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
