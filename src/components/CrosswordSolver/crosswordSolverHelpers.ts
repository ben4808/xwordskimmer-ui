import {
  ClueCollection,
  ClueHydrated,
  ClueWithProgress,
  CollectionClue,
  CollectionClueWithProgress,
  EntryRef,
  Sense,
} from 'cruzi-models';
import { parseCalendarDate } from '../../lib/utils';
import { normalizeAnswer } from '../CollectionQuiz/quizHelpers';

export type CollectionClueItem =
  | ClueHydrated
  | CollectionClue
  | CollectionClueWithProgress;

export interface OrderedClue {
  order: number;
  clue: ClueWithProgress;
  metadata1?: string;
}

export function extractClue(item: CollectionClueItem): ClueWithProgress {
  if ('clue' in item && item.clue) {
    return item.clue as ClueWithProgress;
  }
  return item as ClueWithProgress;
}

export function getClueOrder(item: CollectionClueItem, fallback: number): number {
  if ('order' in item && typeof item.order === 'number') {
    return item.order;
  }
  return fallback;
}

/** Clues in puzzle order. */
export function getOrderedClues(
  clues: CollectionClueItem[] | undefined
): OrderedClue[] {
  if (!clues?.length) return [];

  return clues
    .map((item, index) => ({
      order: getClueOrder(item, index),
      clue: extractClue(item),
      metadata1: 'metadata1' in item ? item.metadata1 : undefined,
    }))
    .sort((a, b) => a.order - b.order);
}

/** Clues with answers 6+ letters, in puzzle order. */
export function getEligibleClues(
  clues: CollectionClueItem[] | undefined
): OrderedClue[] {
  return getOrderedClues(clues).filter(
    ({ clue }) => normalizeAnswer(clue.entry?.entry).length >= 6
  );
}

export type ClueDirection = 'A' | 'D';

export interface PuzzleClueItem extends OrderedClue {
  clueNumber: number;
  direction: ClueDirection;
}

export function parseClueIndex(
  metadata1?: string
): { number: number; direction: ClueDirection } | null {
  if (!metadata1) return null;
  const match = /^(\d+)\s*([ADad])$/.exec(metadata1.trim());
  if (!match) return null;
  return {
    number: parseInt(match[1], 10),
    direction: match[2].toUpperCase() as ClueDirection,
  };
}

export function getPuzzleClueColumns(
  clues: CollectionClueItem[] | undefined
): { across: PuzzleClueItem[]; down: PuzzleClueItem[] } {
  const across: PuzzleClueItem[] = [];
  const down: PuzzleClueItem[] = [];

  for (const item of getOrderedClues(clues)) {
    const parsed = parseClueIndex(item.metadata1);
    const puzzleClue: PuzzleClueItem = {
      ...item,
      clueNumber: parsed?.number ?? item.order + 1,
      direction: parsed?.direction ?? 'A',
    };
    if (puzzleClue.direction === 'D') {
      down.push(puzzleClue);
    } else {
      across.push(puzzleClue);
    }
  }

  const byNumber = (a: PuzzleClueItem, b: PuzzleClueItem) =>
    a.clueNumber - b.clueNumber || a.order - b.order;
  across.sort(byNumber);
  down.sort(byNumber);

  return { across, down };
}

export function getClueText(clue: ClueWithProgress): string {
  return clue.customClue ?? '';
}

export function getAnswer(clue: ClueWithProgress): string {
  return normalizeAnswer(clue.entry?.entry);
}

/** Unique fill answers in alphabetical order, used by the classify modal. */
export interface ClassifyFillItem {
  fillWord: string;
  clueIds: string[];
  attachedSenseId: string | null;
}

export function getClassifyFillItems(
  clues: CollectionClueItem[] | undefined
): ClassifyFillItem[] {
  const byWord = new Map<string, ClassifyFillItem>();
  for (const { clue } of getOrderedClues(clues)) {
    const word = getAnswer(clue);
    if (!word) continue;
    const clueId = clue.id?.trim();
    const senseId = clue.sense?.id?.trim() || null;
    const existing = byWord.get(word);
    if (!existing) {
      byWord.set(word, {
        fillWord: word,
        clueIds: clueId ? [clueId] : [],
        attachedSenseId: senseId,
      });
      continue;
    }
    if (clueId && !existing.clueIds.includes(clueId)) {
      existing.clueIds.push(clueId);
    }
    if (!existing.attachedSenseId && senseId) {
      existing.attachedSenseId = senseId;
    }
  }
  return [...byWord.values()].sort((a, b) => a.fillWord.localeCompare(b.fillWord));
}

export function getClassifyFillWords(
  clues: CollectionClueItem[] | undefined
): string[] {
  return getClassifyFillItems(clues).map((item) => item.fillWord);
}

/** Uppercase letters only; punctuation and spacing are preserved. */
export function formatDisplayText(text: string): string {
  return text.replace(/[a-z]/g, (c) => c.toUpperCase());
}

