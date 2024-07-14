import { EntrySolver } from "./EntrySolver";

export interface PuzzleEntry {
    index: string;
    entry: string;
    clue: string;
    solver: EntrySolver;
}
