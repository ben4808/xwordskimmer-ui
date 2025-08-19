import { Clue } from "./Clue";
import { Puzzle } from "./Puzzle";
import { User } from "./User";

export interface ClueCollection {
    id?: string;
    title: string;
    puzzle?: Puzzle;
    author?: string;
    creator?: User;
    description?: string;
    createdDate: Date;
    modifiedDate: Date;
    source?: string; // e.g. "NYT", "LA Times", etc. for URL
    metadata1?: string;
    metadata2?: string;
    clues: Clue[];
};
