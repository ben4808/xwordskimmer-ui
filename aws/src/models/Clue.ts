export interface Clue {
    id?: number;
    entry: string;
    lang: string;
    clue: string;
    responseTemplate?: string;
    source?: string;
    metadata1?: string;
    metadata2?: string;

    translatedClues: Map<string, string>; // <land, clue>
    translatedEntries: Map<string, string[]>; // <lang, entry[]>
};
