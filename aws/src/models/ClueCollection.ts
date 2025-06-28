import { Clue } from "./Clue";

export interface ClueCollection {
    id: number;
    name: string;
    puzzleID?: number;
    authorID?: number;
    description?: string;
    createdDate: Date;
    metadata1?: string;
    metadata2?: string;
    clues: Clue[];
};
