import { Clue } from "./Clue";

export interface Collection {
    index: string;
    name: string;
    metadata1: string;
    metadata2: string;
    clues: Clue[];
}
