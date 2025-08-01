import { Clue } from "./Clue";

export interface ClueCollection {
    id?: string;
    name: string;
    puzzleId?: string;
    author?: string;
    description?: string;
    createdDate: Date;
    source?: string;
    metadata1?: string; // crossword author
    metadata2?: string;
    clues: Clue[];
};