export function getDisplayText(clue: ClueWithProgress): string {
  const answer = getAnswer(clue);
  const raw =
    clue.sense?.displayText?.trim() ||
    clue.customDisplayText?.trim() ||
    clue.entry?.displayText?.trim() ||
    '';
  if (!raw) return answer;

  const formatted = formatDisplayText(raw);
  const lettersFromDisplay = formatted.replace(/[^A-Z0-9]/g, '');
  if (lettersFromDisplay === answer) {
    return formatted;
  }
  return answer;
}

export interface DisplaySlot {
  char: string;
  isLetter: boolean;
  letterIndex?: number;
}

export function buildDisplaySlots(
  displayText: string,
  answer: string
): DisplaySlot[] {
  const slots: DisplaySlot[] = [];
  let letterIdx = 0;

  for (const ch of displayText) {
    if (/[A-Z0-9]/.test(ch)) {
      if (letterIdx >= answer.length) break;
      slots.push({ char: ch, isLetter: true, letterIndex: letterIdx });
      letterIdx++;
    } else {
      slots.push({ char: ch, isLetter: false });
    }
  }

  if (letterIdx < answer.length) {
    for (; letterIdx < answer.length; letterIdx++) {
      slots.push({
        char: answer[letterIdx],
        isLetter: true,
        letterIndex: letterIdx,
      });
    }
  }

  const lettersFromSlots = slots
    .filter((s) => s.isLetter)
    .map((s) => answer[s.letterIndex!])
    .join('');
  if (lettersFromSlots !== answer) {
    return answer.split('').map((ch, index) => ({
      char: ch,
      isLetter: true,
      letterIndex: index,
    }));
  }

  return slots;
}

/** DB score (0–50) to UI score (0–5). */
export function dbScoreToUi(dbScore: number | undefined): number {
  if (dbScore == null || Number.isNaN(dbScore)) return 0;
  return dbScore / 10;
}

export function formatUiScore(dbScore: number | undefined): string {
  if (dbScore == null || Number.isNaN(dbScore)) return '—';
  return dbScoreToUi(dbScore).toFixed(1);
}

