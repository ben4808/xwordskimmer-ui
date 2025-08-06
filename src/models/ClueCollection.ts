import { Clue } from "./Clue";
import { Puzzle } from "./Puzzle";

export interface ClueCollection {
    id?: string;
    name: string;
    puzzle?: Puzzle;
    author?: string;
    description?: string;
    createdDate: Date;
    modifiedDate: Date;
    source?: string; // e.g. "NYT", "LA Times", etc. for URL
    metadata1?: string;
    metadata2?: string;
    clues: Clue[];
};
