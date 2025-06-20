import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Puzzle } from "../models/Puzzle";

export interface ILoaderDao {
    savePuzzle: (puzzle: Puzzle) => Promise<void>;
    saveClueCollection: (clueCollection: ClueCollection) => Promise<void>;
    saveClues: (clues: Clue[]) => Promise<void>;
}
