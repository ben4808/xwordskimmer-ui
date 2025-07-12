import { sqlQuery } from "./postgres";
import { ILoaderDao } from "./ILoaderDao";
import { Clue } from "../models/Clue";
import { TranslateResult } from "../models/TranslateResult";
import { entryToAllCaps, generateId, zipArraysFlat } from "../lib/utils";
import { Entry } from "../models/Entry";

class LoaderDao implements ILoaderDao {
    savePuzzle = async (puzzle: any) => {
        puzzle.id = puzzle.id || generateId();

        await sqlQuery(true, "add_puzzle", [
            {name: "p_puzzle_id", value: puzzle.id},
            {name: "p_publication_id", value: puzzle.publicationId},
            {name: "p_date", value: puzzle.date},
            {name: "p_author", value: puzzle.authors.join(", ")},
            {name: "p_title", value: puzzle.title},
            {name: "p_copyright", value: puzzle.copyright},
            {name: "p_notes", value: puzzle.notes},
            {name: "p_width", value: puzzle.width},
            {name: "p_height", value: puzzle.height},
            {name: "p_source_link", value: puzzle.sourceLink},
        ]);
    }

    saveClueCollection = async (clueCollection: any) => {
        clueCollection.id = clueCollection.id || generateId();
        await sqlQuery(true, "add_clue_collection", [
            {name: "p_collection_id", value: clueCollection.id},
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
            clue.id = clue.id || generateId();
            return {
                clue_id: clue.id,
                order: order++,
                metadata1: clue.metadata1,
                entry: clue.entry.get(clue.lang)?.entry || "",
                lang: clue.lang,
                clue: clue.clue,
                response_template: clue.responseTemplate || null,
                source: clue.source || null,
            };
        });

        await sqlQuery(true, "add_clues_to_collection", [
            {name: "p_collection_id", value: collectionId},
            {name: "p_clues", value: cluesValue},
        ]);

        let entriesValue = clues.map(clue => {
            let entry = clue.entry.get(clue.lang)!;
            return {
                entry: entry.entry,
                lang: entry.lang,
                length: entry.length,
            };
        });

        await sqlQuery(true, "add_entries", [
            {name: "p_entries", value: entriesValue},
        ]);
    }

    addTranslateResults = async (
      translatedResults : TranslateResult[]
    ) => {
        let translationsValue = translatedResults.map(result => {
            return {
                clue_id: result.clueId,
                original_lang: result.originalLang,
                translated_lang: result.translatedLang,
                literal_translation: result.literalTranslation,
                natural_translation: result.naturalTranslation,
                natural_answers: result.naturalAnswers[0] === "(None)" ? [] :
                  zipArraysFlat(result.naturalAnswers.map(x => entryToAllCaps(x)), result.naturalAnswers).join(";"),
                colloquial_answers: result.colloquialAnswers[0] === "(None)" ? [] :
                  zipArraysFlat(result.colloquialAnswers.map(x => entryToAllCaps(x)), result.colloquialAnswers).join(";"),
                alternative_english_answers: result.alternativeEnglishAnswers[0] === "(None)" ? [] :
                  zipArraysFlat(result.alternativeEnglishAnswers.map(x => entryToAllCaps(x)), result.alternativeEnglishAnswers).join(";"),
                source_ai: result.sourceAI,
            };
        });

        await sqlQuery(true, "add_translate_results", [
            {name: "p_translate_results", value: translationsValue},
        ]);
    }

    addObscurityQualityResults = async (entries: Entry[], sourceAI: string) => {;
        let obscurityQualityValue = entries.map(entry => {
            return {
                entry: entry.entry,
                lang: entry.lang,
                display_text: entry.displayText,
                entry_type: entry.entryType,
                obscurity_score: entry.obscurityScore,
                quality_score: entry.qualityScore,
                source_ai: sourceAI,
            }; 
        });

        await sqlQuery(true, "add_obscurity_quality_scores", [
            {name: "p_scores", value: obscurityQualityValue},
        ]);
    }
}

export default LoaderDao;
