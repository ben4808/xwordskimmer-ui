import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { ObscurityResult } from "../models/ObscurityResult";
import { Puzzle } from "../models/Puzzle";
import { QualityResult } from "../models/QualityResult";
import { TranslateResult } from "../models/TranslateResult";

export interface ILoaderDao {
    savePuzzle: (puzzle: Puzzle) => Promise<void>;
    saveClueCollection: (clueCollection: ClueCollection) => Promise<void>;

    saveClues: (collectionId: string, clues: Clue[]) => Promise<void>;
    saveAIData: (translatedResults : TranslateResult[],
      obscurityResults: ObscurityResult[], qualityResults: QualityResult[]
    ) => Promise<void>;
}
