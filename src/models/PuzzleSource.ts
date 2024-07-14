import { Puzzle } from "./Puzzle";

export interface PuzzleSource {
    id: number;
    name: string;
    getPuzzle: (date: Date) => Promise<Puzzle>;
}

export enum Sources {
    None,
    NYT,
}
