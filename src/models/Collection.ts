import { Clue } from "./Clue";

export interface Collection {
    index: number;
    name: string;
    authorID?: number;
    date: Date;
    metadata1?: string;
    metadata2?: string;
    clues: Clue[];
};
