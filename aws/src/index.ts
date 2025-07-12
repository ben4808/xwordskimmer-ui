import { GeminiAiProvider } from './ai/gemini';
import { IAiProvider } from './ai/IAiProvider';
import { scrapePuzzles } from './crosswordScraper';
import { ILoaderDao } from './daos/ILoaderDao';
import LoaderDao from './daos/LoaderDao';
import { processPuzData } from './lib/puzFiles';
import { arrayToMap, generateId, mapValues } from './lib/utils';
import { ClueCollection } from './models/ClueCollection';
import { Entry } from './models/Entry';
import { ObscurityResult } from './models/ObscurityResult';
import { Puzzle } from './models/Puzzle';
import fs from 'fs';
import { QualityResult } from './models/QualityResult';

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
      console.log(`Processing puzzle for ${puzzle.publicationId}`);
      await dao.savePuzzle(puzzle);
      let clueCollection = puzzleToClueCollection(puzzle);
      await dao.saveClueCollection(clueCollection);
      await dao.addCluesToCollection(clueCollection.id, clueCollection.clues);

      console.log(`${puzzle.publicationId} clues saved: ${clueCollection.clues.length}`);

      let entries = clueCollection.clues.map(clue => clue.entry.get(clue.lang) as Entry);
      let entriesMap: Map<string, Entry> = arrayToMap(entries, entry => entry.entry);
      
      let originalLang = 'en';
      let translatedLang = "es";

      let translateResults = await aiProvider.getTranslateResultsAsync(clueCollection.clues, originalLang, translatedLang, mockData);
      await dao.addTranslateResults(translateResults);

      console.log(`${puzzle.publicationId} translations saved.`);

      let obscurityResults = await aiProvider.getObscurityResultsAsync(entries, translatedLang, mockData);
      populateEntryObscurityInfo(entriesMap, obscurityResults);
      let qualityResults = await aiProvider.getQualityResultsAsync(entries, translatedLang, mockData);
      populateEntryQualityInfo(entriesMap, qualityResults);

      await dao.addObscurityQualityResults(entries, aiProvider.sourceAI);

      console.log(`${puzzle.publicationId} scores saved.`);
  } catch (error) {
    console.error(`Error processing puzzle ${puzzle.publicationId}`, error);
  }
}

let puzzleToClueCollection = (puzzle: Puzzle): ClueCollection => {
  let lang = puzzle.lang || 'en';

  let clueCollection = {
    name:  puzzle.title,
    puzzleId:  puzzle.id,
    createdDate: new Date(),
    clues: mapValues(puzzle.entries).map(puzEntry => ({
      id: generateId(),
      entry: new Map<string, Entry>([[lang, {
        entry: puzEntry.entry,
        lang: lang,
        length: puzEntry.entry.length,
      }]]),
      lang: puzzle.lang || 'en',
      clue: puzEntry.clue,
      metadata1: puzEntry.index || '',
      source: "cw",
    })),
  } as ClueCollection;

  return clueCollection;
}

let populateEntryObscurityInfo = (entriesMap: Map<string, Entry>, obscurityResults: ObscurityResult[]) => {
  obscurityResults.forEach(result => {
    let entry = entriesMap.get(result.entry);
    if (entry) {
      entry.displayText = result.displayText;
      entry.entryType = result.entryType;
      entry.obscurityScore = result.obscurityScore;
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
  let puzzle = await processPuzData(new Blob([buffer], { type: 'application/octet-stream' }));
  puzzle!.publicationId = "NYT";
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
