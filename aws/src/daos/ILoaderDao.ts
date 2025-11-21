import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { Puzzle } from "../models/Puzzle";
import { TranslateResult } from "../models/TranslateResult";

export interface ILoaderDao {
    savePuzzle: (puzzle: Puzzle) => Promise<void>;
    saveClueCollection: (clueCollection: ClueCollection) => Promise<void>;
    addCluesToCollection: (collectionId: string, clues: Clue[]) => Promise<void>;
    addTranslateResults: (translatedResults: TranslateResult[]) => Promise<void>;
    addObscurityQualityResults: (entries: Entry[], sourceAI: string) => Promise<void>;
}
