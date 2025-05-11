import { Clue } from "./Clue";

export interface ClueCollection {
    id: string;
    name: string;
    authorID?: number;
    source?: string;
    date: Date;
    metadata1?: string;
    metadata2?: string;
    clues: Clue[];
};