/** Background for score badges on dark UI: 0 = near-black; 1–5 muted red → amber → green. */
export function getScoreBadgeBackground(uiScore: number): string {
  if (uiScore <= 0) return '#0c1824';

  const clamped = Math.max(0, Math.min(5, uiScore));
  const saturation = 22;
  const lightness = Math.round(22 + (clamped / 5) * 4);

  if (clamped <= 1) {
    return `hsl(0, ${saturation}%, ${lightness}%)`;
  }
  if (clamped <= 3) {
    const t = (clamped - 1) / 2;
    const hue = Math.round(45 * t);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  const t = (clamped - 3) / 2;
  const hue = Math.round(45 + 75 * t);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function isPositionCorrect(
  index: number,
  answer: string,
  userInput: string,
  revealedMask: boolean[]
): boolean {
  const typed = userInput[index]?.toUpperCase();
  if (typed && typed === answer[index]) return true;
  return Boolean(revealedMask[index]);
}

export function isClueComplete(
  answer: string,
  userInput: string,
  revealedMask: boolean[]
): boolean {
  if (!answer.length) return false;
  for (let i = 0; i < answer.length; i++) {
    if (!isPositionCorrect(i, answer, userInput, revealedMask)) {
      return false;
    }
  }
  return true;
}

export function fillUserInputToFirstUnsolved(
  answer: string,
  userInput: string,
  revealedMask: boolean[]
): string {
  let filled = '';
  for (let i = 0; i < answer.length; i++) {
    if (isPositionCorrect(i, answer, userInput, revealedMask)) {
      filled += answer[i];
    } else {
      break;
    }
  }
  return filled;
}

/** True when every typed letter matches the answer at that position. */
export function isUserInputValidSoFar(userInput: string, answer: string): boolean {
  for (let i = 0; i < userInput.length; i++) {
    if (userInput[i] !== answer[i]) return false;
  }
  return true;
}

export function selectHintIndex(
  answer: string,
  userInput: string,
  revealedMask: boolean[]
): number | null {
  const withoutUserInput: number[] = [];
  const withWrongInput: number[] = [];

  for (let i = 0; i < answer.length; i++) {
    if (isPositionCorrect(i, answer, userInput, revealedMask)) continue;

    const typed = userInput[i]?.toUpperCase();
    if (!typed) {
      withoutUserInput.push(i);
    } else if (typed !== answer[i]) {
      withWrongInput.push(i);
    }
  }

  const pool = withoutUserInput.length > 0 ? withoutUserInput : withWrongInput;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** True when the user has previously submitted this crossword clue. */
export function isCluePreviouslyCompleted(clue: ClueWithProgress): boolean {
  return clue.progressData != null;
}

/** True when every eligible clue is completed in-session or from prior progress. */
export function areAllEligibleCluesComplete(
  eligibleClues: OrderedClue[],
  sessionCompletedClueIds: ReadonlySet<string>
): boolean {
  if (eligibleClues.length === 0) return false;

  return eligibleClues.every(
    ({ clue }) =>
      Boolean(clue.id) &&
      (isCluePreviouslyCompleted(clue) || sessionCompletedClueIds.has(clue.id!))
  );
}

export interface ClueSolverState {
  userInput: string;
  revealedMask: boolean[];
  clueHintsUsed: number;
  isSolved: boolean;
}

export function buildSolvedClueState(
  answer: string,
  hintsUsed: number
): ClueSolverState {
  return {
    userInput: answer,
    revealedMask: new Array(answer.length).fill(true),
    clueHintsUsed: hintsUsed,
    isSolved: true,
  };
}

export function buildFreshClueState(answerLength: number): ClueSolverState {
  return {
    userInput: '',
    revealedMask: createInitialRevealedMask(answerLength),
    clueHintsUsed: 0,
    isSolved: false,
  };
}

export function createInitialRevealedMask(answerLength: number): boolean[] {
  const mask = new Array(answerLength).fill(false);
  if (answerLength > 0) {
    mask[0] = true;
  }
  return mask;
}

/** Format date as MM/DD/YYYY for /crossword/:publication?date= routes. */
export function formatCrosswordSolverDateForRoute(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/** Build the solver URL for a crossword list item. */
export function getCrosswordSolverPath(crossword: ClueCollection): string | null {
  if (crossword.puzzle?.publicationId && crossword.metadata1) {
    const publication = String(crossword.puzzle.publicationId).toLowerCase();
    const date = formatCrosswordSolverDateForRoute(
      parseCalendarDate(crossword.metadata1)
    );
    return `/crossword/${publication}?date=${date}`;
  }
  if (crossword.id) {
    return `/crossword/${crossword.id}`;
  }
  return null;
}

/** Parse MM/DD/YYYY from the solver ?date= query param. */
export function parseCrosswordSolverDate(dateParam: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateParam);
  if (!match) return null;

  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  ) {
    return date;
  }
  return null;
}

export function hasMatchedSense(clue: ClueWithProgress): boolean {
  return Boolean(clue.sense?.id);
}

export function senseBelongsToBaseEntry(clue: ClueWithProgress): boolean {
  const senseEntry = clue.sense?.entry?.entry;
  const answerEntry = clue.entry?.entry;
  return Boolean(senseEntry && answerEntry && senseEntry !== answerEntry);
}

export function getSenseEntryDisplayText(clue: ClueWithProgress): string {
  const sense = clue.sense;
  if (!sense) return '';
  return sense.entry?.displayText?.trim() || sense.entry?.entry || '';
}

export function getSenseDisplayText(clue: ClueWithProgress): string {
  const sense = clue.sense;
  if (!sense) return getDisplayText(clue);
  return (
    sense.displayText?.trim() ||
    sense.entry?.displayText?.trim() ||
    getDisplayText(clue)
  );
}

export function getSenseSummaryPrefix(clue: ClueWithProgress): string {
  const baseDisplay = getSenseSummaryBaseDisplay(clue);
  return baseDisplay ? `From ${baseDisplay}: ` : '';
}

export function getSenseSummaryBaseDisplay(clue: ClueWithProgress): string {
  if (!senseBelongsToBaseEntry(clue)) return '';
  const baseDisplay = getSenseEntryDisplayText(clue);
  return baseDisplay ? formatDisplayText(baseDisplay) : '';
}

export function buildExplainCluePrompt(
  clueText: string,
  answerDisplayText: string
): string {
  return `Explain the clue "${clueText}" was used as a crossword clue for the answer "${answerDisplayText}".`;
}

export function buildInterestingFactPrompt(
  displayText: string,
  classification?: string
): string {
  switch ((classification ?? '').trim()) {
    case 'Proper Name':
      return `Give an interesting piece of lore about ${displayText}.`;
    case 'Word':
      return `Give an interesting piece of lore about the word ${displayText}.`;
    case 'Phrase':
      return `Give an interesting piece of lore about the phrase ${displayText}.`;
    case 'Acronym/Abbreviation':
      return `Give an interesting piece of lore about the acronym/abbreviation ${displayText}.`;
    case 'Prefix/Suffix':
      return `Give an interesting piece of lore about the prefix/suffix ${displayText}.`;
    default:
      return `Give an interesting piece of lore about ${displayText}.`;
  }
}

export function joinWithBullets(
  items: Array<string | undefined | null>
): string {
  return items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .join(' • ');
}

export function translationDisplayText(
  value: EntryRef | string | undefined | null
): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return value.displayText?.trim() || value.entry || '';
}

export function getSpanishTranslations(sense?: Sense): {
  natural: string[];
  colloquial: string[];
} {
  const translation = sense?.translations?.es;
  const toLabels = (values?: EntryRef[]) =>
    (values ?? [])
      .map((item) => translationDisplayText(item))
      .filter(Boolean);

  return {
    natural: toLabels(translation?.naturalTranslations),
    colloquial: toLabels(translation?.colloquialTranslations),
  };
}
