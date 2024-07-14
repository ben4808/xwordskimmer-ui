import { Puzzle } from "../models/Puzzle";
import { PuzzleEntry } from "../models/PuzzleEntry";
import { Sources } from "../models/PuzzleSource";

export function newPuzzle(): Puzzle {
    return {
        title: "",
        authors: [],
        copyright: "",
        date: new Date(),
        source: Sources.None,
    
        entries: new Map<string, PuzzleEntry>(),
    } as Puzzle;
}
