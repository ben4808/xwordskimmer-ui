import { scrapePuzzles } from './crosswordScraper';
import { ILoaderDao } from './daos/ILoaderDao';
import LoaderDao from './daos/LoaderDao';
import { getTranslationsFromGemini } from './gemini';
import { mapValues } from './lib/utils';
import { ClueCollection } from './models/ClueCollection';
import { Puzzle } from './models/Puzzle';


let runCrosswordLoadingTasks = async () => {
  let scrapedPuzzles = [] as Puzzle[];
  let dao: ILoaderDao = new LoaderDao();

  console.log("Starting crossword loading tasks...");
  try {
    scrapedPuzzles = await scrapePuzzles();
    
    for (let puzzle of scrapedPuzzles) {
      await dao.savePuzzle(puzzle);

      let geminiResults = await getTranslationsFromGemini(puzzle.entries);
    }
  } catch (error) {
    console.error("Error in crossword loading tasks: ", error);
  }
};

let puzzleToClueCollection = (puzzle: Puzzle): ClueCollection => {
  let clueCollection = {
    id: 0,
    name:  puzzle.title,
    puzzleId:  puzzle.id,
    createdDate: new Date(),
    clues: mapValues(puzzle.entries).map(puzEntry => ({
      entry: puzEntry.entry,
      lang: puzzle.lang || 'en',
      clue: puzEntry.clue,
      translatedClues: new Map<string, string>(),
      translatedEntries: new Map<string, string[]>(),
    })),
  } as ClueCollection;

  return clueCollection;
}
