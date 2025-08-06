import { Entry } from "./Entry";

export interface Clue {
    id?: string;
    clue: string;
    entry: Entry;
    lang: string;
    isCrosswordClue: boolean; // true if this is a crossword clue, false if it's a general clue
    source?: string;  // crossword, book, etc.
    metadata1?: string;  // puzzle index
    metadata2?: string;

    translatedClues?: Map<string, string>; // <lang, clue>
};
