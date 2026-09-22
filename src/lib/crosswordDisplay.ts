import { ClueCollection, Publications } from 'cruzi-models';
import { parseCalendarDate } from './utils';

export function getPublicationName(crossword: ClueCollection): string {
  const source = crossword.puzzle?.publicationId || crossword.source;
  if (!source) {
    return 'Unknown';
  }
  const publication = Object.values(Publications).find(
    (entry) => entry.id === source
  );
  return publication?.name ?? 'Unknown';
}

export function getCrosswordAuthor(crossword: ClueCollection): string {
  return (
    crossword.author ||
    crossword.puzzle?.authors?.[0] ||
    crossword.creator?.firstName ||
    'Unknown'
  );
}

export function getPublicationId(crossword: ClueCollection): string | undefined {
  return crossword.puzzle?.publicationId || crossword.source;
}

export function getXwordinfoSolutionUrl(date: Date): string {
  return `https://www.xwordinfo.com/Crossword?date=${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export interface PuzzleExternalLink {
  href: string;
  label: string;
}

export function getPuzzleExternalLink(crossword: ClueCollection): PuzzleExternalLink | null {
  const publicationId = getPublicationId(crossword);
  const puzzleDate = crossword.puzzle?.date
    ? parseCalendarDate(crossword.puzzle.date)
    : crossword.metadata1
      ? parseCalendarDate(crossword.metadata1)
      : null;

  if (publicationId === Publications.NYT.id && puzzleDate) {
    return {
      href: getXwordinfoSolutionUrl(puzzleDate),
      label: 'Link to solution',
    };
  }

  const sourceLink = crossword.puzzle?.sourceLink?.trim();
  if (sourceLink) {
    return {
      href: sourceLink,
      label: 'Link to puzzle',
    };
  }

  return null;
}
