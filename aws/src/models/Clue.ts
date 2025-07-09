import { Entry } from "./Entry";
import { TranslateResult } from "./TranslateResult";

export interface Clue {
    id?: string;
    entry: Map<string, Entry>; // <entry, Entry>
    lang: string;
    clue: string;
    responseTemplate?: string;
    source?: string;
    metadata1?: string;  // puzzle index
    metadata2?: string;

    translateResults?: Map<string, TranslateResult>; // <lang, TranslateResult>
};
