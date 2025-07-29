export interface Clue {
    id?: string;
    clue: string;
    entry: string;
    lang: string;
    responseTemplate?: string;
    source?: string;
    metadata1?: string;  // puzzle index
    metadata2?: string;

    translatedClues?: Map<string, string>; // <lang, clue>
};
