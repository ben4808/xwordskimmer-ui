import { GeminiAiProvider } from './ai/gemini';
import { IAiProvider } from './ai/IAiProvider';
import { scrapePuzzles } from './crosswordScraper';
import { ILoaderDao } from './daos/ILoaderDao';
import LoaderDao from './daos/LoaderDao';
import { processPuzData } from './lib/puzFiles';
import { generateId, mapValues } from './lib/utils';
import { ClueCollection } from './models/ClueCollection';
import { Entry } from './models/Entry';
import { Puzzle } from './models/Puzzle';
import fs from 'fs';

let runCrosswordLoadingTasks = async () => {
  let scrapedPuzzles = [] as Puzzle[];
  let dao: ILoaderDao = new LoaderDao();
  let aiProvider: IAiProvider = new GeminiAiProvider();

  console.log("Starting crossword loading tasks...");
  try {
    //scrapedPuzzles = await scrapePuzzles();

    scrapedPuzzles = await getSamplePuzzles();
    
    for (let puzzle of scrapedPuzzles) {
      //await dao.savePuzzle(puzzle);
      let clueCollection = puzzleToClueCollection(puzzle);
      //await dao.saveClueCollection(clueCollection);
      //await dao.addCluesToCollection(clueCollection.id, clueCollection.clues);

      let entries = clueCollection.clues.map(clue => clue.entry.get(clue.lang) as Entry);
      let originalLang = 'en';
      let translatedLang = "es";

      //let translateResults = await aiProvider.getTranslateResultsAsync(clueCollection.clues, originalLang, translatedLang);
      //await dao.addTranslateResults(translateResults);

      let obscurityResults = await aiProvider.getObscurityResultsAsync(entries, translatedLang);
      //let qualityResults = await aiProvider.getQualityResultsAsync(entries, translatedLang);
      //await dao.addObscurityQualityResults(obscurityResults, qualityResults);
    }
  } catch (error) {
    console.error("Error in crossword loading tasks: ", error);
  }
};

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

let getSamplePuzzles = async (): Promise<Puzzle[]> => {
  let buffer = await loadSamplePuzAsync();
  let puzzle = await processPuzData(new Blob([buffer], { type: 'application/octet-stream' }));
  return [puzzle!];
}

async function loadSamplePuzAsync(): Promise<Buffer> {
  try {
    const content: Buffer = await fs.promises.readFile('./NYT-2025-07-10.puz');
    return content;
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

runCrosswordLoadingTasks()
  .then(() => console.log("Crossword loading tasks completed successfully."))
  .catch(error => console.error("Error in crossword loading tasks: ", error));
