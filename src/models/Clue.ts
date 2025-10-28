import { ClueProgressData } from "./ClueProgressData";
import { Entry } from "./Entry";
import { Sense } from "./Sense";

export interface Clue {
    id?: string;
    entry?: Entry;
    sense?: Sense; // if linked to a specific Sense
    customClue?: string;
    customDisplayText?: string; // override for entry display text
    source?: string;  // crossword, book, etc.

    translatedClues?: Map<string, string>; // <lang, clue>
    progressData?: ClueProgressData;
};
