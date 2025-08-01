import { Clue } from "./Clue";

export interface ClueCollection {
    id: string;
    name: string;
    puzzleId?: string;
    authorId?: string;
    description?: string;
    createdDate: Date;
    source?: string;
    metadata1?: string;
    metadata2?: string;
    clues: Clue[];
};
