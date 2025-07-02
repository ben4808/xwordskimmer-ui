import { PuzzleEntry } from "./PuzzleEntry";
import { Square } from "./Square";

export interface Puzzle {
    id: string
    title: string;
    authors: string[];
    copyright: string;
    notes?: string;
    date: Date;
    source: string;
    lang?: string;
    width: number;
    height: number;

    grid: Square[][];
    entries: Map<string, PuzzleEntry>;
}
