import { PuzzleEntry } from "./PuzzleEntry";
import { Square } from "./Square";

export interface Puzzle {
    id?: string
    publicationId?: string;
    title: string;
    authors: string[];
    copyright: string;
    notes?: string;
    date: Date;
    source: string;
    lang?: string;
    width: number;
    height: number;
    sourceLink?: string; // Link to the source of the puzzle

    grid: Square[][];
    entries: Map<string, PuzzleEntry>;
}
