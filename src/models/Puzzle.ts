import { PuzzleEntry } from "./PuzzleEntry";
import { Sources } from "./PuzzleSource";

export interface Puzzle {
    title: string;
    authors: string[];
    copyright: string;
    notes?: string;
    date: Date;
    source: Sources;

    entries: Map<string, PuzzleEntry>;
}
