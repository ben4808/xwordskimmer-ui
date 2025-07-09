import { sqlQuery } from "./postgres";
import { ILoaderDao } from "./ILoaderDao";
import { Clue } from "../models/Clue";
import { TranslateResult } from "../models/TranslateResult";
import { ObscurityResult } from "../models/ObscurityResult";
import { QualityResult } from "../models/QualityResult";
import { entryToAllCaps, generateId, zipArraysFlat } from "../lib/utils";
import { Entry } from "../models/Entry";


class LoaderDao implements ILoaderDao {
    savePuzzle = async (puzzle: any) => {
        await sqlQuery(true, "add_puzzle", [
            {name: "p_puzzle_id", value: puzzle.id || generateId()},
            {name: "p_publication_id", value: puzzle.publicationId},
            {name: "p_date", value: puzzle.date},
            {name: "p_author", value: puzzle.authors.join(", ")},
            {name: "p_title", value: puzzle.title},
            {name: "p_copyright", value: puzzle.copyright},
            {name: "p_notes", value: puzzle.notes},
            {name: "p_width", value: puzzle.width},
            {name: "p_height", value: puzzle.height},
            {name: "p_source_link", value: puzzle.sourceLink},
            {name: "p_puz_data", value: puzzle.puzData},
        ]);
    }

    saveClueCollection = async (clueCollection: any) => {
        await sqlQuery(true, "add_clue_collection", [
            {name: "p_collection_id", value: clueCollection.id || generateId()},
            {name: "p_puzzle_id", value: clueCollection.puzzleId},
            {name: "p_title", value: clueCollection.name},
            {name: "p_author_id", value: clueCollection.authorId},
            {name: "p_description", value: clueCollection.description},
            {name: "p_created_date", value: clueCollection.createdDate},
            {name: "p_metadata1", value: clueCollection.metadata1},
            {name: "p_metadata2", value: clueCollection.metadata2},
        ]);
    }

    addCluesToCollection = async (collectionId: string, clues: Clue[]) => {
        let order = 1;

        let cluesValue = clues.map(clue => {
            return {
                clue_id: clue.id || generateId(),
                order: order++,
                metadata1: clue.metadata1,
                entry: clue.entry,
                lang: clue.lang,
                clue: clue.clue,
                response_template: clue.responseTemplate || null,
                source: clue.source || null,
            };
        });

        await sqlQuery(true, "add_clues_to_collection", [
            {name: "p_collection_id", value: collectionId},
            {name: "p_clues", value: JSON.stringify(cluesValue)},
        ]);

        let entriesValue = clues.map(clue => {
            let entry = clue.entry.get(clue.lang)!;
            return {
                entry: entry.entry,
                lang: entry.lang,
            };
        });

        await sqlQuery(true, "add_entries", [
            {name: "p_entries", value: JSON.stringify(entriesValue)},
        ]);
    }

    addTranslateResults = async (
      translatedResults : TranslateResult[]
    ) => {
        let translationsValue = translatedResults.map(result => {
            return {
                translated_clue_id: result.translatedClueId || generateId(),
                clueId: result.clueId,
                lang: result.lang,
                literal_translation: result.literalTranslation,
                natural_translation: result.naturalTranslation,
                natural_answers: zipArraysFlat(result.naturalAnswers.map(x => entryToAllCaps(x)), result.naturalAnswers).join(";"),
                colloquial_answers: zipArraysFlat(result.colloquialAnswers.map(x => entryToAllCaps(x)), result.colloquialAnswers).join(";"),
                source_ai: result.sourceAI,
            };
        });

        await sqlQuery(true, "add_translate_results", [
            {name: "p_translate_results", value: JSON.stringify(translationsValue)},
        ]);
    }

    addObscurityQualityResults = async (
      obscurityResults: ObscurityResult[], 
      qualityResults: QualityResult[]
    ) => {;
        let obscurityQualityValue = obscurityResults.map(result => {
            return {
                entry: result.entry,
                lang: result.lang,
                display_text: result.displayText,
                entry_type: result.entryType,
                obscurity_score: result.obscurityScore,
                quality_score: qualityResults.find(q => q.entry === result.entry && q.lang === result.lang)?.qualityScore || 0,
                source_ai: result.sourceAI,
            };
        });

        let returnedEntries = await sqlQuery(true, "add_obscurity_quality_scores", [
            {name: "p_scores", value: JSON.stringify(obscurityQualityValue)},
        ]);

        return returnedEntries.map(row => ({
            entry: row.entry,
            lang: row.lang,
            displayText: row.display_text,
            entryType: row.entry_type,
            obscurityScore: row.obscurity_score,
            qualityScore: row.quality_score,
        }) as Entry);
    }
}

export default LoaderDao;
