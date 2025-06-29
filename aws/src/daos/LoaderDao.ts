import { sqlQuery } from "./postgres";
import { ILoaderDao } from "./ILoaderDao";
import { Clue } from "../models/Clue";
import { TranslateResult } from "../models/TranslateResult";
import { ObscurityResult } from "../models/ObscurityResult";
import { QualityResult } from "../models/QualityResult";


class LoaderDao implements ILoaderDao {
    savePuzzle = async (puzzle: any) => {
        await sqlQuery(true, "SavePuzzle", [
            {name: "p_puzzleId", value: puzzle.id},
            {name: "p_publicationId", value: puzzle.publicationId},
            {name: "p_date", value: puzzle.date},
            {name: "p_author", value: puzzle.authors.join(", ")},
            {name: "p_title", value: puzzle.title},
            {name: "p_copyright", value: puzzle.copyright},
            {name: "p_notes", value: puzzle.notes},
            {name: "p_width", value: puzzle.width},
            {name: "p_height", value: puzzle.height},
            {name: "p_sourceLink", value: puzzle.sourceLink},
            {name: "p_puzData", value: puzzle.puzData},
        ]);
    }

    saveClueCollection = async (clueCollection: any) => {
        await sqlQuery(true, "SaveClueCollection", [
            {name: "p_CollectionId", value: clueCollection.id},
            {name: "p_PuzzleId", value: clueCollection.puzzleId},
            {name: "p_Title", value: clueCollection.name},
            {name: "p_AuthorID", value: clueCollection.authorId},
            {name: "p_Description", value: clueCollection.description},
            {name: "p_CreatedDate", value: clueCollection.createdDate},
            {name: "p_Metadata1", value: clueCollection.metadata1},
            {name: "p_Metadata2", value: clueCollection.metadata2},
        ]);
    }

    saveClues = async (collectionId: string, clues: Clue[]) => {
        let order = 1;

        let cluesValue = clues.map(clue => {
            return {
                clueId: clue.id,
                order: order++,
                metadata1: clue.metadata1,
                entry: clue.entry,
                lang: clue.lang,
                clue: clue.clue,
                response_template: clue.responseTemplate || null,
                source: clue.source || null,
            };
        });

        await sqlQuery(true, "AddCluesToCollection", [
            {name: "p_CollectionId", value: collectionId},
            {name: "p_Clues", value: JSON.stringify(cluesValue)},
        ]);
    }

    saveAIData = async (
      translatedResults : TranslateResult[],
      obscurityResults: ObscurityResult[], 
      qualityResults: QualityResult[]
    ) => {;
        let order = 1;

        let cluesValue = clues.map(clue => {
            return {
                clueId: clue.id,
                order: order++,
                metadata1: clue.metadata1,
                entry: clue.entry,
                lang: clue.lang,
                clue: clue.clue,
                response_template: clue.responseTemplate || null,
                source: clue.source || null,
            };
        });

        await sqlQuery(true, "load_data_source_table", [
            {name: "p_CollectionId", value: collectionId},
            {name: "p_Clues", value: JSON.stringify(cluesValue)},
        ]);
    }
}

export default LoaderDao;
