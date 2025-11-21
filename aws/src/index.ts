import { GeminiAiProvider } from './ai/gemini';
import { IAiProvider } from './ai/IAiProvider';
import { scrapePuzzles } from './crosswordScraper';
import { ILoaderDao } from './daos/ILoaderDao';
import LoaderDao from './daos/LoaderDao';
import { processPuzData } from './lib/puzFiles';
import { arrayToMap, generateId, mapValues } from './lib/utils';
import { Clue } from './models/Clue';
import { ClueCollection } from './models/ClueCollection';
import { Entry } from './models/Entry';
import { ObscurityResult } from './models/ObscurityResult';
import { Puzzle } from './models/Puzzle';
import { QualityResult } from './models/QualityResult';
import fs from 'fs';

let dao: ILoaderDao = new LoaderDao();
let aiProvider: IAiProvider = new GeminiAiProvider();
let mockData = false; // Set to true to use mock data for testing

let runCrosswordLoadingTasks = async () => {
  let scrapedPuzzles = [] as Puzzle[];

  console.log("Starting crossword loading tasks...");
  try {
    if (mockData)
      scrapedPuzzles = await getSamplePuzzles();
    else
      scrapedPuzzles = await scrapePuzzles();
    
    await Promise.all(scrapedPuzzles.map(async (puzzle) => {
      await processPuzzle(puzzle);
    }));

  } catch (error) {
    console.error("Error in crossword loading tasks: ", error);
  }
};

let processPuzzle = async (puzzle: Puzzle): Promise<void> => {
  try {
      console.log(`Processing puzzle for ${puzzle.publication}`);
      await dao.savePuzzle(puzzle);
      let clueCollection = puzzleToClueCollection(puzzle);
      await dao.saveClueCollection(clueCollection);
      await dao.addCluesToCollection(clueCollection.id!, clueCollection.clues!);

      console.log(`${puzzle.publication} clues saved: ${clueCollection.clues!.length}`);

      let entries = clueCollection.clues!.map(clue => clue.entry!);
      let entriesMap: Map<string, Entry> = arrayToMap(entries, entry => entry.entry);

      let originalLang = 'en';
      let translatedLang = "es";

      let translateResults = await aiProvider.getTranslateResultsAsync(clueCollection.clues!, originalLang, translatedLang, mockData);
      await dao.addTranslateResults(translateResults);

      console.log(`${puzzle.publication} translations saved.`);

      let obscurityResults = await aiProvider.getObscurityResultsAsync(entries, translatedLang, mockData);
      populateEntryObscurityInfo(entriesMap, obscurityResults);
      let qualityResults = await aiProvider.getQualityResultsAsync(entries, translatedLang, mockData);
      populateEntryQualityInfo(entriesMap, qualityResults);

      await dao.addObscurityQualityResults(entries, aiProvider.sourceAI);

      console.log(`${puzzle.publication} scores saved.`);
  } catch (error) {
    console.error(`Error processing puzzle ${puzzle.publication}`, error);
  }
}

let puzzleToClueCollection = (puzzle: Puzzle): ClueCollection => {
  let lang = puzzle.lang || 'en';

  let clues: Clue[] = mapValues(puzzle.entries).map(puzEntry => ({
    id: generateId(),
    entry: {
      entry: puzEntry.entry,
      lang: lang,
    },
    customClue: puzEntry.clue,
    source: "cw",
  }));

  let clueCollection: ClueCollection = {
    puzzle: puzzle,
    title: puzzle.title,
    lang: lang,
    createdDate: new Date(),
    modifiedDate: new Date(),
    source: puzzle.publication || "unknown",
    isCrosswordCollection: true,
    isPrivate: false,
    clueCount: clues.length,
    clues: clues,
  };

  return clueCollection;
}

let populateEntryObscurityInfo = (entriesMap: Map<string, Entry>, obscurityResults: ObscurityResult[]) => {
  obscurityResults.forEach(result => {
    let entry = entriesMap.get(result.entry);
    if (entry) {
      entry.displayText = result.displayText;
      entry.entryType = result.entryType;
      entry.familiarityScore = result.obscurityScore;
    } else {
      console.warn(`Entry not found for obscurity result: ${result.entry}`);
    }
  });
}

let populateEntryQualityInfo = (entriesMap: Map<string, Entry>, qualityResults: QualityResult[]) => {
  qualityResults.forEach(result => {
    let entry = entriesMap.get(result.entry);
    if (entry) {
      entry.qualityScore = result.qualityScore;
    } else {
      console.warn(`Entry not found for obscurity result: ${result.entry}`);
    }
  });
}

let getSamplePuzzles = async (): Promise<Puzzle[]> => {
  let buffer = await loadSamplePuzAsync();
  let puzzle = await processPuzData(new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' }));
  puzzle!.publication = "NYT";
  puzzle!.lang = "en";
  return [puzzle!];
}

async function loadSamplePuzAsync(): Promise<Buffer> {
  try {
    const content: Buffer = await fs.promises.readFile('./NYT-2025-07-12.puz');
    return content;
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

runCrosswordLoadingTasks()
  .then(() => console.log("Crossword loading tasks completed successfully."))
  .catch(error => console.error("Error in crossword loading tasks: ", error));
