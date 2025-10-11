import { ClueProgressData } from "./ClueProgressData";
import { Entry } from "./Entry";

export interface Clue {
    id?: string;
    entry?: Entry;
    senseId?: string; // if linked to a specific Sense
    customClue?: string;
    customDisplayText?: string; // override for entry display text
    source?: string;  // crossword, book, etc.

    translatedClues?: Map<string, string>; // <lang, clue>
    progressData?: ClueProgressData;
};
