import {
  ClueCollection,
  ClueHydrated,
  CollectionClue,
  CollectionClueWithProgress,
} from 'cruzi-models';
import { parseCalendarDate } from '../../lib/utils';
import { normalizeAnswer } from '../CollectionQuiz/quizHelpers';

export type CollectionClueItem =
  | ClueHydrated
  | CollectionClue
  | CollectionClueWithProgress;

export interface OrderedClue {
  order: number;
  clue: ClueHydrated;
}

export function extractClue(item: CollectionClueItem): ClueHydrated {
  if ('clue' in item && item.clue) {
    return item.clue as ClueHydrated;
  }
  return item as ClueHydrated;
}

export function getClueOrder(item: CollectionClueItem, fallback: number): number {
  if ('order' in item && typeof item.order === 'number') {
    return item.order;
  }
  return fallback;
}

/** Clues with answers 6+ letters, in puzzle order. */
export function getEligibleClues(
  clues: CollectionClueItem[] | undefined
): OrderedClue[] {
  if (!clues?.length) return [];

  return clues
    .map((item, index) => ({
      order: getClueOrder(item, index),
      clue: extractClue(item),
    }))
    .filter(({ clue }) => normalizeAnswer(clue.entry?.entry).length >= 6)
    .sort((a, b) => a.order - b.order);
}

export function getClueText(clue: ClueHydrated): string {
  return clue.customClue ?? '';
}

export function getAnswer(clue: ClueHydrated): string {
  return normalizeAnswer(clue.entry?.entry);
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

/** Background for score badges: 0 = black; 1–5 red → amber → green. */
export function getScoreBadgeBackground(uiScore: number): string {
  if (uiScore <= 0) return '#000000';

  const clamped = Math.max(0, Math.min(5, uiScore));

  if (clamped <= 1) {
    return '#cc0000';
  }
  if (clamped <= 3) {
    const t = (clamped - 1) / 2;
    const r = Math.round(204 + (255 - 204) * t);
    const g = Math.round(0 + 191 * t);
    const b = Math.round(0);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = (clamped - 3) / 2;
  const r = Math.round(255 * (1 - t));
  const g = Math.round(191 + (139 - 191) * t);
  const b = Math.round(0);
  return `rgb(${r}, ${g}, ${b})`;
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
  if (crossword.puzzle?.publicationId && crossword.puzzle?.date) {
    const publication = String(crossword.puzzle.publicationId).toLowerCase();
    const date = formatCrosswordSolverDateForRoute(
      parseCalendarDate(crossword.puzzle.date)
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
