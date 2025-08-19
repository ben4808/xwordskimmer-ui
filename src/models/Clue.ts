import { Entry } from "./Entry";

export interface Clue {
    id?: string;
    clue: string;
    entry: Entry;
    lang: string;
    source?: string;  // crossword, book, etc.
    metadata1?: string;  // puzzle index
    metadata2?: string;

    translatedClues?: Map<string, string>; // <lang, clue>
    
};
